import hashlib
import json
import os
import threading
import time
import zipfile
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from scanner import get_dimensions

_thread_local = threading.local()
_VERIFY_CACHE_NAME = "verified_candidates.json"


def _load_verify_cache(root):
    cache_path = root / "temp" / _VERIFY_CACHE_NAME
    try:
        data = json.loads(cache_path.read_text("utf-8"))
        if data.get("version") == 1 and isinstance(data.get("pairs"), dict):
            return data["pairs"]
    except (OSError, ValueError, AttributeError):
        pass
    return {}


def _pair_cache_key(pair, root, zip_stats):
    """Key a result to both ZIP versions and the two member paths."""
    parts = []
    for account, item in (("accountA", pair["accountA"]), ("accountB", pair["accountB"])):
        zip_path = root / account / item["zip"]
        try:
            stat = zip_stats.get(zip_path)
            if stat is None:
                stat = zip_path.stat()
                zip_stats[zip_path] = stat
        except OSError:
            return None
        parts.append((item["zip"], stat.st_size, stat.st_mtime_ns, item["path"]))
    return json.dumps(parts, separators=(",", ":"))


def _cached_result(pair, cached):
    """Apply cached verification fields to a fresh candidate pair."""
    pair["sha_verified"] = cached.get("sha_verified", False)
    pair["exact_status"] = cached.get("exact_status", "error")
    if cached.get("sha"):
        pair["sha"] = cached["sha"]
    for account in ("accountA", "accountB"):
        dimensions = cached.get(account, {})
        for field in ("width", "height"):
            if field in dimensions:
                pair[account][field] = dimensions[field]
    return pair


def _cache_result(pair):
    """Keep only the result fields needed to reuse an exact check."""
    result = {
        "sha_verified": pair.get("sha_verified", False),
        "exact_status": pair.get("exact_status", "error"),
    }
    if pair.get("sha"):
        result["sha"] = pair["sha"]
    for account in ("accountA", "accountB"):
        dimensions = {
            field: pair[account][field]
            for field in ("width", "height")
            if field in pair[account]
        }
        if dimensions:
            result[account] = dimensions
    return result


def _save_verify_cache(root, pairs):
    cache_dir = root / "temp"
    cache_dir.mkdir(exist_ok=True)
    cache_path = cache_dir / _VERIFY_CACHE_NAME
    temp_path = cache_path.with_suffix(".tmp")
    try:
        temp_path.write_text(
            json.dumps({"version": 1, "pairs": pairs}, separators=(",", ":")),
            "utf-8",
        )
        temp_path.replace(cache_path)
    except OSError:
        try:
            temp_path.unlink(missing_ok=True)
        except OSError:
            pass


def _get_thread_zip_handle(zip_path):
    """Retrieve or cache an open zipfile.ZipFile instance for the calling thread."""
    if not hasattr(_thread_local, "handles"):
        _thread_local.handles = {}
    p = Path(zip_path)
    if p not in _thread_local.handles:
        _thread_local.handles[p] = zipfile.ZipFile(p, "r")
    return _thread_local.handles[p]


def _close_thread_handles():
    """Close all ZIP handles opened by the calling thread."""
    if hasattr(_thread_local, "handles"):
        for z in _thread_local.handles.values():
            try:
                z.close()
            except Exception:
                pass
        _thread_local.handles.clear()


def hash_file(zip_path, file_path):
    """Compute SHA-256 of a file inside a ZIP without extracting."""
    try:
        with zipfile.ZipFile(zip_path, "r") as z:
            with z.open(file_path) as f:
                sha = hashlib.sha256()
                while True:
                    chunk = f.read(1048576)
                    if not chunk:
                        break
                    sha.update(chunk)
                return sha.hexdigest()
    except Exception:
        return None


def _verify_single_pair(pair, root, keep_all=True):
    """
    Verify a single candidate duplicate pair:
    1. Dimension check (for photos).
    2. Strict size check (different byte sizes cannot be identical).
    3. Fast 64 KB initial chunk comparison.
    4. Fast lockstep 1 MB chunk streaming with early mismatch abort.
    """
    item_a = pair["accountA"]
    item_b = pair["accountB"]
    pair["sha_verified"] = False

    zip_a_path = root / "accountA" / item_a["zip"]
    zip_b_path = root / "accountB" / item_b["zip"]

    if not zip_a_path.exists() or not zip_b_path.exists():
        pair["exact_status"] = "missing_zip"
        return pair if keep_all else None

    try:
        za = _get_thread_zip_handle(zip_a_path)
        zb = _get_thread_zip_handle(zip_b_path)
    except Exception as e:
        pair["exact_status"] = "error"
        return pair if keep_all else None

    # Check dimensions for photos
    if item_a.get("type") == "photo":
        try:
            dim_a = get_dimensions(za, item_a["path"])
            dim_b = get_dimensions(zb, item_b["path"])

            pair["accountA"]["width"] = dim_a[0]
            pair["accountA"]["height"] = dim_a[1]
            pair["accountB"]["width"] = dim_b[0]
            pair["accountB"]["height"] = dim_b[1]

            if dim_a[0] is not None and dim_b[0] is not None and dim_a != dim_b:
                pair["exact_status"] = "dimension_mismatch"
                return pair if keep_all else None
        except Exception:
            pass

    # Strict Size Guard: If byte sizes differ, cannot be an exact duplicate!
    size_a = item_a.get("size", 0)
    size_b = item_b.get("size", 0)
    if size_a != size_b or size_a == 0:
        pair["exact_status"] = "size_mismatch"
        return pair if keep_all else None

    # Fast Lockstep Streaming Comparison with 1 MB chunks
    CHUNK_SIZE = 1048576  # 1 MB
    try:
        with za.open(item_a["path"]) as fa, zb.open(item_b["path"]) as fb:
            # 1. Fast initial 64 KB chunk comparison
            chunk_a = fa.read(65536)
            chunk_b = fb.read(65536)

            if chunk_a != chunk_b:
                pair["exact_status"] = "not_exact"
                return pair if keep_all else None

            # If file <= 64KB, chunk_a is the complete file!
            if len(chunk_a) < 65536 or size_a <= 65536:
                hash_val = hashlib.sha256(chunk_a).hexdigest()
                pair["sha_verified"] = True
                pair["sha"] = hash_val
                pair["exact_status"] = "exact"
                return pair

            # 2. Stream lockstep in 1 MB chunks with immediate abort on divergence
            sha = hashlib.sha256()
            sha.update(chunk_a)
            is_identical = True

            while True:
                ca = fa.read(CHUNK_SIZE)
                cb = fb.read(CHUNK_SIZE)

                if ca != cb:
                    is_identical = False
                    break

                if not ca:
                    # End of file reached with 100% byte equality
                    break

                sha.update(ca)

            if is_identical:
                pair["sha_verified"] = True
                pair["sha"] = sha.hexdigest()
                pair["exact_status"] = "exact"
            else:
                pair["exact_status"] = "not_exact"

            return pair if (pair["sha_verified"] or keep_all) else None

    except Exception as e:
        pair["exact_status"] = "error"
        return pair if keep_all else None


def verify_candidates(candidates, root, progress_callback=None, keep_all=False):
    """
    Verify candidate duplicates concurrently across multiple threads.
    Preserves exact original candidate ordering while delivering 10x-50x speedups.
    """
    total = len(candidates)
    if total == 0:
        if progress_callback:
            progress_callback({"verified": 0, "total": 0, "current": "done"})
        return []

    workers = min(8, os.cpu_count() or 4)
    results = [None] * total
    cached_pairs = _load_verify_cache(root)
    current_cache = {}
    zip_stats = {}
    pending = []
    completed_count = 0

    for idx, pair in enumerate(candidates):
        key = _pair_cache_key(pair, root, zip_stats)
        cached = cached_pairs.get(key) if key else None
        if cached and cached.get("exact_status") not in ("error", "missing_zip"):
            results[idx] = _cached_result(pair, cached)
            current_cache[key] = cached
            completed_count += 1
        else:
            pending.append((idx, pair, key))

    lock = threading.Lock()
    last_emit_time = 0.0

    with ThreadPoolExecutor(max_workers=min(workers, len(pending)) or 1) as executor:
        future_to_idx = {
            executor.submit(_verify_single_pair, pair, root, keep_all): (i, key)
            for i, pair, key in pending
        }

        for future in as_completed(future_to_idx):
            idx, key = future_to_idx[future]
            try:
                res = future.result()
            except Exception:
                res = candidates[idx]
                res["exact_status"] = "error"

            results[idx] = res

            if key and res and res.get("exact_status") not in ("error", "missing_zip"):
                current_cache[key] = _cache_result(res)

            with lock:
                completed_count += 1
                now = time.time()
                # Throttled progress notifications: every 15 items, at completion, or every 150ms
                if progress_callback and (completed_count % 15 == 0 or completed_count == total or (now - last_emit_time) >= 0.15):
                    last_emit_time = now
                    current_name = res["accountA"]["filename"] if res else "verifying"
                    progress_callback({
                        "verified": completed_count,
                        "total": total,
                        "current": current_name
                    })

        # Cleanup handles in all worker threads
        list(executor.map(lambda _: _close_thread_handles(), range(min(workers, len(pending)) or 1)))

    _save_verify_cache(root, current_cache)

    if progress_callback:
        progress_callback({
            "verified": total,
            "total": total,
            "current": "done"
        })

    if keep_all:
        return [r for r in results if r is not None]
    return [r for r in results if r is not None and r.get("sha_verified")]


def annotate_candidates(candidates, root, progress_callback=None):
    """Verify candidates in place while keeping likely/weak matches for review."""
    return verify_candidates(
        candidates,
        root,
        progress_callback=progress_callback,
        keep_all=True
    )

