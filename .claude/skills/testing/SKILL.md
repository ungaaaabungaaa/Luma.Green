---
name: testing
description: How to test anything in Luma.Green — what deserves a unit test vs an e2e test, the patterns for Convex functions, money/carbon math, i18n and RTL, and the coverage ratchet. Use whenever writing or changing code, adding a test, or when a test is failing or flaky.
---

# Testing

**Rule: every change ships with a test.** Not "most changes". If a PR changes
behaviour and adds no test, the PR is incomplete — either add one or write in
the PR description why the change is untestable.

## Which kind of test

| You changed…                               | Write…                                 |
| ------------------------------------------ | -------------------------------------- |
| A pure function, a Zod schema, a formatter | Unit test next to the file             |
| A React component's rendering or state     | Testing Library test next to the file  |
| A Convex query/mutation                    | Unit test against `convex-test`        |
| A flow a user can perform end to end       | Playwright spec in `e2e/`              |
| Copy, a new locale                         | The key-parity test already covers it  |
| Only styling                               | A screenshot in the PR; no test needed |

Unit tests live beside the code: `src/lib/money.ts` → `src/lib/money.test.ts`.
E2E specs live in `e2e/<feature>.spec.ts`. Vitest never touches `e2e/`.

## Commands

```bash
pnpm test           # once
pnpm test:watch     # while working
pnpm test:coverage  # what CI runs
pnpm e2e            # Playwright; build first if CI=1
pnpm e2e:ui         # debug a failing spec interactively
```

## What a good test looks like

Test behaviour, not implementation. Assert what a user or caller observes.

```ts
// Good — states the rule, fails loudly when the rule breaks
it("reserves stock so the same grams cannot be sold twice", () => {
  const after = reserve({ quantityGrams: 5_000, reservedGrams: 0 }, 2_000);
  expect(after.reservedGrams).toBe(2_000);
  expect(availableGrams(after)).toBe(3_000);
});

// Bad — restates the implementation, passes even when the rule is wrong
it("calls setReserved", () => {
  expect(setReserved).toHaveBeenCalled();
});
```

Name the test after the rule it defends, not the function it calls.

## The domains that need the most tests

**Money and mass.** Integer paise and integer grams. Every conversion needs a
test, including the boundary: 1 gram, 1 paisa, and a quantity that does not
divide evenly by 1000.

```ts
it("never loses a paisa when converting grams to a line total", () => {
  expect(lineTotalPaise({ grams: 1, pricePerKgPaise: 100 })).toBe(0);
  expect(lineTotalPaise({ grams: 1_001, pricePerKgPaise: 100 })).toBe(100);
});
```

**Carbon credits.** The frozen-factor rule is the one an auditor will check:
changing a material's `co2eFactorPerKg` must not change any already-issued
credit. Write that test when you touch anything in the carbon path.

**State machines.** Listings and trades have explicit statuses. Test the
transitions that must be _impossible_ (settling a cancelled trade, retiring a
credit twice) — those are where the real bugs live.

## Component tests

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

it("shows the tagline", () => {
  render(<Logo />);
  expect(screen.getByRole("img", { name: "Luma.Green" })).toBeInTheDocument();
});
```

Query by role and accessible name — `getByTestId` is a last resort. If a role
query is hard to write, the component usually has an accessibility problem
worth fixing instead.

Components that use translations need a wrapper:

```tsx
import { NextIntlClientProvider } from "next-intl";
import messages from "../../messages/en.json";

render(
  <NextIntlClientProvider locale="en" messages={messages}>
    <Thing />
  </NextIntlClientProvider>,
);
```

`vitest.setup.ts` already stubs `matchMedia` and `ResizeObserver` for Radix
primitives. Add further global stubs there, not in individual tests.

## Convex functions

Use `convex-test` (add it when the first function lands):

```ts
const t = convexTest(schema);
await t.mutation(api.trades.settle, { tradeId });
expect(await t.query(api.credits.forOrg, { orgId })).toHaveLength(1);
```

Test the authorisation path explicitly: an org must never read another org's
inventory. Write that as a test, not a comment.

## E2E

Playwright runs chromium only, one worker in CI. Keep the suite fast:

- One spec per feature; don't re-test what a unit test already covers.
- Use `getByRole`; avoid CSS selectors that break on a Tailwind class change.
- Never `waitForTimeout` — use web-first assertions (`await expect(x).toBeVisible()`).
- Any new user-facing flow gets at least: happy path, one failure path, and one
  check in an RTL locale (`/ar`) if layout is involved.

## Coverage

Coverage thresholds are currently **off** — a bare repo would fail them for no
useful reason. The ratchet: when a domain module lands (money, inventory,
carbon), add a per-directory threshold for it in `vitest.config.mts` at the
level it already achieves, so it can only go up. Never lower a threshold to
make CI pass; fix the test gap.

## Flaky tests

A flaky test is a failing test. Quarantine is not a fix — either make it
deterministic (fake timers, explicit waits on state, seeded data) or delete it
and write one that is. Never add `test.skip` without a linked issue.
