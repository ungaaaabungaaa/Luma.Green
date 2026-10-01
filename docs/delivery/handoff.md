# Agent handoff — 1 October 2026

**Status:** implementation and local verification complete through `db62fb7`
(premium visual refinement).
This handoff is the next documentation commit on `feat/pilot-readiness-cleanup`.
The branch is the continuation point; `main` has not received these changes.
Check the live remote before making a merge or deployment claim.

## Resume procedure

1. Read `AGENTS.md`, this page, and the task-specific `.claude/skills` playbooks.
2. Check `git status -sb`, `git log -15 --oneline`, `git remote -v` and
   `git worktree list`. Preserve new user changes. Fetch `origin` and compare the
   branch with its upstream before editing or pushing.
3. Read the four implementation records below. Their test counts are historical
   checkpoints; the latest source checkpoint is the visual refinement.
4. Pick a task from the ordered queue. Distinguish code implementation, local
   tests, hosted CI, deployment, provider execution and store approval in reports.
5. Update this page as work progresses. Commit meaningful verified slices.
   Keep secrets, local environments and generated output out of Git.

Repository: `https://github.com/ungaaaabungaaa/Luma.Green.git`.
Branch: `feat/pilot-readiness-cleanup`.
Starting base: `3d1e720`, also remote main when checked for this handoff.
Local checkout: `/Users/syedabdulmuqeeth/Developer/SandBox/luma.green`.

For a new machine only:

```sh
git clone --branch feat/pilot-readiness-cleanup https://github.com/ungaaaabungaaa/Luma.Green.git
cd Luma.Green
pnpm install --frozen-lockfile
pnpm check
```

Use Node 24 and the pnpm version pinned in `package.json`. Do not clone over an
existing checkout. No app secret is needed for local build/tests.

## Commit checkpoints

These commits are reachable from the continuation branch. Do not cherry-pick
them again into that branch or restart from the old base.

| Commit    | Completed work                                                               |
| --------- | ---------------------------------------------------------------------------- |
| `bb3eb1b` | Deferred analytics and removed unused service packages                       |
| `cfcad80` | Twelve-locale material names and message-contract validation                 |
| `e949586` | Pickup dispatch, expiry/reassignment and pilot safeguards                    |
| `af9a027` | Accessible UI cleanup and admin pilot reports                                |
| `c6b51a0` | Auth recovery after failed sends and delayed sessions                        |
| `caf87bf` | Optional bounded photo estimates; manual entry preserved                     |
| `85b9d73` | Booking/application status-message outbox and adapter                        |
| `acd549e` | Pilot setup and implementation evidence                                      |
| `9ec96ce` | Expo and Electron shells, guarded updates, GSAP and imagery                  |
| `e6d0e3a` | Expo-compatible isolated mobile TypeScript version                           |
| `e218556` | Native architecture, account setup and release evidence                      |
| `2183515` | Image compression, compact queries, caches and self-hosted inference adapter |
| `f94fa6b` | Agent handoff and continuation checkpoints                                   |
| `db62fb7` | Premium public/app design, compressed art, parallax and motion checks        |

Detailed records: [UI and pilot](cleanup-progress.md),
[apps and motion](apps-and-motion.md), [cost optimization](cost-optimization.md),
[visual refinement](premium-ui.md).

No unfinished agent edits, stashes or active secondary worktrees were present at
handoff inspection. The five earlier managed worktrees are archived: UI,
translations, pilot readiness, photo estimates and SMS. Their work is integrated.
They are recovery snapshots, not continuation checkouts.

## Architecture to preserve

- Next.js and Convex own operational UI and data. Money is integer paise; mass
  is integer grams. Permission checks and transaction records stay authoritative.
- `apps/mobile` uses Expo/React Native for Android/iOS. `apps/desktop` uses
  Electron for macOS/Windows. Both reuse the hosted web UI and backend.
- Hosted UI, compatible signed JavaScript updates and native binaries have
  separate release paths. New native capabilities can still require a binary
  or store update. Do not promise permanent freedom from app updates.
- Root message catalogues are the editable translation source. Regenerate
  mobile copy with `pnpm --filter @luma/mobile messages:generate` after shared
  native/common/brand copy changes.
- Photo inference uses one configured OpenRouter or authenticated HTTPS endpoint.
  No paid fallback; models never set prices. Router/model suitability is unverified.
- Image preparation is local and never increases upload bytes. JPEG/PNG private
  metadata is removed while orientation stays correct. PDF/video/WebP bytes and
  embedded metadata stay unchanged. Server validation remains in place.
- Photo-result memory cache: three replies, five minutes, cleared on account
  change/unmount. No persistent image/result cache. Current prices stay reactive.
- Convex remains the database. Its current backend and GSAP are not MIT/Apache-only;
  see the cost guide before making license claims.

Read [ADR 0014](../decisions/0014-shared-web-ui-in-native-shells.md),
[ADR 0015](../decisions/0015-bounded-photo-cache-and-selectable-inference.md),
[native architecture](../architecture/native-apps.md) and
[AI architecture](../architecture/ai-estimation.md) before changing these contracts.

## Verification checkpoint

Latest implementation checks at `db62fb7`:

| Check                            | Evidence                                                                      |
| -------------------------------- | ----------------------------------------------------------------------------- |
| `pnpm check`                     | Lint/types; 1,065 web tests in 136 files; 23 mobile and 19 desktop unit tests |
| `pnpm format:check`              | Passed                                                                        |
| `pnpm exec next build --webpack` | Passed; 925 generated pages                                                   |
| `CI=1 PORT=3100 pnpm e2e`        | 48 Chromium tests passed against production build                             |
| Public image cache               | Content-hashed source, immutable headers, optimizer `MISS` then `HIT`         |
| Upload fixture                   | 4,980,609 → 490,212 bytes; inspected synthetic scan remains legible           |
| Compact prices                   | 832 → at most 52 documents; 50,832 → 1,113 response bytes in fixture          |

Earlier checks include both Hermes exports, Android configuration prebuild, real
macOS Electron isolation/PDF/recovery smoke and unsigned macOS ARM64 packaging.
These do not prove mobile native compilation, Windows execution or signed updates.
The default Turbopack build hit a host worker-port restriction; Webpack passed.
Clean production builds need network access for configured Google fonts.

The latest full checks cover the visual refinement. The last heading offset and
browser-test selector fixes also passed focused ESLint and the production suite.
The first incremental build emitted stale CSS; moving the compile cache aside and
building again produced the correct styles. A computed hero-size smoke check now
catches that failure. The production homepage was inspected and the two repository
homepage screenshots were refreshed. The image-cache/upload/price fixture rows
above are historical evidence from `2183515`; those paths were not changed by this
visual pass. No application source changed after the final build/browser checks.

The local preview was refreshed at `http://localhost:3004/`. Check its process on
resume; it is not a deployed service. Use `PORT=3004 pnpm start` after a successful
build if needed. Generated artifacts are ignored: `apps/mobile/dist`, generated
mobile Android/iOS projects and `apps/desktop/release/mac-arm64/Luma.Green.app`.
Rebuild on a new machine. `/tmp` screenshots/logs are not required resume inputs.

## Ordered next-work queue

| Priority | Task                                                       | Completion evidence / dependency                                                                                                                                                                                                                                                                                        |
| -------- | ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1        | Open/review a PR for the branch; run hosted checks         | Review the full diff and obtain green required CI plus relevant browser/native jobs. A branch push alone does not run the current PR-only checks. No direct main push or red-check merge.                                                                                                                               |
| 2        | Stage the connected pilot flows                            | Configure intended Convex/site environments. Deploy schema/functions before dependent frontend. Test real sign-in, private upload, dispatch, expiry, receipt and admin report with staging users. Accounts/keys are external prerequisites.                                                                             |
| 3        | Complete signed native previews                            | Configure the dedicated trusted origin and signing/update credentials. Build Android/iOS and macOS/Windows artifacts. Test login, camera/gallery/location, private files, recovery and updates on each platform. Full Xcode, Android SDK/JDK or EAS builds are required; this host lacked mobile native toolchains.     |
| 4        | Activate and verify SMS                                    | Obtain MSG91/DLT/template approval. Check OTP and status events. Record API acceptance and handset delivery separately. No real send was made during implementation.                                                                                                                                                    |
| 5        | Validate optional self-hosted AI                           | Configure an authenticated HTTPS gateway, pin an evaluated vision model, and test cold/warm latency within eight seconds, accuracy and cost. Manual entry works without AI.                                                                                                                                             |
| 6        | Run launch UX and cost acceptance                          | Review populated app/admin screens with staging accounts; native-speaker review of launch languages; low-end device/RTL checks; real scan legibility; staging usage measurements and restore drill. Replace placeholder support contact details before launch. Local savings are fixture measurements, not a live bill. |
| 7        | Implement remaining operational gaps if required for pilot | SMS delivery webhook/status handling and explicit resend policy; bounded SMS outbox retention; identify/exclude demo rows in pilot metrics. Define retention and idempotency first. Current adapters/reports do not implement these.                                                                                    |
| 8        | Continue later product work from its requirements          | Large-city spatial dispatch; consented photo conversion/accuracy instrumentation; real escrow/payments and regulated carbon work. Existing prototypes and sample figures are not live services.                                                                                                                         |

Setup checklists:

- [Launch](../operations/launch-checklist.md): Convex, hosting, SMS and core environment.
- [App releases](../operations/app-releases.md): Expo/EAS, Apple, Google, macOS/Windows signing and updates.
- [Low-cost operation](../operations/low-cost-operation.md): exact self-hosted AI variables, gateway, licenses and measurements.
- [SMS](../operations/sms-notifications.md): template/event contracts.
- [Backups](../operations/backups.md): exports and restore checks.

## Publication and next-agent instruction

This checkpoint is prepared for a normal push of `feat/pilot-readiness-cleanup`
to `origin` with upstream tracking. Verify equality after fetching with
`git rev-list --left-right --count HEAD...@{upstream}`; expect `0 0` before claiming
synchronization. Check clean status separately. Find this documentation checkpoint
with `git log -1 --grep='visual refinement handoff'`. The implementation is
`db62fb7`; the next documentation-only commit records this checkpoint.

No PR, hosted CI result, merge, deployment, provider execution or store release
is claimed here. The current task ends after push verification. No background
agent or scheduled monitor is left running. Resume with the ordered queue and
update this record.
