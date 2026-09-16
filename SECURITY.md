# Security

## Reporting a vulnerability

Email **security@luma.green** with what you found, how to reproduce it, and what
an attacker could do with it. Please don't open a public issue.

We'll acknowledge within 3 working days and keep you updated until it's closed.
Don't access, modify or retain other people's data while testing — a proof of
concept on your own account is enough.

## What we hold

Luma.Green stores business KYC data (PAN, GSTIN), operator phone numbers,
locations of collection sites, trade prices, and the carbon-credit ledger.
A breach of the ledger is a compliance incident, not just a data loss — treat
`auditLog`, `carbonCredits` and `creditTransfers` as the crown jewels.

## Rules for contributors

- **Secrets never enter the repo.** All config goes through `src/lib/env.ts`.
  `.env*` is gitignored except `.env.example`, which holds keys with empty
  values only.
- **Separate keys per environment.** Development, staging and production each
  get their own credentials. A test Razorpay key must never reach production and
  a live key must never reach a developer machine.
- **Authorise in the function, not the UI.** Every Convex query and mutation
  checks the caller's org before reading or writing. Hiding a button is not
  access control.
- **Never log PII or secrets.** No phone numbers, PAN, GSTIN or tokens in
  console output, Sentry breadcrumbs or PostHog events. PostHog is configured
  with `person_profiles: "identified_only"` and a narrow autocapture allowlist —
  keep it that way.
- **Validate at the boundary.** Every external input (form, webhook, API) is
  parsed with a Zod schema before it reaches business logic.
- **Verify webhook signatures.** Razorpay and any other webhook must verify the
  signature before acting. An unsigned webhook handler is an open endpoint.
- **CI runs without application secrets.** If a check needs a real key, it needs
  a fixture instead.

## Key rotation

Rotate immediately if a key is exposed in a commit, a log, a screenshot or a
support ticket — rotation first, investigation second. Rewriting git history
does not un-leak a key.

## Dependencies

Dependabot opens grouped updates weekly. Security advisories are triaged within
a week; anything rated high or critical in a runtime dependency is same-day.
