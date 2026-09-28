# AGENTS.md — Luma.Green

**Cleaner Tomorrow in Motion.**

This file is the single source of truth for how code gets written in this repo.
Every agent (Claude Code, CodeRabbit, Copilot, a human on their first day) reads
this first. `CLAUDE.md` just points here.

Detailed, task-specific playbooks live in `.claude/skills/*/SKILL.md`. This file
tells you what the project is and the rules that always apply; a skill tells you
how to do one job well.

---

## 1. What we are building

Luma.Green connects the whole recycling chain on one platform: **households**
who sell scrap, **kabadiwalas** (local scrap shops) who collect it,
**preprocessors** (yards) who sort it further, **recyclers** who turn it into raw
material and **manufacturers** who buy that material — plus **Saathis**, people
who take pickup and sorting jobs. One **admin** verifies everyone. The pilot runs
in Bengaluru in October 2026.

1. **Recover** — a household books a pickup; the kabadiwala weighs and records it.
2. **Trade** — material moves up the chain, re-sorted at every step, visible by
   location and material.
3. **Retire** (later) — recorded material mints carbon credits, which are
   verified, held, traded and finally retired.

The plan, the decisions behind it and the runbooks live in `docs/` — start at
[docs/README.md](docs/README.md) before designing a feature.

Three properties follow from that and are non-negotiable:

- **The ledger must be auditable.** A regulator may ask how any credit was
  produced. Every state change writes to `auditLog`.
- **Numbers must be exact.** Money is integer **paise**, mass is integer
  **grams**, CO₂e is **kg**. No floats for money or mass, ever.
- **Issued credits are frozen.** A credit stores the emission factor used at
  issuance (`factorUsed`). Revising a factor later never restates a credit that
  is already issued.

## 2. Stack

| Layer       | Choice                               | Notes                                              |
| ----------- | ------------------------------------ | -------------------------------------------------- |
| Framework   | Next.js 16 (App Router, Turbopack)   | RSC by default; `"use client"` is opt-in           |
| Language    | TypeScript, `strict`                 | No `any`, no `@ts-ignore` without a reason comment |
| UI          | Tailwind v4 + shadcn/ui (Radix)      | Components are vendored in `src/components/ui`     |
| Data        | Convex                               | Dev `glorious-rooster-470` + prod, EU West 1       |
| i18n        | next-intl, 12 locales, RTL-ready     | `messages/*.json`                                  |
| Forms       | React Hook Form + Zod                | Zod schema is the contract, shared client↔server   |
| Server sync | TanStack Query                       | For non-Convex async work                          |
| Auth        | Better Auth on Convex                | Phone codes; admin password + TOTP — see §9        |
| Analytics   | PostHog                              | Deferred — keys stay empty (docs ADR 0012)         |
| Errors      | Sentry                               | Deferred — build only wraps when a DSN exists      |
| Testing     | Vitest + Testing Library, Playwright | See `.claude/skills/testing`                       |
| Packages    | pnpm 11                              | Pinned by `packageManager`; npm/yarn will drift    |
| Lint        | ESLint flat config, type-aware       | See §10                                            |
| Mobile      | Expo / React Native (planned)        | `ios/` and `android/` are placeholders             |

## 3. Layout

```
src/
  app/[locale]/      routes — every page lives under a locale segment
  app/globals.css    design tokens (brand scale + semantic theme)
  components/ui/     shadcn primitives — vendored, edit deliberately
  components/brand/  logo and brand assets
  components/providers/  the one provider stack
  i18n/              locale registry, routing, request config
  lib/               env, fonts, site constants, utils
  proxy.ts           locale negotiation (Next 16's middleware convention)
convex/              schema and server functions
messages/            one JSON file per locale
e2e/                 Playwright specs
docs/                product, architecture, decisions (ADRs), operations,
                     migrations, delivery — start at docs/README.md
.claude/skills/      task playbooks
```

## 4. Rules that always apply

**Never hardcode user-facing copy.** Every string goes in `messages/en.json`
and is read with `useTranslations` / `getTranslations`. A PR that adds English
text to a component is wrong even if it looks fine — see
`.claude/skills/i18n`.

**Never import `next/link` or navigation helpers from `next/navigation`.** Use
`@/i18n/navigation`. ESLint enforces this; the failure it prevents is silent
(links drop the locale) and only shows up for non-English users.

**The one exception is the admin console** (`src/app/admin`,
`src/components/admin`): English only, outside the locale segment, so its copy
lives in the components and it uses Next's own `Link` and router. ESLint
allows this there and nowhere else.

**Never invent colours.** Use semantic tokens (`bg-primary`, `text-muted-foreground`)
or the `brand-*` scale. A raw hex in a component is a bug — see
`.claude/skills/design-system`.

**Never add a component by hand that shadcn already ships.** Run
`pnpm dlx shadcn@latest add <name>`.

**Never commit a secret.** All config goes through `src/lib/env.ts`. Every var
is optional: a fresh clone with an empty `.env` must build, test and run.

**Never widen a type to make an error go away.** Fix the shape.

**Always add tests with the change.** Logic gets a unit test; a user-visible
flow gets an e2e test. See `.claude/skills/testing`.

**Always keep CI green.** `pnpm check` before you push. See
`.claude/skills/ci-checks`.

## 5. Commands

```bash
pnpm dev            # dev server
pnpm check          # lint + typecheck + unit — run before every push
pnpm test           # unit tests
pnpm test:watch     # unit tests, watch mode
pnpm e2e            # Playwright (needs `pnpm build` first when CI=1)
pnpm build          # production build
pnpm format         # prettier --write
pnpm convex:dev     # Convex dev deployment + codegen
```

## 6. Conventions

**Commits** follow Conventional Commits, enforced by commitlint:
`feat(inventory): reserve stock when a trade is accepted`.
Scopes: `app ui i18n convex auth inventory trade carbon seo ci deps docs test mobile infra`.

**Branches**: `feat/short-slug`, `fix/short-slug`, `chore/short-slug`.

**`main` is protected.** Every change — including an agent's — lands through a
PR with the five required checks green. Never try to push to `main` directly; it
will be rejected. The author merges their own PR (solo team, zero approvals), and
merged branches delete themselves.

**Server vs client**: components are server components unless they need state,
effects or browser APIs. Push `"use client"` as far down the tree as possible —
a client boundary at the layout level pulls the whole page into the bundle.

**Data fetching**: Convex `useQuery` for live data. TanStack Query for anything
else async. Never `fetch` in a component body.

**Errors**: throw typed errors from Convex functions; surface them with
`toast.error(t("common.error"))`. Never swallow an error silently.

## 7. Working with money, mass and carbon

```ts
// Right
const totalPaise = (quantityGrams * pricePerKgPaise) / 1000; // integer math
// Wrong
const total = kg * pricePerKg; // float — drifts, and an audit will find it
```

Format at the edge only, with `next-intl`'s `useFormatter`, so currency and
number formatting follow the user's locale.

## 8. Accessibility and RTL

Every feature must work in `/ar` and `/ur`. Use logical properties
(`ms-*`/`me-*`, `ps-*`/`pe-*`, `text-start`/`text-end`) — never `ml-*`/`text-left`.
Every interactive element needs an accessible name. Test keyboard navigation
before calling a flow done.

## 9. Not wired yet (deliberate)

These are installed and configured but intentionally inert until someone owns
them. Don't assume they work; wire them in a focused PR.

Convex **is** wired: the schema is deployed and `convex/_generated` is committed,
so `api` and `Doc`/`Id` types are safe to import today.

Better Auth **is** wired too: phone codes at `/login`, the admin at
`/admin/login` (set up once at `/admin/setup`). Guard every Convex function
with `requireUser` / `requireAdmin` from `convex/lib/access.ts`, and run
`pnpm auth:schema` after changing a Better Auth plugin. Read
`docs/architecture/auth.md` before touching auth.

- **MSG91** — sending code is in place (`convex/sms.ts`); keys wait for DLT
  approval, and the per-number cap in `docs/architecture/auth.md` comes first.
- **Razorpay, Resend, R2, Mapbox, OpenRouter** — packages installed, keys
  absent. Each needs its own PR with its own tests.
- **Expo / React Native** — `ios/` and `android/` are empty placeholders.

## 10. Lint

The config is strict on purpose (`eslint.config.mjs`). Type-aware rules run
against a real TS program, so lint is slower than you may be used to and catches
things a typecheck alone will not.

What it enforces, beyond the obvious:

- **No floating or misused promises.** A dropped `await` in a settlement or
  credit mutation loses money silently. This is the most valuable rule here.
- **No `any`, no `!`.** Fix the shape instead.
- **No `toLocaleString`/`toLocaleDateString`.** Use next-intl's formatter so
  output follows the user's locale.
- **No TS `enum`.** Union of string literals, or a `const` object.
- **Exhaustive switches** over status unions — adding a trade status breaks every
  switch that forgot it.
- **No `next/link`** — locale-aware navigation from `@/i18n/navigation` only.
- **Import order** is auto-fixed; never hand-sort.
- `sonarjs` and `unicorn` on top for bug patterns and dead code.

Lint and typecheck run `next typegen` first: route and root-param types are
generated into `.next/types`, and without them type-aware rules see `any` and
fail — on a fresh clone and in CI, but never on a machine with a stale `.next/`.

`pnpm lint:fix` handles most of it. Relaxations are scoped and commented —
vendored `src/components/ui/**`, the Convex validator DSL, tests, e2e, and root
config files each get a narrow override. If you need a new one, scope it to a
path and write down why.

**Never add a blanket `eslint-disable` for a file.** A single-line disable with a
reason comment is fine when the rule is genuinely wrong — as in `src/proxy.ts`,
where `String.raw` would break Next's static analysis of the matcher.

## 11. Skills

| Skill                          | Use it when                                          |
| ------------------------------ | ---------------------------------------------------- |
| `.claude/skills/testing`       | Writing or changing any code — what to test and how  |
| `.claude/skills/ci-checks`     | A check is red, or you're adding a new one           |
| `.claude/skills/i18n`          | Any user-facing string, or adding a locale           |
| `.claude/skills/design-system` | Building UI — tokens, shadcn, white theme, RTL       |
| `.claude/skills/seo`           | Adding a route, metadata, sitemap or structured data |
| `.claude/skills/convex-data`   | Schema changes, queries, mutations, migrations       |
| `.claude/skills/ship-pr`       | Opening a PR or preparing a deployment               |
