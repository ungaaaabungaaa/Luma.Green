# Investor demo implementation plan

The owner authorised production and development demonstration records on 10 October 2026 for investor technical review. This is an additive import, not a reset. Preserve existing users and operational records. No platform administrator account is requested.

## Dataset and identity

Use five cohorts of the 28 existing persona templates, for 140 accounts in each deployment. Names start with DEMO; email identifiers use the reserved investor.luma.invalid domain. Separate random passwords per deployment remain in ignored, restricted files and a private Word annex. Import salted Better Auth password hashes through an internal mutation. Normal sign-in, session, factor, permission and provider rules remain unchanged. Record operator-created synthetic email identity provenance; do not claim email delivery or phone verification.

Create linked fictional organisations, team roles, material stock, listings, requested and accepted trades, sample household records, lots, inspections, transformations, sourcing, facilities and production records. Include every reference industry from the supplied workbook. Real business research is background only. Do not seed fake GST registrations, government approvals, issued certificates, gateway captures or seller settlements. Do not populate the public price board with invented live quotes.

## Import controls

Internal functions require the exact batch, exact deployment URL and an operator-set expiry of no more than 24 hours. Hosted deployments reject local verification flags. Each imported identity and domain record has a batch receipt. Reruns preserve later user changes and reject missing/drifted identities. Remove import configuration when each run ends. No new public import endpoint and no production test-mode switch.

A full production export was rejected by automatic approval review because it could copy unrelated private data. No export was performed. Use additive writes and exact import receipts; no broad deletion or backup workaround.

## Verification and delivery

1. Unit tests cover import disabled/expired/wrong-target gates, identity collisions, idempotence, exact money/mass and cross-cohort links. Exercise the real Better Auth handler.
2. Deploy and seed development first. Read back only demo counts and invariants. Verify actual email/password sign-in and role access.
3. Deploy and seed production with the same bounded batch. Verify sample records, normal login, tenant boundaries and gateway-unavailable states. No provider call is required.
4. Capture actual seeded browser screens. Produce a short Word tour with role-switch instructions, a complete module checklist and honest provider limits. Keep passwords separate.
5. Update the maintained platform guide impact and delivery handoff. Run required checks, land through a protected PR and archive the task worktree after preserving the demo evidence and private credentials.

## Demo limits

A new household booking still requires verified phone possession. B2B payment-dependent actions remain blocked until a real approved gateway is configured. Imported sample records demonstrate stored states, not actual payments, compliance approval, processing or provider delivery. Workspace administrator is a team role, not platform admin. The demo must show these limits to the investor's technical team.
