---
name: convex-data
description: Working with the Convex backend — schema changes, queries and mutations, indexes, authorisation, the audit log, integer money/mass rules and migrations. Use when touching convex/, adding a table or field, or writing a server function.
---

# Convex data

`convex/schema.ts` is the contract. Read it before changing anything — the
tables encode rules that are expensive to fix later.

## The invariants

**Integers only for money and mass.** Money is paise (`totalPaise`), mass is
grams (`quantityGrams`), carbon is kg CO₂e. A float in either column is a
compliance bug, not a rounding nit. Convert and format at the render edge only.

**Inventory is derived.** `inventoryMovements` is append-only and authoritative;
the `inventory` row is a cached sum. Never adjust `inventory` without writing
the matching movement in the same mutation.

**Issued credits are frozen.** `carbonCredits.factorUsed` stores the emission
factor at issuance. Updating `materials.co2eFactorPerKg` must never restate an
existing credit — new factor applies to new issuances only.

**Everything auditable is audited.** Any state change a regulator could ask
about writes an `auditLog` row in the same mutation: `trade.settled`,
`credit.issued`, `credit.retired`, `inventory.adjusted`.

**Sector isolation.** An org sees only its own data and only listings in its own
sector. Enforce this in the function, not in the UI.

## Getting started

```bash
npm run convex:dev     # creates the dev deployment and convex/_generated
```

`convex/_generated` does not exist until that runs, and it is gitignored. **Do
not import from `convex/_generated` until you have run it** — a fresh clone must
still typecheck.

## Writing functions

One file per domain: `convex/trades.ts`, `convex/inventory.ts`,
`convex/credits.ts`. Always use the new function syntax with explicit
validators:

```ts
export const settle = mutation({
  args: { tradeId: v.id("trades") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    // 1. load, 2. authorise, 3. validate the transition, 4. write,
    // 5. write the audit row — in that order, in one mutation.
  },
});
```

- `query` for reads, `mutation` for writes, `action` only when you need
  `fetch`/Node APIs (payments, email, AI). Actions cannot touch the database
  directly — they call mutations.
- Use `internalQuery`/`internalMutation` for anything the client must not call.
- Always declare `returns`. An unvalidated return shape drifts silently.

## Indexes

Every query filters through an index — never `.filter()` over a full table.

```ts
await ctx.db
  .query("listings")
  .withIndex("by_material_status", (q) =>
    q.eq("materialId", args.materialId).eq("status", "open"),
  )
  .take(50);
```

Index names describe their fields (`by_org_material`), and fields are listed in
query order. Adding a field to an existing index changes its meaning — add a new
index instead.

Always bound a query: `.take(n)` or `.paginate()`. An unbounded query works
beautifully with 20 rows and takes the app down at 200,000.

## State transitions

Listings and trades are state machines. Validate the transition explicitly and
throw on an illegal one:

```ts
if (trade.status !== "delivered") {
  throw new Error(`Cannot settle a trade in state ${trade.status}`);
}
```

Test the impossible transitions — that is where money goes missing.

## Schema changes

Convex schemas are enforced on write. To add a required field to a table that
already has rows:

1. Add it as `v.optional(...)` and deploy.
2. Backfill existing rows with an `internalMutation`, batched with pagination.
3. Make it required in a second deploy.

Never rename a field in place — add the new one, migrate, then drop the old one
in a later PR. Write down what you did in `docs/migrations/`.

## Scheduling

Use Convex scheduled functions (`ctx.scheduler`) and crons for recurring work —
settlement sweeps, credit expiry, digest emails. Prefer them over an external
scheduler; they run in the same transactional world as the data.

## Testing

Use `convex-test` against the real schema. Cover: the happy path, each illegal
transition, and the authorisation boundary (org A must not read org B). See
`.claude/skills/testing`.
