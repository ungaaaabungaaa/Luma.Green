# 0002. Convex is the backend, with dev and prod deployments

- **Status:** Decided
- **Date:** 29 Sep 2026
- **Deciders:** founder, Claude

## Context

- The pilot must be live in 2–3 weeks, built by one to three people.
- The founder chose Convex: free to start, easy to manage, good AI tooling, and
  the plan is to stay on it for the coming year.
- The platform needs a transactional database, live updates (a kabadiwala sees
  a new request instantly), file uploads, scheduled jobs (dispatch timeouts,
  SLA flags) and webhooks.
- Free plan facts (checked 29 Sep 2026, docs.convex.dev): 1M function calls,
  0.5 GB database, 1 GB file storage (including backups), 1 GB database I/O and
  1 GB egress a month; preview deployments included; scheduled backups, custom
  domains and log streams need Pro. Regions: US East or EU West only.

## Decision

Convex is the system of record and the only backend.

- One Convex project, **`luma-green`**, with a **dev** deployment
  (`glorious-rooster-470`, EU West) for local work, a **prod** deployment for
  the live site, and short-lived **preview** deployments per pull request.
- All business logic lives in Convex functions, organised as modules that own
  their tables ([overview](../architecture/overview.md#modules)).
- Outside services are called only from Convex actions.
- Production deploys through the Vercel build: `npx convex deploy --cmd 'pnpm build'`
  with a production deploy key scoped to Vercel's Production environment only.

## Consequences

- No servers to run; live queries and transactions come for free.
- Vendor lock-in is real. Mitigations: schema and functions are code in this
  repo; daily exports in Convex's open ZIP/JSONL format
  ([ADR 0013](./0013-backups-convex-plus-daily-local.md)); the backend is open
  source and can be self-hosted.
- Data is stored in Ireland; there is no Indian region. The privacy notice says
  so ([data protection](../operations/data-protection.md)).
- Watch the free-plan meters — database I/O is the first to bite if daily
  backups include files. Move to Pro before a meter is hit.

## Alternatives considered

- **Postgres (Supabase or Neon) + an API layer** — more moving parts to build
  and run for live updates, jobs and file storage.
- **Firebase** — weaker transactions and relational queries for a ledger that
  must add up.
