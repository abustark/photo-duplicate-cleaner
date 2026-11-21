import io
import json
import mimetypes
import os
import threading
import webbrowser
import zipfile
from pathlib import Path
from queue import Queue

from flask import (
    Flask, Response, jsonify, render_template,
    request, send_file
)

from scanner import analyze
from comparer import find_possible_duplicates
from cache import is_cache_valid, save_cache, get_zip_fingerprint
from report import export_csv
from deleter import extract_marked_files, get_summary, EXTRACT_DIR
from history import load_history, save_history_entry
from hasher import annotate_candidates

app = Flask(__name__)

# ─── Shared State ───────────────────────────────────────────

ROOT = Path(__file__).parent
SESSION_FILE = ROOT / "active_session.json"

scan_state = {
    "running": False,
    "stage": "idle",
    "progress": {},
    "candidates": [],
    "stats_a": {},
    "stats_b": {},
    "decisions": {}
}

progress_queue = Queue()


# ─── Pages ──────────────────────────────────────────────────

@app.route("/")
def home():
    return render_template("index.html")


@app.route("/sources")
def sources():
    """Return a lightweight summary of the configured Takeout ZIP folders."""
    accounts = {}
    for key, folder_name in (("A", "accountA"), ("B", "accountB")):
        folder = ROOT / folder_name
        archives = list(folder.glob("*.zip")) if folder.exists() else []
        accounts[key] = {
            "folder": folder_name,
            "zip_count": len(archives),
            "archive_bytes": sum(archive.stat().st_size for archive in archives),
        }
    return jsonify({"status": "ok", "accounts": accounts})


# ─── SSE Progress Stream ───────────────────────────────────

@app.route("/progress")
def progress():
    """Server-Sent Events endpoint for real-time scan progress."""

    def stream():
        while True:
            msg = progress_queue.get()
            yield f"data: {json.dumps(msg)}\n\n"
            if msg.get("stage") == "done" or msg.get("stage") == "error":
                break

    return Response(
        stream(),
        mimetype="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no"
        }
    )


# ─── Scan Pipeline ─────────────────────────────────────────

def emit(data):
    """Push progress update to SSE queue."""
    progress_queue.put(data)


def run_scan():
    """Full scan pipeline: scan → compare → done."""

    try:

        scan_state["running"] = True
        scan_state["decisions"] = {}

        # ── Stage 1: Scan Account A ────────────────────

        emit({"stage": "scanning", "account": "A", "zip_num": 0, "zip_total": 0, "photos": 0, "videos": 0})

        folder_a = ROOT / "accountA"
        valid_a, cached_a = is_cache_valid("accountA", folder_a)

        if valid_a:
            result_a = cached_a
            emit({
                "stage": "scanning", "account": "A",
                "zip_num": result_a["zips"], "zip_total": result_a["zips"],
                "photos": result_a["photos"], "videos": result_a["videos"],
                "cached": True
            })
        else:
            def progress_a(info):
                emit({
                    "stage": "scanning", "account": "A",
                    "zip": info["zip"],
                    "zip_num": info["zip_num"],
                    "zip_total": info["zip_total"],
                    "photos": info["photos"],
                    "videos": info["videos"]
                })

            result_a = analyze(folder_a, progress_callback=progress_a)
            fp_a = get_zip_fingerprint(folder_a)
            save_cache("accountA", result_a, fp_a)

        scan_state["stats_a"] = {
            "zips": result_a["zips"],
            "photos": result_a["photos"],
            "videos": result_a["videos"]
        }

        # ── Stage 2: Scan Account B ────────────────────

        emit({"stage": "scanning", "account": "B", "zip_num": 0, "zip_total": 0, "photos": 0, "videos": 0})

        folder_b = ROOT / "accountB"
        valid_b, cached_b = is_cache_valid("accountB", folder_b)

        if valid_b:
            result_b = cached_b
            emit({
                "stage": "scanning", "account": "B",
                "zip_num": result_b["zips"], "zip_total": result_b["zips"],
                "photos": result_b["photos"], "videos": result_b["videos"],
                "cached": True
            })
        else:
            def progress_b(info):
                emit({
                    "stage": "scanning", "account": "B",
                    "zip": info["zip"],
                    "zip_num": info["zip_num"],
                    "zip_total": info["zip_total"],
                    "photos": info["photos"],
                    "videos": info["videos"]
                })

            result_b = analyze(folder_b, progress_callback=progress_b)
            fp_b = get_zip_fingerprint(folder_b)
            save_cache("accountB", result_b, fp_b)

        scan_state["stats_b"] = {
            "zips": result_b["zips"],
            "photos": result_b["photos"],
            "videos": result_b["videos"]
        }

        # ── Stage 3: Compare ──────────────────────────

        emit({"stage": "comparing"})

        candidates = find_possible_duplicates(result_a, result_b)

        emit({"stage": "verifying", "verified": 0, "total": len(candidates)})

        def progress_verify(info):
            emit({
                "stage": "verifying",
                "verified": info["verified"],
                "total": info["total"],
                "current": info["current"]
            })

        candidates = annotate_candidates(
            candidates,
            ROOT,
            progress_callback=progress_verify
        )
        scan_state["candidates"] = candidates

        strong = sum(1 for c in candidates if c["match_type"] == "strong")
        likely = sum(1 for c in candidates if c["match_type"] == "likely")
        weak = sum(1 for c in candidates if c["match_type"] == "weak")
        exact = sum(1 for c in candidates if c.get("sha_verified"))

        # ── Done (no SHA filter — user sees all candidates) ─

        emit({
            "stage": "done",
            "total_candidates": len(candidates),
            "strong": strong,
            "likely": likely,
            "weak": weak,
            "exact": exact,
            "stats_a": scan_state["stats_a"],
            "stats_b": scan_state["stats_b"]
        })

    except Exception as e:

        emit({"stage": "error", "message": str(e)})

    finally:

        scan_state["running"] = False


@app.route("/scan")
def scan():
    """Start scan in background thread."""

    if scan_state["running"]:
        return jsonify({"status": "already_running"})

    # Clear queue
    while not progress_queue.empty():
        progress_queue.get_nowait()

    thread = threading.Thread(target=run_scan, daemon=True)
    thread.start()

    return jsonify({"status": "started"})


# ─── Duplicates API ────────────────────────────────────────

@app.route("/duplicates")
def duplicates():
    """Return paginated candidates and loaded decisions."""

    page = int(request.args.get("page", 0))
    per_page = int(request.args.get("per_page", 20))
    filter_type = request.args.get("filter", "all")

    items = scan_state["candidates"]

    # Optional filter
    if filter_type == "strong":
        items = [c for c in items if c["match_type"] == "strong"]
    elif filter_type == "likely":
        items = [c for c in items if c["match_type"] == "likely"]
    elif filter_type == "strong_likely":
        items = [c for c in items if c["match_type"] in ("strong", "likely")]

    total = len(items)
    start = page * per_page
    end = start + per_page

    # Auto-load decisions on initial fetch
    if page == 0 and not scan_state["decisions"]:
        if SESSION_FILE.exists():
            try:
                saved = json.loads(SESSION_FILE.read_text("utf-8"))
                for idx, candidate in enumerate(scan_state["candidates"]):
                    pair_id = f"{candidate['accountA']['path']}::{candidate['accountB']['path']}"
                    if pair_id in saved:
                        scan_state["decisions"][str(idx)] = saved[pair_id]
            except Exception as e:
                print(f"Error loading session: {e}")

    return jsonify({
        "total": total,
        "page": page,
        "per_page": per_page,
        "items": items[start:end],
        "decisions": scan_state["decisions"]
    })


# ─── Image / Video Streaming ──────────────────────────────

@app.route("/media/<account>/<zip_name>/<path:file_path>")
def serve_media(account, zip_name, file_path):
    """Stream a photo or video from inside a ZIP file."""

    if account == "A":
        zip_full = ROOT / "accountA" / zip_name
    elif account == "B":
        zip_full = ROOT / "accountB" / zip_name
    else:
        return "Invalid account", 400

    if not zip_full.exists():
        return "ZIP not found", 404

    try:

        with zipfile.ZipFile(zip_full, "r") as z:

            with z.open(file_path) as f:
                data = f.read()

        mime = mimetypes.guess_type(file_path)[0] or "application/octet-stream"

        return Response(data, mimetype=mime)

    except Exception as e:

        return f"Error: {e}", 500


# ─── Review Decisions ──────────────────────────────────────

@app.route("/review", methods=["POST"])
def review():
    """Save user decision for a duplicate pair."""

    body = request.get_json()
    index = str(body.get("index"))
    decision = body.get("decision")  # "keep", "delete", "skip", or None to clear

    if decision is None:
        scan_state["decisions"].pop(index, None)
    else:
        scan_state["decisions"][index] = decision

    # Autosave
    try:
        persistent = {}
        for idx, dec in scan_state["decisions"].items():
            candidate = scan_state["candidates"][int(idx)]
            pair_id = f"{candidate['accountA']['path']}::{candidate['accountB']['path']}"
            persistent[pair_id] = dec
        SESSION_FILE.write_text(json.dumps(persistent, indent=2), "utf-8")
    except Exception as e:
        print(f"Failed to autosave session: {e}")

    return jsonify({
        "status": "ok",
        "reviewed": len(scan_state["decisions"]),
        "total": len(scan_state["candidates"])
    })


# ─── Summary ──────────────────────────────────────────────

@app.route("/summary")
def summary():
    """Get summary of user decisions."""

    result = get_summary(
        scan_state["candidates"],
        scan_state["decisions"]
    )

    return jsonify(result)


@app.route("/finalize_preview")
def finalize_preview():
    """Return the sorted list of files currently marked for extraction."""

    final_list = []
    for i, candidate in enumerate(scan_state["candidates"]):
        item = candidate.copy()
        item["decision"] = scan_state["decisions"].get(str(i), "unreviewed")
        item["index"] = i
        final_list.append(item)

    final_list.sort(key=lambda x: x["accountA"].get("size", 0), reverse=True)
    delete_items = [item for item in final_list if item["decision"] == "delete"]

    return jsonify({
        "status": "ok",
        "items": [
            {
                "item": idx + 1,
                "index": item["index"],
                "filename": item["accountA"].get("filename", ""),
                "size": item["accountA"].get("size", 0),
                "path": item["accountA"].get("path", ""),
                "match_type": item.get("match_type", ""),
                "sha_verified": item.get("sha_verified", False)
            }
            for idx, item in enumerate(delete_items)
        ]
    })


# ─── Finalize & Extract ───────────────────────────────────

@app.route("/finalize", methods=["POST"])
def finalize():
    """Extract files marked for deletion and generate report."""

    # 1. Attach decisions to candidates
    final_list = []
    for i, candidate in enumerate(scan_state["candidates"]):
        item = candidate.copy()
        item["decision"] = scan_state["decisions"].get(str(i), "unreviewed")
        final_list.append(item)

    # 2. Sort candidates by size DESCENDING (so largest files are first)
    final_list.sort(key=lambda x: x["accountA"].get("size", 0), reverse=True)

    # 3. Extract marked files
    extract_result = extract_marked_files(final_list, ROOT)

    # 4. Generate CSV report
    csv_filename = export_csv(final_list)

    # 5. Summary
    summary = get_summary(scan_state["candidates"], scan_state["decisions"])
    summary["extracted_bytes"] = extract_result.get("total_bytes", 0)
    summary["replaced_files"] = extract_result.get("replaced", 0)

    # 6. Save history
    save_history_entry(summary, extract_result["extracted"], csv_filename)

    return jsonify({
        "status": "ok",
        "extracted": extract_result["extracted"],
        "replaced": extract_result.get("replaced", 0),
        "folder": extract_result["folder"],
        "csv": csv_filename,
        "summary": get_summary(
            scan_state["candidates"],
            scan_state["decisions"]
        )
    })


# ─── Export Report ─────────────────────────────────────────

@app.route("/export")
def export():
    """Generate and return CSV report filename."""

    final_list = []
    for i, candidate in enumerate(scan_state["candidates"]):
        item = candidate.copy()
        item["decision"] = scan_state["decisions"].get(str(i), "unreviewed")
        final_list.append(item)

    final_list.sort(key=lambda x: x["accountA"].get("size", 0), reverse=True)

    filename = export_csv(final_list)

    return jsonify({
        "status": "ok",
        "filename": filename
    })

@app.route("/reports/<filename>")
def download_report(filename):
    """Download a generated CSV report."""
    reports_dir = ROOT / "reports"
    file_path = reports_dir / filename
    if not file_path.exists():
        return "Report not found", 404
    return send_file(file_path, as_attachment=True, download_name=filename)


@app.route("/history")
def history():
    """Get past finalization runs."""
    return jsonify({
        "status": "ok",
        "history": load_history()
    })

@app.route("/open_folder", methods=["POST"])
def open_folder():
    """Open the extraction folder in Windows Explorer."""
    path = str(EXTRACT_DIR)
    # Check if folder exists
    if not EXTRACT_DIR.exists():
        EXTRACT_DIR.mkdir(exist_ok=True)
    
    try:
        if os.name == 'nt':
            os.startfile(path)
        else:
            # Fallback for mac/linux
            os.system(f'open "{path}"') 
        return jsonify({"status": "ok"})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})

# ─── Start ─────────────────────────────────────────────────

def open_browser():
    webbrowser.open("http://127.0.0.1:5000")


if __name__ == "__main__":
    threading.Timer(1, open_browser).start()
    app.run(debug=False, threaded=True)
