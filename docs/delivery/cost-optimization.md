# Operating cost optimization

Date: 2026-10-01. Starting commit: `e218556`.

## Scope

Reduce uploaded bytes, database reads and writes, and repeated model requests.
Keep current prices, access checks, and transaction records correct. Use the
existing Convex query cache. Do not add another cache service or a paid dependency.

## Work plan

| Owner        | Work                                                                                       | Proof                                                            |
| ------------ | ------------------------------------------------------------------------------------------ | ---------------------------------------------------------------- |
| Upload agent | Prepare images before upload; retain document legibility; strip metadata                   | Unit and browser tests, source/output byte counts                |
| Query agent  | Read compact price quotes for forms                                                        | Read budget, response size, price parity tests                   |
| Model agent  | Short memory cache, fixed self-hosted endpoint, quota cleanup coalescing                   | Expiry, isolation, error, provider and quota tests               |
| Main agent   | Skip unchanged draft writes; cache public image output; integration review and setup guide | Mutation tests, production build, full checks, release checklist |

No production deployment or external account changes are part of this pass.
Local measurements show work removed; they do not establish a production bill.

## Evidence

### Measured changes

- In the 26-material, 30-day price fixture, the full board reads 832 documents.
  Each compact form query passes a 52-document maximum: 93.75% fewer reads.
  UTF-8 JSON falls from 50,832 to 1,113 bytes (97.81%). Real charts retain history.
- Chromium scan fixture: 4000 × 3000 PNG, 4,980,609 bytes, becomes a 2400 × 1800
  JPEG of 490,212 bytes (90.16% smaller). The inspected screenshot remains legible.
  This is one synthetic example, not a promised ratio for all uploads.
- Two overlapping requests for the same photo issue one model action. A repeated
  successful result within five minutes issues no new action. Failures are retried
  only by user action, and are not cached. Account changes discard cached replies.
- Two quota reservations in one expiry bucket create one pending cleanup job.
  Tests cover the exact 24-hour allowance boundary and later reservations.
- Repeated identical or empty draft saves retain the original document and timestamp.
  Real changes still write; edit permissions are checked before either path.

### Review and verification

Independent review found and fixed JPEG APP0/APP14 metadata retention and PNG
orientation loss in the smaller-file fallback. Reproduction checks with real images
confirm the fixes; regression tests cover these cases. A weak-key memory cache
reuses preparation for the same immutable File and preset, with failed promises removed.
No package dependency was added.

- `pnpm check`: passed. Lint, TypeScript, 1,059 web tests in 134 files, 23 mobile
  tests and 19 desktop tests passed.
- `pnpm format:check`: passed.
- `pnpm exec next build --webpack`: passed, 925 generated pages. The initial
  sandboxed build could not fetch Google Fonts; the network-enabled retry passed.
- `CI=1 PORT=3100 pnpm e2e`: all 45 production Chromium tests passed.
- Local production image check: the source URL contains its content hash and has
  `Cache-Control: public, max-age=31536000, immutable`. The optimized WebP response
  was 85,036 bytes; two identical requests returned `MISS` then `HIT`, with equal
  output bytes. The optimizer returned an immutable cache header too.
- The refreshed production preview is available at `http://localhost:3004/`.

### Scope and remaining proof

[ADR 0015](../decisions/0015-bounded-photo-cache-and-selectable-inference.md)
supersedes the old inference decision. The architecture guide, service list,
launch checklist and README now match the implemented provider and cache choices.
The OpenRouter adapter remains an explicit configuration option; self-hosted mode
never selects it as a fallback. No shared persistent photo cache or new cache service
was introduced. The lossless image path exists to avoid larger uploads; remove it
only if a replacement preserves size, metadata privacy and orientation together.

This is local source and regression proof. Hosted CI, deployed usage/billing, real
private uploads, live model accuracy/latency, actual identity scan legibility and
low-end mobile camera/codec behavior remain external launch checks. Provider tests
use mocks. No account, paid inference or production deployment was used.

See [low-cost operation](../operations/low-cost-operation.md) for configuration,
license exceptions, the self-hosted gateway checklist and a traffic measurement plan.
