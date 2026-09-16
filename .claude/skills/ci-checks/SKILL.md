---
name: ci-checks
description: What CI runs on every PR and push, why the checks are split the way they are, how to reproduce a red check locally, and the rules for adding a new check on a free GitHub plan. Use when a check is failing, when adding a workflow, or before opening a PR.
---

# CI checks

Every PR and every push to `main` runs the same gate. **A red check is never
merged and never overridden.** If a check is wrong, fix the check in its own PR.

## The checks

`.github/workflows/ci.yml` — five small, independent jobs. They are split so a
red X names the problem before you open the log:

| Job          | Command                 | Fails when                                 |
| ------------ | ----------------------- | ------------------------------------------ |
| `Lint`       | `npm run lint`          | ESLint error — incl. locale-unsafe imports |
| `Format`     | `npm run format:check`  | Prettier would reformat a file             |
| `Typecheck`  | `npm run typecheck`     | `tsc --noEmit` error                       |
| `Unit tests` | `npm run test:coverage` | A Vitest test fails                        |
| `Build`      | `npm run build`         | `next build` fails for any locale          |

`.github/workflows/e2e.yml` — Playwright, **PRs only**, and only when `src/`,
`e2e/`, `messages/`, `public/`, or a relevant config changed. It is the
expensive one (browser + build + run), so it is deliberately not on every push.

## Reproduce locally

```bash
npm run check          # lint + typecheck + unit — the fast three
npm run format:check   # what the Format job runs
npm run build          # what the Build job runs
CI=1 npm run e2e       # needs a build first; set PORT=3100 if 3000 is busy
```

`npm run check` before every push. The `pre-push` hook runs `typecheck`; the
`pre-commit` hook runs lint-staged on changed files only. Hooks are a fast
filter, not a substitute for CI.

## Cost discipline (free plan)

Minutes are finite. The rules that keep them that way:

- **`concurrency` with `cancel-in-progress`** on every workflow — a new push
  cancels the previous run. Never remove this.
- **`paths:` filters** on anything expensive. A docs-only PR should not build
  chromium.
- **Cache everything cacheable**: npm (`actions/setup-node` with `cache: npm`),
  `.next/cache`, and `~/.cache/ms-playwright`.
- **`timeout-minutes` on every job.** A hung job otherwise burns 6 hours.
- **Pin actions to a major tag** (`@v4`), and let Dependabot bump them monthly.

Before adding a job, ask: can this be a step in an existing job instead? Each
new job re-installs dependencies (~40s). Split only when the split makes a
failure easier to read — as with the five above.

## Secrets

CI runs with **no application secrets**, on purpose:

- The build must stay green for a fork and for anyone with an empty `.env`.
- Every var in `src/lib/env.ts` is optional. If a feature needs a key, guard it
  so its absence disables the feature instead of failing the build.
- A secret only ever enters a deploy workflow, never a check workflow.

If you find yourself wanting a secret in CI to make a test pass, the test needs
a fixture or a mock instead.

## Branch protection

`main` requires: Lint, Format, Typecheck, Unit tests, Build (and E2E when it
runs), plus one approving review. Configure in GitHub → Settings → Branches.
Direct pushes to `main` are off — everything lands through a PR.

## Adding a check

1. Add the script to `package.json` so it runs identically locally.
2. Add the job to `ci.yml` with `timeout-minutes` and a `paths:` filter if it's
   slow.
3. Prove it fails: push a commit that breaks it, confirm the red X, revert.
   A check that has never failed is a check you cannot trust.
4. Add it to the branch protection required list.
