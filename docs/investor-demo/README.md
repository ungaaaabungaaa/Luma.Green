# Investor demonstration documents

The editable source is `tour.json`. The short Word output is
`output/docx/luma-green-investor-demo.docx`. The source plans 14 pages and includes
no credentials. `build.json` binds source, selected screenshots and output hashes.
The current candidate has 14 reviewed pages and 12 new development-browser screenshots. Account validation is recorded separately; screenshots do not prove every account or real provider execution.

Use the bundled Python runtime returned by the workspace dependencies tool. It
must have python-docx and Pillow. The style follows the existing maintained Word
builders: DejaVu Sans, black headings, editable text and unchanged browser images.
This short document uses Letter portrait and 11-point body text.

```sh
python scripts/build-investor-demo.py --check
python scripts/build-investor-demo.py
```

Before final generation, set the confirmed development frontend URL and replace
screenshots on pages 1–12 with new captures. Each `screenshot` object requires:

```json
{
  "path": "screenshots/example.png",
  "sha256": "actual SHA256 of reviewed original PNG",
  "reviewed": true,
  "actual_browser_capture": true,
  "environment": "production_demo",
  "release": "actual release identifier",
  "dataset": "actual investor dataset version",
  "captured_at": "actual UTC capture time",
  "caption": "Actual production demo browser view with imported sample records."
}
```

The other allowed environment is `development_demo`. Use original browser images
at least 700 pixels wide. No old component fixture is silently substituted. Keep
passwords, codes, real contacts and keys out of screenshots. A completed import
still does not prove a real payment, SMS verification or physical event.

```sh
python scripts/build-investor-demo.py --final
```

Render the DOCX with the documents skill's `render_docx.py`, inspect every original
page, fix overflow and ensure the rendered result has no more than 14 pages. Only
then use `--record-review 14` (or its actual 10–14 page count). Draft review keeps
the draft status. Final generation alone does not assert visual acceptance.

## Restricted credentials

`build-private-credentials.py` is a separate builder. Supply an ignored `.convex`
JSON file containing a list or `{ "accounts": [...] }`; each account needs
`name`, `email` and `password`. Other fields are discarded. Email addresses must
use the assigned `templateKey-1..5@investor.luma.invalid` namespace. The default
expected account count is 140 per environment. Generate one private output per
environment. No admin accounts belong to this roster.

```sh
python docs/investor-demo/build-private-credentials.py \
  --input .convex/investor-demo/production-credentials.json \
  --output .convex/investor-demo/production-credentials.docx
```

The input and output paths must remain under a `.convex` directory. The builder
writes the output with mode 0600. It prints no account values, and its document
body contains only name, email and password entries. It does not create accounts
or verify login. Check the real account roster separately, then render and inspect
the private document without sending its pages into a shared guide or commit.
Never commit private inputs, generated private documents or their render output.

Production frontend: https://lumagreen.vercel.app. The development frontend is http://localhost:3102 on the owner’s Mac, connected to the cloud development database. It is not a publicly hosted development address.
