# Scratch: list UI keys in the `help` namespace that no help file references.
import json
import pathlib
import sys

root = pathlib.Path(sys.argv[1])
help_ns = json.loads((root / "messages/en.json").read_text())["help"]


def leaves(node, prefix=""):
    if isinstance(node, str):
        yield prefix
    else:
        for key, value in node.items():
            yield from leaves(value, f"{prefix}.{key}" if prefix else key)


# Content keys are checked by content.test.ts; these are built dynamically.
skip = (
    "guides.",
    "faqs.",
    "tutorials.",
    "modules.",
    "roles.",
    "topics.",
    "contact.roles.",
    "contact.topics.",
    "contact.errors.",
)
dirs = [root / "src/components/help", root / "src/app/[locale]/(site)/help"]
files = [
    path
    for folder in dirs
    for path in folder.rglob("*.ts*")
    if ".test." not in path.name
]
code = "\n".join(path.read_text() for path in files)
missing = []
for key in leaves(help_ns):
    if key.startswith(skip):
        continue
    candidates = {key, key.removeprefix("contact.")}
    if not any(f'"{c}"' in code or f"`{c}`" in code for c in candidates):
        missing.append(key)
print("possibly unused:", missing)
