import csv
import os
from datetime import datetime
from pathlib import Path
import shutil

REPORTS_DIR = Path(__file__).parent / "reports"
from deleter import EXTRACT_DIR


def export_csv(sorted_duplicates):
    """
    Export confirmed duplicates to CSV report.
    sorted_duplicates: List of candidate dictionaries which MUST have a 'decision' key.
    """

    REPORTS_DIR.mkdir(exist_ok=True)

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"duplicates_{timestamp}.csv"
    filepath = REPORTS_DIR / filename
    
    EXTRACT_DIR.mkdir(exist_ok=True)
    filepath_extract = EXTRACT_DIR / filename

    with open(filepath, "w", newline="", encoding="utf-8") as f:

        writer = csv.writer(f)

        # Simplified, less technical columns as requested
        writer.writerow([
            "Item #",
            "Filename",
            "Size",
            "Type",
            "Account A Path",
            "Account B Path",
            "Year",
            "Month",
            "Time Taken",
            "Decision"
        ])
        
        row_counter = 1

        for i, pair in enumerate(sorted_duplicates):
            
            decision = pair.get("decision", "unreviewed")
            
            # ONLY include photos specifically tagged for deletion!
            if decision != "delete":
                continue
            
            # Prefix with apostrophe to trick Google Sheets/Excel into treating it as text
            # instead of a number, forcing it to display '001' instead of stripping to '1'
            idx_str = f"'{row_counter:03d}"
            row_counter += 1

            item_a = pair["accountA"]
            item_b = pair["accountB"]

            taken_year = ""
            taken_month = ""
            taken_time = ""
            
            taken = item_a.get("taken", "")
            if taken:
                try:
                    dt = datetime.fromtimestamp(int(taken))
                    taken_year = dt.strftime("%Y")
                    taken_month = dt.strftime("%B")  # Full month name like 'July'
                    taken_time = dt.strftime("%H:%M:%S")
                except Exception:
                    pass

            def clean_path(p):
                p = str(p)
                # Strip out the noisy takeout prefix logic
                prefix = "Takeout/Google Photos/"
                if p.startswith(prefix):
                    return p[len(prefix):]
                # Try backslash version too
                prefix2 = "Takeout\\Google Photos\\"
                if p.startswith(prefix2):
                    return p[len(prefix2):]
                return p

            path_a = clean_path(item_a.get("path", ""))
            path_b = clean_path(item_b.get("path", ""))
            # Format Size
            size = item_a.get("size", 0)
            if size > 0:
                size_mb = size / (1024 * 1024)
                size_str = f"{size_mb:.2f} MB"
            else:
                size_str = "Unknown"

            writer.writerow([
                idx_str,
                item_a.get("filename", ""),
                size_str,
                item_a.get("type", "photo"),
                path_a,
                path_b,
                taken_year,
                taken_month.upper(),
                taken_time,
                decision.upper()
            ])

    # Copy the generated CSV to the `to_delete/` folder for immediate user access
    if filepath.exists():
        shutil.copy2(filepath, filepath_extract)

    return filename
