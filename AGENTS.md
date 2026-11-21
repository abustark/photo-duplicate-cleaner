# Photo Duplicate Cleaner

Local Flask web app that finds duplicate photos/videos between two Google Photos accounts exported via Google Takeout (`accountA/` vs `accountB/`), lets the user review pairs in the browser, and extracts files marked for deletion into `to_delete/` — nothing is ever really deleted.

## Run

- `pip install -r requirements.txt` (flask, pillow)
- `python main.py` → opens http://127.0.0.1:5000
- Scan runs in a background thread; progress streams to the UI via SSE (`/progress`).

## Architecture

- `main.py` — Flask routes, shared `scan_state`, SSE queue. Pipeline: scan A → scan B → compare → hash-verify → review → finalize.
- `scanner.py` — `analyze()` walks the Takeout zips, counts photos/videos.
- `cache.py` — per-account scan cache keyed by zip fingerprint (skips rescan when unchanged).
- `comparer.py` — `find_possible_duplicates()` produces candidate pairs.
- `hasher.py` — `annotate_candidates()` assigns match_type strong/likely/weak + `sha_verified`.
- `deleter.py` — `extract_marked_files()` copies delete-marked A-side files to `to_delete/` as `NNN_filename`, numbering matching the CSV order.
- `report.py` — CSV export into `reports/`; `history.py` — run history (`history.json`).
- Decisions autosave to `active_session.json` (keyed `pathA::pathB`).
- Frontend: `templates/index.html` + `static/style.css` (vanilla JS, dark/light theme, no build step).
- Data dirs: `accountA/`, `accountB/`, `takeout/`, `to_delete/`, `reports/`, `temp/`, `v1_backup/`.

## Conventions

- Keep the no-real-deletion safety model: files are only extracted into `to_delete/`; never add code that deletes originals.
- No test suite exists; verify changes by running the app against sample zips in `accountA/`/`accountB/`.
- The empty `.git` and `.agents` folders at the root are leftovers — this is not a git repo; don't initialize one unless asked.

## Useful skills (hidden from catalog — read the SKILL.md, then follow it)

- Testing this web UI: `C:\Users\abu\.config\opencode\skills\awesome-claude-skills\webapp-testing\SKILL.md` (Python Playwright; drive the Flask app, screenshots, console logs).
- File/dedup organization workflows: `C:\Users\abu\.config\opencode\skills\awesome-claude-skills\file-organizer\SKILL.md`
- Bug-fixing discipline: `C:\Users\abu\.config\opencode\skills\superpowers\skills\systematic-debugging\SKILL.md`

## User approval gates

- Before starting work that is likely to consume substantial time, credits, or tokens (such as broad research, extended exploration, or multi-step external tooling), explain the proposed work and ask the user first. Wait for approval before beginning that work.
- Ask before performing visual checks, including opening the app in a browser, taking screenshots, or conducting a visual UI review. Wait for approval before proceeding.
- Ask before running tests, builds, or other verification commands. Wait for approval before proceeding. If the user explicitly requests testing or verification for a task, that request is approval for the relevant checks.
- Keep routine, directly requested implementation work moving without adding optional research, visual review, or tests. If an approval gate applies, state the specific action and why it needs approval.
- For every user-requested project change or update, complete the requested change, commit it, and push it to the configured remote before reporting completion or asking what to do next. This standing instruction authorizes commits and pushes for those requested changes; it does not waive the approval gates above for substantial extra work, visual checks, or tests.
