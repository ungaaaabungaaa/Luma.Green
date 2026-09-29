#!/usr/bin/env python3
"""Three-way JSON merge for message catalogues, usable as a git merge driver.

    python3 json3merge.py BASE OURS THEIRS   # writes the result into OURS

Each side's changes relative to BASE are applied key by key. Keys added by
THEIRS land after the sibling that precedes them in THEIRS. Exits 1 and
prints the paths when both sides changed the same leaf differently.
"""

import json
import sys

MISSING = object()


class Conflict(Exception):
    pass


def ordered_keys(ours, theirs):
    keys = list(ours.keys())
    for index, key in enumerate(theirs.keys()):
        if key in keys:
            continue
        previous = None
        for candidate in reversed(list(theirs.keys())[:index]):
            if candidate in keys:
                previous = candidate
                break
        keys.insert(keys.index(previous) + 1 if previous is not None else 0, key)
    return keys


def merge3(base, ours, theirs, path, conflicts):
    if ours == theirs:
        return ours
    if base == ours:
        return theirs
    if base == theirs:
        return ours
    if isinstance(ours, dict) and isinstance(theirs, dict):
        base_dict = base if isinstance(base, dict) else {}
        result = {}
        for key in ordered_keys(ours, theirs):
            value = merge3(
                base_dict.get(key, MISSING),
                ours.get(key, MISSING),
                theirs.get(key, MISSING),
                path + [key],
                conflicts,
            )
            if value is not MISSING:
                result[key] = value
        return result
    conflicts.append(".".join(path))
    return ours


def load(file_path):
    try:
        with open(file_path, encoding="utf-8") as handle:
            text = handle.read()
    except FileNotFoundError:
        return {}
    return json.loads(text) if text.strip() else {}


def main():
    base_path, ours_path, theirs_path = sys.argv[1:4]
    conflicts = []
    merged = merge3(load(base_path), load(ours_path), load(theirs_path), [], conflicts)
    with open(ours_path, "w", encoding="utf-8") as handle:
        handle.write(json.dumps(merged, ensure_ascii=False, indent=2) + "\n")
    if conflicts:
        print("json3merge: conflicting keys (kept ours): " + ", ".join(conflicts), file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
