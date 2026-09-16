# Environments

Three environments, three sets of credentials. A key from one must never appear
in another.

| Environment    | URL                  | Branch / trigger  | Data                  |
| -------------- | -------------------- | ----------------- | --------------------- |
| **Local**      | `localhost:3000`     | your working tree | Convex dev deployment |
| **Preview**    | Vercel per-PR URL    | every PR          | Convex dev/preview    |
| **Production** | `https://luma.green` | merge to `main`   | Convex production     |

## Rules

- **Nothing indexes but production.** `src/app/robots.ts` blocks all crawling
  unless `VERCEL_ENV === "production"`.
- **Test keys never reach production; live keys never reach local.** Razorpay in
  particular: a live key on a developer machine is a real payment.
- **CI has no application secrets.** Checks must pass on a fork with an empty
  `.env`. Secrets only exist in deploy workflows and the Vercel dashboard.
- **Every var is optional.** A feature disables itself when its key is absent —
  that is what keeps the above true.

## Local setup

```bash
cp .env.example .env.local
npx convex dev          # writes NEXT_PUBLIC_CONVEX_URL + CONVEX_DEPLOYMENT
npm run dev
```

You need no other account to develop the UI, i18n, or anything that doesn't talk
to a third party.

## Vercel

Set variables per environment scope (Production / Preview / Development) rather
than globally:

| Variable                  | Prod | Preview | Notes                          |
| ------------------------- | ---- | ------- | ------------------------------ |
| `NEXT_PUBLIC_SITE_URL`    | ✅   | auto    | Canonical URLs                 |
| `NEXT_PUBLIC_CONVEX_URL`  | ✅   | ✅      | Different deployments          |
| `CONVEX_DEPLOY_KEY`       | ✅   | ✅      | Build-time deploy              |
| `BETTER_AUTH_SECRET`      | ✅   | ✅      | Different per environment      |
| `NEXT_PUBLIC_POSTHOG_KEY` | ✅   | —       | Don't pollute prod analytics   |
| `NEXT_PUBLIC_SENTRY_DSN`  | ✅   | ✅      | Separate Sentry environments   |
| `SENTRY_AUTH_TOKEN`       | ✅   | —       | Source map upload              |
| `RAZORPAY_KEY_*`          | live | test    | Never mix                      |
| `RESEND_API_KEY`          | ✅   | test    | Preview should not email users |
| `R2_*`                    | ✅   | ✅      | Separate buckets               |
| `OPENROUTER_API_KEY`      | ✅   | ✅      | Spend limit on both            |

Build command once Convex is linked:

```
npx convex deploy --cmd 'npm run build'
```

That deploys the schema before the frontend that depends on it.

## Backups

- **Convex** — scheduled export to R2, weekly. Keep 8 weeks.
- **R2** — a separate backup bucket in a different region.
- **GitHub** — the repo itself is a backup, but keep a periodic mirror.
- **Restore test monthly.** A backup you have never restored is a hypothesis.

## Incidents

1. Triage in Sentry; check the Vercel and Convex dashboards for a correlated
   deploy.
2. If a deploy caused it, **revert first** — `git revert` and merge, don't
   hotfix forward under pressure.
3. If a key leaked, rotate before investigating.
4. Write it up afterwards: what broke, what the signal was, what would have
   caught it earlier. Add that check.
