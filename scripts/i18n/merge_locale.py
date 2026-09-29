#!/usr/bin/env python3
"""Rebuild messages/<locale>.json from en.json, the old locale file and the
translated chunks.

    python3 merge_locale.py <repo> <i18n-dir> <locale> [<locale> ...]

For every English key, in English order:
  - a fresh translation from out/<locale>.<chunk>.json, if the English at
    snapshot time (src/<chunk>.json) still matches today's English;
  - else the old translation, if the English did not change since main;
  - else the key is reported as still to translate (and English is used,
    so the file stays loadable).
Keys English no longer has are dropped.
"""

import json
import os
import sys


def flat(obj, prefix=""):
    out = {}
    for key, value in obj.items():
        path = f"{prefix}.{key}" if prefix else key
        if isinstance(value, dict):
            out.update(flat(value, path))
        else:
            out[path] = value
    return out


def nest(pairs):
    root = {}
    for path, value in pairs:
        node = root
        parts = path.split(".")
        for part in parts[:-1]:
            node = node.setdefault(part, {})
        node[parts[-1]] = value
    return root


def load(path):
    with open(path, encoding="utf-8") as handle:
        return json.load(handle)


def main():
    repo, i18n = sys.argv[1], sys.argv[2]
    english = flat(load(os.path.join(repo, "messages", "en.json")))
    english_main = flat(load(os.path.join(i18n, "en.main.json")))
    chunks = ("help", "app", "delta")
    snapshots = {
        chunk: flat(load(os.path.join(i18n, "src", f"{chunk}.json")))
        for chunk in chunks
        if os.path.exists(os.path.join(i18n, "src", f"{chunk}.json"))
    }

    for locale in sys.argv[3:]:
        old = flat(load(os.path.join(repo, "messages", f"{locale}.json")))
        # A chunk's translation counts only if the English it was made from
        # is still today's English; later chunks (delta) win over earlier ones.
        fresh = {}
        for chunk, snapshot in snapshots.items():
            path = os.path.join(i18n, "out", f"{locale}.{chunk}.json")
            if not os.path.exists(path):
                continue
            for key, text in flat(load(path)).items():
                if snapshot.get(key) == english.get(key):
                    fresh[key] = text

        pairs, todo = [], []
        for key, value in english.items():
            if key in fresh:
                pairs.append((key, fresh[key]))
            elif key in old and english_main.get(key) == value:
                pairs.append((key, old[key]))
            else:
                pairs.append((key, value))
                todo.append(key)

        with open(os.path.join(repo, "messages", f"{locale}.json"), "w", encoding="utf-8") as handle:
            handle.write(json.dumps(nest(pairs), ensure_ascii=False, indent=2) + "\n")
        with open(os.path.join(i18n, f"todo.{locale}.json"), "w", encoding="utf-8") as handle:
            json.dump(todo, handle, indent=1)
        print(f"{locale}: {len(pairs)} keys, {len(todo)} still to translate")


if __name__ == "__main__":
    main()
