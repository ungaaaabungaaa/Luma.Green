# Services & accounts

What is wired in code, and what still needs a human with a credit card. Keep
this file current — it is the answer to "is X set up?".

Legend: **✅ in repo** (code is here, no account needed) · **🔑 needs account**
(package/config ready, waiting on credentials) · **⬜ not started**

## Core platform

| Service           | Status           | Notes                                                     |
| ----------------- | ---------------- | --------------------------------------------------------- |
| Next.js 16        | ✅ in repo       | App Router, Turbopack, RSC by default                     |
| TypeScript        | ✅ in repo       | `strict`, `pnpm typecheck` in CI                          |
| Tailwind v4       | ✅ in repo       | Tokens + brand scale in `src/app/globals.css`             |
| shadcn/ui         | ✅ in repo       | 21 primitives vendored, RTL enabled                       |
| next-intl         | ✅ in repo       | 12 locales, hreflang, RTL                                 |
| Zod               | ✅ in repo       | Env validation today; form/API contracts next             |
| React Hook Form   | ✅ in repo       | Installed; used once forms land                           |
| TanStack Query    | ✅ in repo       | Provider mounted                                          |
| Convex            | ✅ in repo       | Live: `glorious-rooster-470` (EU West 1), schema deployed |
| Vercel            | 🔑 needs account | Import the repo; set env vars per environment             |
| Domain luma.green | 🔑 needs account | Point DNS at Vercel; add to Cloudflare                    |
| GitHub            | ✅ in repo       | Actions, Dependabot, templates, CODEOWNERS                |
| pnpm 11           | ✅ in repo       | Pinned via `packageManager`; install scripts allowlisted  |
| ESLint (strict)   | ✅ in repo       | Type-aware + sonarjs + unicorn + a11y + house rules       |

## Product services

| Service       | Status           | Notes                                                        |
| ------------- | ---------------- | ------------------------------------------------------------ |
| Better Auth   | 🔑 needs account | Installed, **not wired**. Pick the Convex adapter first      |
| PostHog       | 🔑 needs account | Provider is a no-op without `NEXT_PUBLIC_POSTHOG_KEY`        |
| Sentry        | 🔑 needs account | Build only wraps when `NEXT_PUBLIC_SENTRY_DSN` is set        |
| Resend        | 🔑 needs account | Installed; verify the sending domain before first send       |
| MSG91 (OTP)   | 🔑 needs account | Indian OTP. Exotel is the fallback if delivery is poor       |
| Razorpay      | 🔑 needs account | Test keys first. Webhook signature verification is mandatory |
| Cloudflare R2 | 🔑 needs account | Object storage + backup bucket                               |
| Mapbox        | 🔑 needs account | Restrict the public token by URL before shipping             |
| OpenRouter    | 🔑 needs account | **Set a hard spend limit on the key before it leaves local** |
| CodeRabbit    | 🔑 needs account | `.coderabbit.yaml` is committed; install the GitHub app      |

## Mobile

| Item                     | Status     | Notes                                      |
| ------------------------ | ---------- | ------------------------------------------ |
| `ios/` and `android/`    | ✅ in repo | Empty placeholders, by design              |
| Expo + React Native      | ⬜         | Decide bare vs. managed before scaffolding |
| EAS (build service)      | ⬜         | Needs an Expo account                      |
| Apple Developer          | ⬜         | ~99 USD/yr, 1–2 days to approve            |
| Google Play Console      | ⬜         | One-time 25 USD                            |
| Firebase Cloud Messaging | ⬜         | Push notifications                         |

## Operations

| Item                        | Status     | Notes                                                |
| --------------------------- | ---------- | ---------------------------------------------------- |
| GitHub Actions CI           | ✅ in repo | 5 checks + E2E on app changes                        |
| Branch protection on `main` | ✅         | 5 required checks, PR-only (admins too), 0 approvals |
| Dependabot                  | ✅ in repo | Grouped weekly npm, monthly actions                  |
| Playwright                  | ✅ in repo | Chromium, PR-only                                    |
| Vitest                      | ✅ in repo | Unit + i18n parity                                   |
| Husky + lint-staged         | ✅ in repo | pre-commit, commit-msg, pre-push                     |
| Uptime monitoring           | ⬜         | UptimeRobot or Better Stack, once there's a URL      |
| Status page                 | ⬜         | After launch                                         |
| Backups                     | ⬜         | Convex export → R2, weekly; test a restore monthly   |

## Setup order (what to do next)

1. ~~**Convex**~~ — done. `pnpm convex:dev` on a new machine writes `.env.local`.
2. **Vercel** — import the repo, set the build command to
   `pnpm convex:deploy --cmd 'pnpm build'`, add env vars, confirm the preview
   builds.
3. ~~**Branch protection**~~ — done. Raise approvals to 1 when a second
   developer joins.
4. **CodeRabbit** — install the app on the repo.
5. **Sentry + PostHog** — 10 minutes each, and they pay for themselves the first
   time something breaks in production.
6. **Auth** — the first real feature. Nothing user-facing works without it.

## Accounts hygiene

- Separate Google accounts for production, support and billing.
- All shared credentials in one password manager (1Password or Bitwarden), never
  in chat, email or a repo.
- Keep an admin emergency account with its recovery codes stored offline.
- Every third-party key gets a spend limit or quota where the vendor offers one.
