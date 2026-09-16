# convex/

The backend: schema, queries, mutations, actions and scheduled functions.

## Deployments

The project is live: team `syed-abdul-muqeeth`, project `luma-green`. The
schema in this folder is deployed to the dev deployment
`glorious-rooster-470` (EU West 1).

## First run on a new machine

```bash
pnpm convex:dev
```

That links your machine to the project, writes `CONVEX_DEPLOYMENT`,
`NEXT_PUBLIC_CONVEX_URL` and `NEXT_PUBLIC_CONVEX_SITE_URL` into `.env.local`
(gitignored), regenerates `convex/_generated/`, and pushes the schema.

`convex/_generated/` **is committed**. It is generated code, but committing it
keeps CI hermetic: `pnpm typecheck` works on a fresh clone without a Convex
deploy key. Re-run `pnpm convex:dev` after any schema change and commit the
regenerated files with it.

## Layout

```
schema.ts     the data model — read this first
_generated/   created by `convex dev`, never committed, never edited
```

Domain files land alongside as features arrive: `inventory.ts`, `listings.ts`,
`trades.ts`, `credits.ts`, `orgs.ts`.

## Rules

See `.claude/skills/convex-data/SKILL.md` for the full playbook. The short
version:

- Integer paise for money, integer grams for mass. Never floats.
- Every query goes through an index and is bounded (`.take()` / `.paginate()`).
- Authorise the caller's org inside the function, before reading or writing.
- Auditable state changes write an `auditLog` row in the same mutation.
- Inventory changes always write an `inventoryMovements` row.
- Issued carbon credits keep the factor they were issued with, forever.

## Deploying

Production deploys with the frontend build:

```bash
pnpm convex:deploy --cmd 'pnpm build'
```

Schema first, then the app that depends on it. New required fields land in three
steps: optional → backfill → required.
