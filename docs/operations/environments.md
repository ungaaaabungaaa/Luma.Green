# Environments

> **Status:** decided, 29 Sep 2026 —
> [ADR 0002](../decisions/0002-convex-as-the-backend.md). Facts about Convex
> checked against docs.convex.dev on the same day.

Three environments, three sets of credentials. A key from one never appears in
another.

| Environment    | Frontend                                                              | Backend (Convex)                                                                                          | Data               | Deployed by                                                        |
| -------------- | --------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- | ------------------ | ------------------------------------------------------------------ |
| **Local**      | `pnpm dev` on your machine (`localhost:3000`)                         | The **dev** deployment `glorious-rooster-470` (EU West), via `pnpm convex:dev`                            | Test data          | You                                                                |
| **Preview**    | A Vercel URL per pull request                                         | A Convex **preview** deployment per branch — free, beta, deleted after 5 days, starts empty and is seeded | Seeded sample data | The Vercel build, automatically                                    |
| **Production** | `lumagreen.vercel.app` today; `luma.green` once the domain is pointed | The Convex **prod** deployment                                                                            | Real data          | Merging to `main` (Vercel runs `convex deploy`, then `next build`) |

## Rules

- **Nothing indexes but production.** `src/app/robots.ts` blocks all crawling
  unless `VERCEL_ENV === "production"`.
- **Test keys never reach production; live keys never reach local.** For MSG91
  that means separate templates and keys; for Convex, separate deploy keys.
- **Never put a production deploy key in `.env.local`.** The Convex CLI reads it
  from there, and every command after that runs against production.
- **CI has no application secrets.** Checks pass with an empty `.env`.
- **Every variable is optional.** A feature switches itself off when its key is
  absent — which is why a fresh clone, CI and a half-configured deploy all work.
- **Test phone numbers with fixed codes exist only on dev and preview
  deployments.**

## Local setup

```bash
cp .env.example .env.local
pnpm convex:dev          # links this machine to the dev deployment, writes .env.local
pnpm dev
```

No other account is needed to work on the UI, i18n, or anything that doesn't
talk to a third party.

## How a change reaches production

1. Open a pull request. CI runs Lint, Format, Typecheck, Unit tests and Build;
   Vercel builds a preview with its own Convex preview backend.
2. When every check is green, squash-merge to `main` (the founder's standing
   instruction: straight to production).
3. Vercel's production build runs `npx convex deploy --cmd 'pnpm build'`:
   Convex checks the new schema against existing data, pushes the functions,
   then runs `next build` with `NEXT_PUBLIC_CONVEX_URL` injected.
4. If the schema check fails, the build fails and production stays on the
   previous version — fix forward with a widen → migrate → narrow change
   ([migrations](../migrations/README.md)).
5. Open the production URL and walk the changed flow once.

The build command lives in the repo (`vercel.json` → `scripts/vercel-build.sh`)
and falls back to a plain `pnpm build` when no deploy key is set.

## One-time switch-on (founder)

As of 29 Sep 2026 production builds don't deploy Convex yet and the Convex
variables in Vercel are placeholders. To switch on:

1. **Production deploy key.** Convex dashboard → the prod deployment → Settings
   → generate a production deploy key with deploy permission. In Vercel →
   Settings → Environment Variables, set `CONVEX_DEPLOY_KEY` to it for
   **Production only**.
2. **Preview deploy key.** Convex dashboard → project Settings → generate a
   preview deploy key. Set `CONVEX_DEPLOY_KEY` to it for **Preview only**.
   (The CLI refuses to deploy a production key from a non-production build, so
   a mix-up fails safely — but fails the build.)
3. **Remove from Vercel** `NEXT_PUBLIC_CONVEX_URL` and `CONVEX_DEPLOYMENT`; the
   build injects the URL itself.
4. **Convex prod variables** (dashboard or `npx convex env set --prod …`):
   `SITE_URL`, `BETTER_AUTH_SECRET` (a fresh `openssl rand -base64 32`), and the
   MSG91 values once DLT templates are approved.
5. **Domain.** Vercel → Domains: add `luma.green` and `www.luma.green`
   (redirect `www` → apex), set the DNS records Vercel shows at the registrar,
   then set `NEXT_PUBLIC_SITE_URL=https://luma.green` for Production and
   update `SITE_URL` on the Convex prod deployment.
6. **Admin account.** `npx convex run --prod identity:bootstrapAdmin` once the
   auth code is merged — see [architecture/auth.md](../architecture/auth.md#the-admin).

## Where each variable lives

| Variable                                                                         | Next.js on Vercel                                  | Convex deployment          | Notes                                                      |
| -------------------------------------------------------------------------------- | -------------------------------------------------- | -------------------------- | ---------------------------------------------------------- |
| `NEXT_PUBLIC_SITE_URL`                                                           | Production: `https://luma.green`                   | —                          | Canonical URLs                                             |
| `NEXT_PUBLIC_CONVEX_URL`, `NEXT_PUBLIC_CONVEX_SITE_URL`                          | Injected by `convex deploy`; local `.env.local`    | —                          | Don't set by hand on Vercel                                |
| `CONVEX_DEPLOY_KEY`                                                              | Production key → Production; preview key → Preview | —                          | Never in `.env.local`                                      |
| `CONVEX_DEPLOYMENT`                                                              | —                                                  | —                          | Local `.env.local` only                                    |
| `SITE_URL`                                                                       | —                                                  | Every deployment           | The site origin Better Auth trusts                         |
| `BETTER_AUTH_SECRET`                                                             | —                                                  | Every deployment           | Different per deployment                                   |
| `MSG91_AUTH_KEY`, `MSG91_SENDER_ID`, `MSG91_OTP_TEMPLATE_ID`, other template ids | —                                                  | Prod (and dev for testing) | DLT-approved ids only                                      |
| `AUTH_TEST_PHONES`                                                               | —                                                  | Dev and preview only       | Test numbers with fixed codes; never on prod               |
| `OPENROUTER_API_KEY`                                                             | —                                                  | Every deployment           | Hard spend limit on each key                               |
| `NEXT_PUBLIC_MAPBOX_TOKEN`                                                       | Production and Preview                             | —                          | Restricted to our URLs in the Mapbox dashboard             |
| PostHog, Sentry                                                                  | Empty until the partner decision                   | —                          | [ADR 0012](../decisions/0012-pilot-analytics-in-convex.md) |
| Razorpay, Resend, R2                                                             | Later                                              | Later                      | Not used in the pilot                                      |

Values live in the password manager, never in chat, email or the repo.

## Backups and incidents

- Backups and restores: [backups.md](./backups.md).
- When something breaks: [incidents.md](./incidents.md).
