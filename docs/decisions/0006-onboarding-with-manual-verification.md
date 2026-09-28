# 0006. Onboarding with manual verification

- **Status:** Decided
- **Date:** 29 Sep 2026
- **Deciders:** founder, Claude

## Context

Every business and Saathi must be checked before they trade: GST (optional),
pollution-board certificates for yards, recyclers and manufacturers, machine
photos, and IDs for Saathis. The founder will verify by hand in an admin page,
within 12–24 hours. There is one admin.

## Decision

- An **application** per org or Saathi, with the state machine
  `draft → submitted → approved | changes_requested | rejected`,
  `changes_requested → submitted`, `approved ↔ suspended`.
- Drafts save as the user moves through the form; files upload straight to
  Convex storage.
- The admin works a queue sorted by waiting time, ticks a per-role checklist
  (Approve unlocks only when all items are ticked), and must write a note to
  ask for changes or reject.
- Every transition writes the audit log; resubmissions keep earlier versions.
- A scheduled job marks applications **Due soon** at 18 hours and **Overdue**
  at 24.
- Spec: [product/onboarding.md](../product/onboarding.md).

## Consequences

- No automated KYC in the pilot — one admin's time is the bottleneck, which is
  fine at pilot scale and measured (time to decision).
- Private documents need permission-checked serving
  ([auth.md](../architecture/auth.md#private-files)).
- Automated checks (GSTIN lookup, document OCR) can later pre-fill the
  checklist without changing the flow.

## Alternatives considered

- **Auto-approve and review later** — lets unverified businesses trade and see
  household addresses.
- **A third-party KYC provider** — cost and integration time before the pilot
  proves demand.
