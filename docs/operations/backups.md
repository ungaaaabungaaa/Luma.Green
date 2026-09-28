# Backups and restore

> **Status:** decided, 29 Sep 2026 —
> [ADR 0013](../decisions/0013-backups-convex-plus-daily-local.md). Convex facts
> checked against docs.convex.dev the same day.

## Targets for the pilot

| Target                 | Value                                         |
| ---------------------- | --------------------------------------------- |
| Data we can lose (RPO) | 24 hours of records; 7 days of uploaded files |
| Time to be back (RTO)  | 4 hours                                       |
| Proof it works         | A restore drill every month, logged below     |

## What gets backed up, and how

| What                                                       | How                                                     | Where                                   | Kept                                       |
| ---------------------------------------------------------- | ------------------------------------------------------- | --------------------------------------- | ------------------------------------------ |
| Convex prod **data** (all tables, including Better Auth's) | Daily `convex export`, data only                        | Founder's Mac                           | 14 days                                    |
| Convex prod **data + files** (photos, PDFs, IDs)           | Weekly (Sundays) `convex export --include-file-storage` | Founder's Mac + encrypted off-site copy | 8 weeks; first of each month for 12 months |
| Before a risky deploy or migration                         | Manual backup in the Convex dashboard                   | Convex                                  | 7 days (free plan keeps 2)                 |
| Code                                                       | GitHub, plus every clone                                | GitHub                                  | Forever                                    |
| Environment variable **values**                            | Password manager                                        | 1Password / Bitwarden                   | Current                                    |
| Vercel and Convex **settings**                             | Written down in [environments.md](./environments.md)    | This repo                               | Current                                    |

**Not in a Convex backup:** code, environment variables, and scheduled
functions that haven't run yet. That's why the other rows exist.

### Why data daily but files weekly

On the free plan every export reads every document (counted against 1 GB of
database I/O a month) and file exports count against 1 GB of egress. At pilot
size a daily data export costs a few megabytes; daily file exports would use up
the egress allowance once photos pile up. Check **Usage** in the Convex
dashboard monthly; when data passes ~20 MB or files ~200 MB, move to Convex Pro,
whose daily scheduled backups replace most of this.

## Daily local backup — setup (once, on the founder's Mac)

1. **Access.** Either stay signed in to the Convex CLI (`npx convex login`) as a
   project admin, or — better — create a deploy key for the **prod** deployment
   with only the _create backups_ and _download backups_ permissions and keep it
   in the macOS Keychain:

   ```bash
   security add-generic-password -s luma-green-backup -a convex -w   # paste the key when asked
   ```

2. **The script** — save as `~/LumaGreenBackups/export.sh` and `chmod +x` it:

   ```bash
   #!/usr/bin/env bash
   # Luma.Green: export Convex production. Daily = data; Sunday = data + files.
   set -euo pipefail
   REPO="$HOME/Developer/Luma.Green"        # needs package.json listing convex
   DEST="$HOME/LumaGreenBackups"
   STAMP="$(date +%Y-%m-%d)"
   KIND=daily; FLAGS=()
   if [ "$(date +%u)" = 7 ]; then KIND=weekly; FLAGS+=(--include-file-storage); fi

   if KEY="$(security find-generic-password -s luma-green-backup -w 2>/dev/null)"; then
     export CONVEX_DEPLOY_KEY="$KEY"      # key is tied to prod; overrides --prod
   fi

   OUT="$DEST/$KIND/$STAMP"
   mkdir -p "$OUT"
   cd "$REPO"
   npx convex export --prod --path "$OUT" "${FLAGS[@]}"

   ZIP="$(ls -1 "$OUT"/*.zip | head -n 1)"
   unzip -tq "$ZIP"                          # fails loudly on a corrupt archive
   shasum -a 256 "$ZIP" > "$ZIP.sha256"

   # First Sunday of the month: keep a monthly copy.
   if [ "$KIND" = weekly ] && [ "$(date +%d)" -le 7 ]; then
     mkdir -p "$DEST/monthly"; cp -R "$OUT" "$DEST/monthly/$STAMP"
   fi

   prune() { ls -1dt "$1"/*/ 2>/dev/null | tail -n +"$(( $2 + 1 ))" | while read -r d; do rm -rf "$d"; done; }
   prune "$DEST/daily" 14; prune "$DEST/weekly" 8; prune "$DEST/monthly" 12

   echo "$(date -u +%FT%TZ) ok $KIND $ZIP" >> "$DEST/backup.log"
   ```

3. **Schedule it** at 02:30 every night — save as
   `~/Library/LaunchAgents/green.luma.backup.plist`, then
   `launchctl load ~/Library/LaunchAgents/green.luma.backup.plist`:

   ```xml
   <?xml version="1.0" encoding="UTF-8"?>
   <!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
   <plist version="1.0">
   <dict>
     <key>Label</key><string>green.luma.backup</string>
     <key>ProgramArguments</key>
     <array><string>/bin/bash</string><string>-lc</string><string>$HOME/LumaGreenBackups/export.sh</string></array>
     <key>StartCalendarInterval</key>
     <dict><key>Hour</key><integer>2</integer><key>Minute</key><integer>30</integer></dict>
     <key>StandardOutPath</key><string>/tmp/luma-green-backup.log</string>
     <key>StandardErrorPath</key><string>/tmp/luma-green-backup.err</string>
   </dict>
   </plist>
   ```

   A Mac that's asleep at 02:30 runs the job when it wakes; one that's switched
   off skips that day. Check `~/LumaGreenBackups/backup.log` each morning — no
   line for today means no backup.

4. **Protect it.** FileVault on. Each Sunday, copy that week's folder to an
   off-site location (Google Drive or an R2 bucket) **encrypted** — for example
   with [`age`](https://github.com/FiloSottile/age) to a key whose private half
   is stored offline.

## Restore

### Monthly drill (into dev)

1. Pick the latest weekly archive.
2. `npx convex import --replace-all -y <path-to-zip>` — with no flag it targets
   the **dev** deployment, and `--replace-all` wipes dev first.
3. Check: row counts per table look right; the admin can sign in; an
   application's documents open.
4. Record it in the log below. A backup that has never been restored is a
   hypothesis.

### Production disaster

1. Stop the damage: switch the `maintenance` flag on (read-only mode) or roll the
   frontend back in Vercel.
2. Take a manual backup of the current state in the Convex dashboard, even if
   it's broken — you may need something from it.
3. Choose the restore point (the latest good daily; the latest weekly for
   files).
4. `npx convex import --prod --replace-all -y <path-to-zip>` — Convex import is
   still beta; `--replace` would only replace the tables in the file, and
   `--append` is not atomic.
5. Re-run anything scheduled that was lost; re-check the environment variables.
6. Verify, switch the flag off, and write it up ([incidents.md](./incidents.md)).

### One wrong record

Don't restore. Fix it with a new row (a correcting stock movement, a new price
row, a note on the application) written by an internal mutation, so the audit
trail stays true.

## Personal data in backups

Backups contain phone numbers, addresses, business documents and Saathi IDs.
They stay on encrypted disks, only the founder can open them, and they expire
on the schedule above. When someone asks us to delete their data, it goes from
production at once; copies in backups age out within 12 months — the privacy
notice says so ([data-protection.md](./data-protection.md)).

## Drill log

| Date | Archive restored | Result | Notes |
| ---- | ---------------- | ------ | ----- |
|      |                  |        |       |
