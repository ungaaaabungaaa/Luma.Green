# 0003. One Next.js app, areas as route groups

- **Status:** Decided
- **Date:** 29 Sep 2026
- **Deciders:** founder, Claude

## Context

Seven kinds of user, from a household on a first smartphone to one admin on a
laptop, and one small team. The repo already runs Next.js 16 on Vercel with 12
locales.

## Decision

One Next.js application serves everyone. Each area is a route group with its
own layout, sign-in rule and indexing rule:

`(site)` public pages · `(household)` the selling flow · `(auth)` sign-in ·
`(join)` onboarding · `(app)` business dashboards · `admin/` the console.

All areas share one origin (`luma.green`), one design system and one Convex
backend. The admin console sits **outside** the locale segment with its own
root layout — English only, for one operator — and the locale proxy skips it.

## Consequences

- One deploy, one codebase, shared components and translations.
- The admin console's copy is the one documented exception to "every string in
  `messages/`": it is English-only and lives in `src/app/admin/`.
- Route groups must each set their own indexing rule
  ([URLs](../architecture/urls.md)).
- Splitting an area into its own app later (say, admin on its own subdomain) is
  a routing change, not a rewrite.

## Alternatives considered

- **Separate apps per audience** — duplicated auth, design system and
  translations for no pilot benefit.
- **Subdomains now (`admin.luma.green`, `app.luma.green`)** — cross-subdomain
  cookies and DNS work before we need the isolation.
