<!--
Title must follow Conventional Commits, e.g.
  feat(inventory): reserve stock when a trade is accepted
-->

## What changed

<!-- One paragraph. What does this do, and why now? -->

## How to verify

<!-- Exact steps a reviewer can follow. "Go to /ta, open the menu, …" -->

1.

## Checks

- [ ] Tests cover the change (unit for logic, e2e if a user-visible flow changed)
- [ ] `npm run check` passes locally
- [ ] New user-facing strings are in `messages/en.json` (no hardcoded copy)
- [ ] No secrets, keys or `.env` values in the diff
- [ ] Schema change? Migration path noted below

## Screenshots / recordings

<!-- Required for any visible UI change. At phone width (390 px), plus desktop
     for business and admin screens, and one RTL locale (/ar or /ur) if
     layout changed. -->

## Notes for the reviewer

<!-- Trade-offs, follow-ups, anything deliberately left out. -->
