# 0013. Backups: Convex plus a daily local export

- **Status:** Decided
- **Date:** 29 Sep 2026
- **Deciders:** founder, Claude

## Context

The founder wants daily local backups. On Convex's free plan, scheduled
backups are a paid feature; manual dashboard backups are kept 7 days, two at a
time. Every export reads every document, and file exports count against the
1 GB monthly egress.

## Decision

- **Daily:** the founder's Mac runs `npx convex export --prod` (data only) at
  02:30 IST and keeps 14 dailies.
- **Weekly:** the same with `--include-file-storage`, kept 8 weeks, and copied
  encrypted off the machine.
- **Before any risky deploy or migration:** a manual Convex dashboard backup.
- **Monthly:** restore the latest weekly into the dev deployment and check it.
- Move to Convex Pro's daily scheduled backups when revenue or data volume
  justifies it.
- Runbook: [operations/backups.md](../operations/backups.md).

## Consequences

- At most 24 hours of data at risk (files: 7 days until the weekly runs daily).
- Backups hold personal data; they live on an encrypted disk and expire by the
  retention schedule.
- Watch database I/O on the Convex usage page as data grows.

## Alternatives considered

- **Only Convex's own backups** — not daily on the free plan, and not in our
  hands.
- **Daily exports with files** — would use up the free egress quickly once
  photos accumulate.
