#!/usr/bin/env python3
"""Copy research and verify results out of workflow journals into docs/plan/research/answers/.

Usage: python3 docs/plan/tools/collect-research.py <journal.jsonl>...

A journal is the Workflow tool's run record (one JSON object per line). Agents
labelled research:<cluster> produce <cluster>.research.json (only written when
no file exists yet, so the desktop run's answers are never overwritten by a
snippet-based re-run); agents labelled verify:<cluster> produce
<cluster>.verify.json (always the latest). Nothing else is touched.
"""
import json, os, sys

OUT = "docs/plan/research/answers"
labels = {}
written = []
for path in sys.argv[1:]:
    for line in open(path):
        try:
            e = json.loads(line)
        except ValueError:
            continue
        if e.get("type") == "started":
            labels[e["agentId"]] = e.get("label", "")
        elif e.get("type") == "result":
            label = labels.get(e["agentId"], "")
            kind, _, cluster = label.partition(":")
            result = e.get("result")
            if not cluster or not isinstance(result, dict):
                continue
            if kind == "research":
                target = os.path.join(OUT, f"{cluster}.research.json")
                if os.path.exists(target):
                    continue
            elif kind == "verify":
                target = os.path.join(OUT, f"{cluster}.verify.json")
            else:
                continue
            with open(target, "w") as fh:
                json.dump(result, fh, indent=2, ensure_ascii=False)
                fh.write("\n")
            written.append(target)
print("\n".join(written) if written else "nothing new")
