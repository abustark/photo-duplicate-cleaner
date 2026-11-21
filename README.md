# Photo Duplicate Cleaner

A local-first Flask app for finding and reviewing duplicate photos and videos across two Google Photos Takeout exports. It compares Account A and Account B, explains match confidence, and lets you gather selected Account A files into a separate folder for review.

**Your originals are never deleted or modified.** The app does not upload archives to a service; scanning and review run locally on your machine.

## What it does

- Scans ZIP archives from two Takeout folders and caches archive analysis when the input files have not changed.
- Compares photos and videos using file metadata and candidate matching, then verifies strong matches with hashes.
- Shows candidate pairs side by side with confidence and match evidence so you can make each decision yourself.
- Supports filters, search, grid review, keyboard shortcuts, autosaved decisions, run history, and CSV reports.
- Copies files you mark from Account A into `to_delete/` for a separate, reversible review step. Nothing in the Takeout folders is removed.

## Run locally

Requirements: Python 3.10 or newer.

```powershell
pip install -r requirements.txt
python main.py
```

The app opens at <http://127.0.0.1:5000>. If that port is already in use, start Flask on another port:

```powershell
python -m flask --app main run --host 127.0.0.1 --port 5267 --no-debugger --no-reload
```

## Add Takeout archives

Place the ZIP parts for each Google Photos Takeout in the matching folder:

```text
PhotoDuplicateCleaner/
├── accountA/   # Account A Takeout .zip files
├── accountB/   # Account B Takeout .zip files
└── to_delete/  # Selected Account A copies are extracted here
```

Create `accountA/` and `accountB/` if needed. The app can scan multiple ZIP parts per account. Start a scan in the browser and follow the streamed progress updates.

## Safety and privacy

- Keep the app bound to localhost when working with personal photo libraries.
- Review every candidate before marking it for extraction; similarity signals are not a substitute for your decision.
- The extraction step copies marked Account A files into `to_delete/`; it does not remove originals.
- Takeout archives, extracted media, local session decisions, scan history, reports, and runtime files are excluded from Git by `.gitignore`.

## Stack

Python, Flask, Pillow, server-rendered HTML, CSS, and vanilla JavaScript. Scan progress is streamed to the browser with Server-Sent Events.
