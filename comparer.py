from collections import defaultdict
from datetime import datetime
import re


def _get_item_year(item):
    year = item.get("year")
    if year and year != "Unknown":
        return str(year)
    if item.get("taken"):
        try:
            return str(datetime.fromtimestamp(int(item["taken"])).year)
        except Exception:
            pass
    if item.get("path"):
        m = re.search(r"\b(19\d\d|20\d\d)\b", item["path"])
        if m:
            return m.group(1)
    return "Unknown"


def find_possible_duplicates(account_a, account_b):
    """
    Multi-stage duplicate matching.

    Stage 1: Match by photoTakenTime (primary).
    Stage 2: Match by filename_clean (fallback for items without timestamps).
    Stage 3: Score all candidates by filename, size, extension.

    Returns sorted candidates with match_score and match_type.
    """

    duplicates = []
    seen_pairs = set()

    # ── Stage 1: Match by timestamp ─────────────────────

    time_lookup = defaultdict(list)

    for item in account_b["inventory"]:
        key = item["taken"]
        if key is not None:
            time_lookup[key].append(item)

    for item_a in account_a["inventory"]:

        key = item_a["taken"]

        if key is None or key not in time_lookup:
            continue

        for item_b in time_lookup[key]:

            if item_a["type"] != item_b["type"]:
                continue

            pair_id = (item_a["zip"] + "|" + item_a["path"],
                       item_b["zip"] + "|" + item_b["path"])

            if pair_id in seen_pairs:
                continue
            seen_pairs.add(pair_id)

            score, reasons = _score_pair(item_a, item_b, has_time=True)

            duplicates.append({
                "accountA": item_a,
                "accountB": item_b,
                "match_score": score,
                "match_type": _match_type(score),
                "reasons": reasons,
                "sha_verified": False
            })

    # ── Stage 2: Match by filename (fallback) ───────────

    name_lookup = defaultdict(list)

    for item in account_b["inventory"]:
        name_lookup[item["filename_clean"]].append(item)

    for item_a in account_a["inventory"]:

        clean = item_a["filename_clean"]

        if clean not in name_lookup:
            continue

        for item_b in name_lookup[clean]:

            if item_a["type"] != item_b["type"]:
                continue

            pair_id = (item_a["zip"] + "|" + item_a["path"],
                       item_b["zip"] + "|" + item_b["path"])

            if pair_id in seen_pairs:
                continue
            seen_pairs.add(pair_id)

            score = 3  # name match base
            reasons = ["name"]

            # Size within 5%
            if item_a["size"] > 0 and item_b["size"] > 0:
                ratio = min(item_a["size"], item_b["size"]) / max(item_a["size"], item_b["size"])
                if ratio >= 0.95:
                    score += 2
                    reasons.append("size")

            if item_a["extension"] == item_b["extension"]:
                score += 1
                reasons.append("ext")

            duplicates.append({
                "accountA": item_a,
                "accountB": item_b,
                "match_score": score,
                "match_type": _match_type(score),
                "reasons": reasons,
                "sha_verified": False
            })

    # Ensure year is populated on both accounts
    for d in duplicates:
        d["accountA"]["year"] = _get_item_year(d["accountA"])
        d["accountB"]["year"] = _get_item_year(d["accountB"])

    # Sort: strong first
    duplicates.sort(key=lambda x: x["match_score"], reverse=True)

    return duplicates


def _score_pair(item_a, item_b, has_time=False):
    """Score a candidate pair."""

    score = 0
    reasons = []

    if has_time:
        reasons.append("time")

    if item_a["filename_clean"] == item_b["filename_clean"]:
        score += 3
        reasons.append("name")

    if item_a["size"] > 0 and item_b["size"] > 0:
        ratio = min(item_a["size"], item_b["size"]) / max(item_a["size"], item_b["size"])
        if ratio >= 0.95:
            score += 2
            reasons.append("size")

    if item_a["extension"] == item_b["extension"]:
        score += 1
        reasons.append("ext")

    return score, reasons


def _match_type(score):
    """Label match confidence."""

    if score >= 5:
        return "strong"
    elif score >= 3:
        return "likely"
    else:
        return "weak"