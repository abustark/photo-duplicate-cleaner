import zipfile
from pathlib import Path


EXTRACT_DIR = Path(__file__).parent / "to_delete"


def extract_marked_files(sorted_duplicates, root):
    """
    Extract Account A files marked as 'delete' into to_delete/ folder.
    Files are prefixed with the index to match the CSV exact sort order.

    Returns count of extracted files and the folder path.
    """

    EXTRACT_DIR.mkdir(exist_ok=True)

    extracted = 0
    replaced = 0
    file_list = []
    
    total_bytes = 0

    for i, pair in enumerate(sorted_duplicates):

        decision = pair.get("decision")
        if decision != "delete":
            continue

        item_a = pair["accountA"]
        zip_path = root / "accountA" / item_a["zip"]

        if not zip_path.exists():
            continue

        # Target prefix for sorting nicely in windows
        idx_str = f"{(extracted+1):03d}"
        
        # We will just put everything directly in `to_delete/` instead of date subfolders,
        # so they can see all 1...N files precisely matching the CSV!
        dest_dir = EXTRACT_DIR

        try:
            with zipfile.ZipFile(zip_path, "r") as z:
                with z.open(item_a["path"]) as src:
                    data = src.read()

            base_name = f"{idx_str}_{item_a['filename']}"
            dest_file = dest_dir / base_name

            was_replaced = dest_file.exists()

            with open(dest_file, "wb") as f:
                f.write(data)

            extracted += 1
            if was_replaced:
                replaced += 1
            total_bytes += len(data)
            
            file_list.append({
                "filename": base_name,
                "dest": str(dest_file.relative_to(EXTRACT_DIR)),
                "replaced": was_replaced
            })

        except Exception as e:
            print(f"Failed to extract {item_a['filename']}: {e}")

    return {
        "extracted": extracted,
        "folder": str(EXTRACT_DIR),
        "files": file_list,
        "total_bytes": total_bytes,
        "replaced": replaced
    }


def get_summary(duplicates, decisions):
    """Get summary counts of user decisions."""

    keep_count = 0
    delete_count = 0
    skip_count = 0
    unreviewed = 0

    for i in range(len(duplicates)):
        decision = decisions.get(str(i))
        if decision == "keep":
            keep_count += 1
        elif decision == "delete":
            delete_count += 1
        elif decision == "skip":
            skip_count += 1
        else:
            unreviewed += 1

    return {
        "total": len(duplicates),
        "keep": keep_count,
        "delete": delete_count,
        "skip": skip_count,
        "unreviewed": unreviewed
    }
