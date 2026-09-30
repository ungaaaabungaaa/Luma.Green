#!/usr/bin/env python3
"""Turn a Claude Docs markdown export of the Platform Plan into docs/plan.md.

Usage: python3 docs/plan/tools/export-plan.py <export-json-file> [as-of text]

The export is the JSON the docs `export` tool returns (format "markdown").
The two drawn widgets (the overview and the roadmap) have no Markdown form,
so their placeholders are replaced with the Mermaid diagrams already in
docs/plan.md; the doc's byline becomes the "As of" paragraph.
"""
import base64, json, re, sys, datetime

src = sys.argv[1]
as_of = sys.argv[2] if len(sys.argv) > 2 else datetime.date.today().strftime("%-d %B %Y")
raw = open(src).read()
b64 = re.search(r'"bytes_b64"\s*:\s*"([A-Za-z0-9+/=]+)"', raw).group(1)
md = base64.b64decode(b64).decode("utf-8")

old = open("docs/plan.md").read()
mermaid = re.findall(r"```mermaid\n.*?```", old, flags=re.S)
if len(mermaid) < 2:
    sys.exit("docs/plan.md must hold the two Mermaid diagrams to carry over")

# title + byline -> the As-of paragraph
md = re.sub(
    r"\A# Luma\.Green Platform Plan\n\n[^\n]*\n",
    "# Luma.Green Platform Plan\n\nAs of " + as_of + ". The living copy of this plan, with comments, is the Luma.Green Platform Plan doc; this file is its export.\n",
    md,
)
# the two widget placeholders, in order
placeholders = re.findall(r"^&#91;embedded content:[^\n]*\\\]\s*$", md, flags=re.M)
if len(placeholders) != 2:
    sys.exit(f"expected 2 widget placeholders, found {len(placeholders)}")
for ph, diagram in zip(placeholders, mermaid):
    md = md.replace(ph, diagram, 1)
# the Sources tab mention -> the repo's sources page
md = md.replace("The full list, grouped by topic: Sources", "The full list, grouped by topic, is in [docs/plan/sources.md](plan/sources.md).")
md = md.replace("The full list, grouped by topic, is in Sources", "The full list, grouped by topic, is in [docs/plan/sources.md](plan/sources.md).")
open("docs/plan.md", "w").write(md.rstrip() + "\n")
print("wrote docs/plan.md", len(md), "chars")
