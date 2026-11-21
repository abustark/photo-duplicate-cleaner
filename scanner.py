import re
import os
from pathlib import Path
import zipfile
import json
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed
from PIL import Image


PHOTO_EXT = {
    ".jpg", ".jpeg", ".png",
    ".webp", ".bmp", ".gif",
    ".tif", ".tiff", ".heic"
}

VIDEO_EXT = {
    ".mp4", ".mov", ".avi",
    ".mkv", ".3gp", ".webm"
}

# Pattern to strip (1), (2), etc. from filenames
SUFFIX_PATTERN = re.compile(r"\(\d+\)$")


def clean_filename(name):
    """Strip parenthetical suffixes like (1), (2) from filename stem."""
    stem = Path(name).stem
    ext = Path(name).suffix.lower()
    cleaned = SUFFIX_PATTERN.sub("", stem).strip()
    return cleaned + ext


def read_json(zip_file, json_name):
    try:
        with zip_file.open(json_name) as f:
            return json.load(f)
    except Exception:
        return {}


def get_dimensions(zip_file, image_name):
    """Read image dimensions via Pillow streaming. Used for candidates only."""
    try:
        with zip_file.open(image_name) as f:
            img = Image.open(f)
            width, height = img.size
            return width, height
    except Exception:
        return None, None


def _extract_year_and_album(file_path, taken_time):
    """Extract year and folder/album name from metadata or path structure."""
    year = None
    if taken_time:
        try:
            year = str(datetime.fromtimestamp(int(taken_time)).year)
        except Exception:
            pass

    if not year:
        # Match 4-digit years like 1999 or 2024 in the path
        match = re.search(r"\b(19\d\d|20\d\d)\b", file_path)
        if match:
            year = match.group(1)

    parts = Path(file_path).parts
    album = parts[-2] if len(parts) >= 2 else "Takeout"

    return year or "Unknown", album


def _scan_single_zip(zip_path):
    """Scan a single ZIP archive, collecting metadata without extracting."""
    items = []
    photo_count = 0
    video_count = 0
    json_count = 0

    try:
        with zipfile.ZipFile(zip_path, "r") as z:
            files = z.namelist()

            # Build JSON metadata lookup
            json_lookup = {}
            for file in files:
                if file.endswith(".supplemental-metadata.json"):
                    key = file[:-len(".supplemental-metadata.json")]
                    json_lookup[key] = file

            for file in files:
                ext = Path(file).suffix.lower()

                if ext in PHOTO_EXT or ext in VIDEO_EXT:
                    file_type = "photo" if ext in PHOTO_EXT else "video"
                    if file_type == "photo":
                        photo_count += 1
                    else:
                        video_count += 1

                    size = z.getinfo(file).file_size

                    taken_time = None
                    upload_time = None

                    if file in json_lookup:
                        data = read_json(z, json_lookup[file])
                        taken_time = data.get("photoTakenTime", {}).get("timestamp")
                        upload_time = data.get("creationTime", {}).get("timestamp")

                    year, album = _extract_year_and_album(file, taken_time)

                    items.append({
                        "filename": Path(file).name,
                        "filename_clean": clean_filename(Path(file).name),
                        "extension": ext,
                        "type": file_type,
                        "size": size,
                        "taken": taken_time,
                        "uploaded": upload_time,
                        "year": year,
                        "album": album,
                        "zip": zip_path.name,
                        "path": file
                    })

                elif ext == ".json":
                    json_count += 1

    except Exception as e:
        print(f"Error reading {zip_path.name}: {e}")

    return {
        "zip": zip_path.name,
        "items": items,
        "photos": photo_count,
        "videos": video_count,
        "json": json_count
    }


def analyze(folder, progress_callback=None):
    """
    Scan all ZIP files in a folder using a multi-threaded worker pool.
    Collects metadata for photos and videos without extracting.
    Thread-safe progress updates are emitted per completed ZIP.
    """
    zip_files = sorted(folder.glob("*.zip"))
    zip_total = len(zip_files)

    if zip_total == 0:
        return {
            "zips": 0,
            "photos": 0,
            "videos": 0,
            "json": 0,
            "inventory": []
        }

    max_workers = min(8, max(1, (os.cpu_count() or 4)))
    max_workers = min(max_workers, zip_total)

    inventory = []
    total_photos = 0
    total_videos = 0
    total_json = 0
    completed_count = 0

    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        futures = {executor.submit(_scan_single_zip, zp): zp for zp in zip_files}

        for future in as_completed(futures):
            completed_count += 1
            res = future.result()

            inventory.extend(res["items"])
            total_photos += res["photos"]
            total_videos += res["videos"]
            total_json += res["json"]

            if progress_callback:
                progress_callback({
                    "zip": res["zip"],
                    "zip_num": completed_count,
                    "zip_total": zip_total,
                    "photos": total_photos,
                    "videos": total_videos
                })

    return {
        "zips": zip_total,
        "photos": total_photos,
        "videos": total_videos,
        "json": total_json,
        "inventory": inventory
    }