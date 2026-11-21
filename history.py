import json
from datetime import datetime
from pathlib import Path

REPORTS_DIR = Path(__file__).parent / "reports"
HISTORY_FILE = REPORTS_DIR / "history.json"


def load_history():
    """Load finalization history from disk."""
    if not HISTORY_FILE.exists():
        return []
    try:
        with open(HISTORY_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return []


def save_history_entry(summary, extracted, csv_filename):
    """Append a new finalization run to the history file."""
    
    REPORTS_DIR.mkdir(exist_ok=True)
    history = load_history()
    
    timestamp_dt = datetime.now()
    
    entry = {
        "id": timestamp_dt.strftime("%Y%m%d_%H%M%S"),
        "date": timestamp_dt.strftime("%Y-%m-%d %H:%M:%S"),
        "csv_file": csv_filename,
        "summary": summary,
        "extracted_files": extracted
    }
    
    # Insert at beginning so newest is first
    history.insert(0, entry)
    
    with open(HISTORY_FILE, "w", encoding="utf-8") as f:
        json.dump(history, f, indent=4)
        
    return entry
