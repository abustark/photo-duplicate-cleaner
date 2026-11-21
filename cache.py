import json
import os
from pathlib import Path


CACHE_DIR = Path(__file__).parent / "temp"


def get_zip_fingerprint(folder):
    """Get modification times and sizes of all ZIPs in folder."""

    fingerprint = {}

    for zip_path in sorted(folder.glob("*.zip")):

        stat = zip_path.stat()

        fingerprint[zip_path.name] = {
            "mtime": stat.st_mtime,
            "size": stat.st_size
        }

    return fingerprint


def load_cache(account_name):
    """Load cached inventory for an account. Returns None if no cache."""

    cache_file = CACHE_DIR / f"{account_name}_inventory.json"
    fingerprint_file = CACHE_DIR / f"{account_name}_fingerprint.json"

    if not cache_file.exists() or not fingerprint_file.exists():
        return None, None

    try:

        with open(fingerprint_file, "r") as f:
            fingerprint = json.load(f)

        with open(cache_file, "r") as f:
            inventory = json.load(f)

        # Backfill year and album if loaded from older cache version
        needs_save = False
        from datetime import datetime
        import re

        for item in inventory.get("inventory", []):
            if "year" not in item or item.get("year") == "Unknown":
                year = None
                if item.get("taken"):
                    try:
                        year = str(datetime.fromtimestamp(int(item["taken"])).year)
                    except Exception:
                        pass
                if not year and item.get("path"):
                    m = re.search(r"\b(19\d\d|20\d\d)\b", item["path"])
                    if m:
                        year = m.group(1)
                item["year"] = year or "Unknown"
                needs_save = True

            if "album" not in item:
                parts = Path(item.get("path", "")).parts
                item["album"] = parts[-2] if len(parts) >= 2 else "Takeout"
                needs_save = True

        if needs_save:
            try:
                with open(cache_file, "w") as f:
                    json.dump(inventory, f)
            except Exception:
                pass

        return inventory, fingerprint

    except Exception:

        return None, None


def save_cache(account_name, result, fingerprint):
    """Save inventory and fingerprint to cache."""

    CACHE_DIR.mkdir(exist_ok=True)

    cache_file = CACHE_DIR / f"{account_name}_inventory.json"
    fingerprint_file = CACHE_DIR / f"{account_name}_fingerprint.json"

    with open(cache_file, "w") as f:
        json.dump(result, f)

    with open(fingerprint_file, "w") as f:
        json.dump(fingerprint, f)


def is_cache_valid(account_name, folder):
    """Check if cache matches current ZIP files."""

    cached_data, cached_fingerprint = load_cache(account_name)

    if cached_data is None:
        return False, None

    current_fingerprint = get_zip_fingerprint(folder)

    if cached_fingerprint == current_fingerprint:
        return True, cached_data

    return False, None
