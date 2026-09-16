# convex/

The backend: schema, queries, mutations, actions and scheduled functions.

## First run

```bash
npx convex dev
```

That creates a dev deployment, writes `NEXT_PUBLIC_CONVEX_URL` and
`CONVEX_DEPLOYMENT` into `.env.local`, and generates `convex/_generated/`.

`_generated/` is **gitignored**. Until you have run the command above it does
not exist — which is why no application code imports from it yet. A fresh clone
must still typecheck and build.

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
npx convex deploy --cmd 'npm run build'
```

Schema first, then the app that depends on it. New required fields land in three
steps: optional → backfill → required.
