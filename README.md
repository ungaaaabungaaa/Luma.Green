<p align="center">
  <img src="public/logo.svg" width="96" height="96" alt="Luma.Green" />
</p>

<h1 align="center">Luma.Green</h1>

<p align="center"><strong>Cleaner Tomorrow in Motion</strong></p>

<p align="center">
  One ledger for everyone in a recycling sector — collectors, aggregators,
  recyclers, factories and verifiers. Manage inventory, trade recovered
  material, and settle verified carbon credits in one place.
</p>

---

## Status

Early scaffold. The stack, the design system, the 12-locale i18n layer, the data
model and the CI gate are in place. Product surfaces are not — the only route
today is a placeholder that renders the mark and the tagline.

## Quick start

```bash
npm install
cp .env.example .env.local   # every var is optional to start
npm run dev                  # http://localhost:3000
```

Nothing external is required to run, test or build. Features switch on as keys
appear in `.env.local`.

## Stack

Next.js 16 (App Router) · TypeScript · Tailwind v4 · shadcn/ui · Convex ·
next-intl · Zod · React Hook Form · TanStack Query · Vitest · Playwright ·
PostHog · Sentry · Vercel

## Commands

```bash
npm run dev            # dev server
npm run check          # lint + typecheck + unit tests
npm run test           # unit tests
npm run e2e            # Playwright (build first when CI=1)
npm run build          # production build
npm run convex:dev     # Convex dev deployment + codegen
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
docs/               architecture, environments, service accounts
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
