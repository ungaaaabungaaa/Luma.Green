# Changing the schema safely

Convex checks every existing document against the new schema when you deploy.
If any document doesn't match, the deploy fails — and on Vercel, so does the
production build. So a schema change that meets existing data happens in
steps, and each one is recorded here.

## Until the first real row

The founder-approved [full prototype reset](./2026-10-06-full-prototype-reset.md)
left development and production at zero tables and rows on 6 October 2026.
The refined schema can start from that empty state. From the first new row
onwards, the steps below apply.

## The three steps

1. **Widen.** Add the field as `v.optional(...)` (or widen a union), and make the
   code handle both shapes. Deploy.
2. **Migrate.** Backfill existing documents with the migrations component —
   batched, resumable, safe while the app runs:

   ```ts
   // convex/convex.config.ts
   app.use(migrations);

   // convex/migrations.ts
   export const migrations = new Migrations(components.migrations, { schema });
   export const setOrgKind = migrations.define({
     table: "orgs",
     migrateOne: async (ctx, org) => {
       if (org.kind === undefined)
         await ctx.db.patch(org._id, { kind: "kabadiwala" });
     },
   });
   export const runAll = migrations.runner([internal.migrations.setOrgKind]);
   ```

   Run it: `npx convex run migrations:runAll --prod`.

3. **Narrow.** Make the field required (or drop the old one). This deploy only
   succeeds once every document matches.

**Never rename a field in place.** Add the new one, migrate, then drop the old
one in a later pull request.

**Big indexes:** adding an index to a large table blocks the deploy until it's
built. Mark it `staged: true` first, then enable it in a later deploy.

## Before running a migration on production

- [ ] Took a manual backup in the Convex dashboard ([backups.md](../operations/backups.md)).
- [ ] Ran it on the dev deployment with realistic data first.
- [ ] The migration is idempotent: running it twice changes nothing.
- [ ] Wrote the log entry below.

## Log

One file per migration: `docs/migrations/YYYY-MM-DD-short-name.md`, with what
changed, why, the three steps and when each ran, and how to verify. Newest at
the bottom:

| Date       | Migration                                                       | Status                                              |
| ---------- | --------------------------------------------------------------- | --------------------------------------------------- |
| 2 Oct 2026 | [Industry API credential storage](./2026-10-02-industry-api.md) | Deployed to dev and prod; live acceptance separate  |
| 3 Oct 2026 | [Push session binding](./2026-10-03-push-session-binding.md)    | Deployed to dev and prod; live acceptance separate  |
| 6 Oct 2026 | [Full prototype reset](./2026-10-06-full-prototype-reset.md)    | Completed in dev and prod; both paused at zero rows |
