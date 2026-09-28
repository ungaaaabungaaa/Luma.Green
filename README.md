<p align="center">
  <img src="public/logo.svg" width="96" height="96" alt="Luma.Green" />
</p>

<h1 align="center">Luma.Green</h1>

<p align="center"><strong>Cleaner Tomorrow in Motion</strong></p>

<p align="center">
  One platform for the whole recycling chain — households, kabadiwalas, yards,
  recyclers and manufacturers. Sell scrap in three taps, see the latest prices,
  and trace every kilogram from the first pickup to the factory.
</p>

---

## Status

Building towards a pilot in Bengaluru, October 2026. The public site, the stack,
the design system, the 12-locale i18n layer and the CI gate are live; onboarding,
the household flow and the kabadiwala app are next. The plan and every decision
behind it are in [docs/](docs/README.md).

## Quick start

```bash
corepack enable          # pnpm 11, pinned in package.json
pnpm install
cp .env.example .env.local
pnpm convex:dev          # links this machine to the Convex project
pnpm dev                 # http://localhost:3000
```

Convex aside, nothing external is required to run, test or build — every other
service switches itself on when its key appears in `.env.local`.

## Stack

Next.js 16 (App Router) · TypeScript · Tailwind v4 · shadcn/ui · Convex ·
next-intl · Zod · React Hook Form · TanStack Query · Vitest · Playwright ·
PostHog · Sentry · Vercel — on **pnpm 11**

## Commands

```bash
pnpm dev            # dev server
pnpm check          # lint + typecheck + unit tests
pnpm test           # unit tests
pnpm e2e            # Playwright (build first when CI=1)
pnpm build          # production build
pnpm convex:dev     # Convex dev deployment + codegen
```

## Languages

Twelve locales ship from day one — English, हिन्दी, বাংলা, मराठी, தமிழ், తెలుగు,
ಕನ್ನಡ, മലയാളം, ગુજરાતી, ਪੰਜਾਬੀ, اردو and العربية — with Urdu and Arabic
right-to-left. Typography is Noto throughout so the interface keeps one texture
across every script.

Non-English copy is machine-drafted and awaiting native review.

## Repository map

```
src/app/[locale]/   routes, one locale segment for every page
src/components/     ui/ (shadcn primitives), brand/, providers/
src/i18n/           locale registry, routing, request config
src/lib/            env, fonts, site constants
convex/             schema and server functions
messages/           one JSON file per locale
e2e/                Playwright specs
docs/               product plan, architecture, decisions, operations
.claude/skills/     task playbooks for agents and humans
ios/ · android/     placeholders for the Expo apps
```

## Contributing

Read **[AGENTS.md](./AGENTS.md)** first — it is the source of truth for how code
is written here, and the index of the playbooks in `.claude/skills/`. Then
[CONTRIBUTING.md](./CONTRIBUTING.md) for the branch-to-merge workflow.

Every PR runs Lint, Format, Typecheck, Unit tests and Build; E2E runs when app
code changes. Red checks don't merge.

## License

UNLICENSED — all rights reserved.
