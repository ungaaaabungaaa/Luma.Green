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

| Job          | Command              | Fails when                                       |
| ------------ | -------------------- | ------------------------------------------------ |
| `Lint`       | `pnpm lint`          | ESLint error — type-aware, so it is the slow one |
| `Format`     | `pnpm format:check`  | Prettier would reformat a file                   |
| `Typecheck`  | `pnpm typecheck`     | `tsc --noEmit` error                             |
| `Unit tests` | `pnpm test:coverage` | A Vitest test fails                              |
| `Build`      | `pnpm build`         | `next build` fails for any locale                |

`.github/workflows/e2e.yml` — Playwright, **PRs only**, and only when `src/`,
`e2e/`, `messages/`, `public/`, or a relevant config changed. It is the
expensive one (browser + build + run), so it is deliberately not on every push.

## Reproduce locally

```bash
pnpm check          # lint + typecheck + unit — the fast three
pnpm format:check   # what the Format job runs
pnpm build          # what the Build job runs
CI=1 pnpm e2e       # needs a build first; set PORT=3100 if 3000 is busy
```

`pnpm check` before every push.

**Green locally, red in CI? Clear generated state first.** CI starts with no
`.next/`, and type-aware lint depends on route types Next generates there
(`next/root-params` is `any` without them). A leftover `.next/` from an earlier
local build hides that class of failure completely:

```bash
rm -rf .next next-env.d.ts && pnpm check
```

`lint`, `lint:fix` and `typecheck` run `next typegen` first for exactly this
reason — don't remove it from the scripts. The `pre-push` hook runs `typecheck`; the
`pre-commit` hook runs lint-staged on changed files only. Hooks are a fast
filter, not a substitute for CI.

## Cost discipline (free plan)

Minutes are finite. The rules that keep them that way:

- **`concurrency` with `cancel-in-progress`** on every workflow — a new push
  cancels the previous run. Never remove this.
- **`paths:` filters** on anything expensive. A docs-only PR should not build
  chromium.
- **Cache everything cacheable**: pnpm (`pnpm/action-setup` + `actions/setup-node` with `cache: pnpm`),
  `.next/cache`, and `~/.cache/ms-playwright`.
- **`timeout-minutes` on every job.** A hung job otherwise burns 6 hours.
- **Pin actions to a major tag**, and let Dependabot bump them monthly.
- **`pnpm install --frozen-lockfile`**, never a plain install: CI must fail on a
  lockfile that doesn't match `package.json` rather than silently resolving
  something new.

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

`main` is protected (GitHub → Settings → Branches):

- **Required checks:** Lint, Format, Typecheck, Unit tests, Build — pinned to
  the GitHub Actions app so nothing else can report them green.
- **PR required, zero approvals.** The team is one person and GitHub doesn't let
  you approve your own PR, so the author merges once checks are green. When a
  second developer joins, raise required approvals to 1.
- **Enforced for admins.** No direct pushes to `main` from anyone — including
  the owner's token, which is what agents push with.
- **Merged branches auto-delete**, so `main` stays the only long-lived branch.

**E2E is deliberately not required.** It is path-filtered, and a required check
that doesn't run never reports — the PR would sit blocked forever.

**Never add `paths:`/`paths-ignore:` to `ci.yml`.** Its five jobs are required
checks; filtering them out of a docs-only PR blocks that PR permanently. Path
filters belong only in workflows that are _not_ required, like `e2e.yml`.

## Adding a check

1. Add the script to `package.json` so it runs identically locally.
2. Decide if it must block merges.
   - **Yes:** add a job to `ci.yml` with `timeout-minutes` and **no path
     filter**, then add its exact job name to the required checks.
   - **No, and it's slow:** give it its own workflow with a `paths:` filter, like
     `e2e.yml`, and do not make it required.
3. Prove it fails: push a commit that breaks it, confirm the red X, revert.
   A check that has never failed is a check you cannot trust.
4. If required: add the job name to branch protection. The name must match the
   job's `name:` exactly — a typo is a check that never reports.
