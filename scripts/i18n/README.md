# Translation tooling

How new English strings reach the other 11 locales.

1. `validate.mjs <english-chunk.json> <translated-chunk.json>`: checks the key set, empty values, ICU syntax, placeholders, plural and select structure, rich-text tags and the brand name. Translators (agents) run it until it prints `OK`.
2. `merge_locale.py <repo> <i18n-dir> <locale...>`: rebuilds `messages/<locale>.json` from `en.json`, the old locale file and translated chunks (`<i18n-dir>/out/<locale>.<chunk>.json`, each made from the English snapshot in `<i18n-dir>/src/<chunk>.json`), and lists what is still untranslated in `todo.<locale>.json`.
3. `json3merge.py BASE OURS THEIRS`: a three-way JSON merge driver for `messages/*.json`, so parallel branches that add different namespaces merge without conflicts. Register it locally with
   `git config merge.json3.driver "python3 scripts/i18n/json3merge.py %O %A %B"` and `echo "messages/*.json merge=json3" >> .git/info/attributes`.

The flow: snapshot the English keys that changed since `main` into chunks, translate each chunk per locale with the validator, merge, run `src/i18n/messages.test.ts`.
