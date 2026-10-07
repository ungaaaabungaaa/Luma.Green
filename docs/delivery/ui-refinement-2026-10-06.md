# Whole-platform UI refinement — 6 October 2026

Status: authorized implementation; final visual evidence and release checks pending.

The founder requested a full platform UI pass after finding oversized sign-in
controls. Make each task clear and compact. Preserve the approved neutral themes,
Geist/Noto fonts, green actions, control corners and open sections. Keep useful
process images. Public task pages use a short image or aside; home, process,
participants and standards pages keep their editorial layout.

This work continues the approved account, workspace, stakeholder, material-lot
and gateway implementation. It does not change payment, access or verification
rules. The current [UI contract](../design/designer-system.md#current-ui-contract)
and [handoff](handoff.md) remain authoritative. No claim below means hosted
release, provider acceptance or native-speaker review.

## Owners and boundaries

- Root: shared tabs, layout foundation, household collection/tracking, integration,
  runtime, final checks, guide source, Word artifact and cloud publication.
- Auth: login and email recovery, account security/workspaces/inbox, onboarding,
  admin authentication and recoverable auth-error pages.
- Workspace: every `/app` page, operational shell, shared page parts and lot forms.
- Public/admin: public task headers, help, admin console copy/tab consumers,
  editorial-page audit, fallback audit and this route register.

Root owns shared primitives and global styles. Other owners change page-level
composition only within their assigned files. Keep enum keys and route URLs.
Use “preprocessor” for the actor. Do not invent records, prices, payments,
certificates or provider approval to fill a page.

## Route audit register

The register lists all **57 page templates** present in `src/app`, checked on 7 October.
`[locale]` expands through `src/i18n/locales.ts`; it is not a second locale list.
Assignments and shared layout changes do not prove that every route/state was
visually inspected. Each row states its current evidence and remaining gate.

| #   | Route template                        | Owner        | Scope                                                                                      | Evidence / remaining gate                                                                       |
| --- | ------------------------------------- | ------------ | ------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------- |
| 1   | `/[locale]/account/notifications`     | Auth         | Compact auth/account/onboarding; preserve factors and drafts                               | Owner focused auth/UI tests; final connected/recovery views pending                             |
| 2   | `/[locale]/account/security`          | Auth         | Compact auth/account/onboarding; preserve factors and drafts                               | Owner focused auth/UI tests; final connected/recovery views pending                             |
| 3   | `/[locale]/account/workspaces/invite` | Auth         | Compact auth/account/onboarding; preserve factors and drafts                               | Owner focused auth/UI tests; final connected/recovery views pending                             |
| 4   | `/[locale]/account/workspaces`        | Auth         | Compact auth/account/onboarding; preserve factors and drafts                               | Owner focused auth/UI tests; final connected/recovery views pending                             |
| 5   | `/[locale]/app/compliance`            | Workspace    | Compact operational layout; preserve role and record guards                                | Owner focused tests; final connected lot/refinement views pending                               |
| 6   | `/[locale]/app/impact`                | Workspace    | Compact operational layout; preserve role and record guards                                | Owner focused tests; final connected lot/refinement views pending                               |
| 7   | `/[locale]/app/integrations`          | Workspace    | Compact operational layout; preserve role and record guards                                | Owner focused tests; final connected lot/refinement views pending                               |
| 8   | `/[locale]/app/lots/[id]`             | Workspace    | Compact operational layout; preserve role and record guards                                | Owner focused tests; final connected lot/refinement views pending                               |
| 9   | `/[locale]/app/lots`                  | Workspace    | Compact operational layout; preserve role and record guards                                | Owner focused tests; final connected lot/refinement views pending                               |
| 10  | `/[locale]/app/market`                | Workspace    | Compact operational layout; preserve role and record guards                                | Owner focused tests; final connected lot/refinement views pending                               |
| 11  | `/[locale]/app`                       | Workspace    | Compact operational layout; preserve role and record guards                                | Owner focused tests; final connected lot/refinement views pending                               |
| 12  | `/[locale]/app/prices`                | Workspace    | Compact operational layout; preserve role and record guards                                | Owner focused tests; final connected lot/refinement views pending                               |
| 13  | `/[locale]/app/requests/[id]`         | Workspace    | Compact operational layout; preserve role and record guards                                | Owner focused tests; final connected lot/refinement views pending                               |
| 14  | `/[locale]/app/requests`              | Workspace    | Compact operational layout; preserve role and record guards                                | Owner focused tests; final connected lot/refinement views pending                               |
| 15  | `/[locale]/app/sell`                  | Workspace    | Compact operational layout; preserve role and record guards                                | Owner focused tests; final connected lot/refinement views pending                               |
| 16  | `/[locale]/app/stock`                 | Workspace    | Compact operational layout; preserve role and record guards                                | Owner focused tests; final connected lot/refinement views pending                               |
| 17  | `/[locale]/app/trades/[id]/invoice`   | Workspace    | Compact operational layout; preserve role and record guards                                | Owner focused tests; final connected lot/refinement views pending                               |
| 18  | `/[locale]/app/trades`                | Workspace    | Compact operational layout; preserve role and record guards                                | Owner focused tests; final connected lot/refinement views pending                               |
| 19  | `/[locale]/login/email/complete`      | Auth         | Compact auth/account/onboarding; preserve factors and drafts                               | Owner focused auth/UI tests; final connected/recovery views pending                             |
| 20  | `/[locale]/login/email/reset`         | Auth         | Compact auth/account/onboarding; preserve factors and drafts                               | Owner focused auth/UI tests; final connected/recovery views pending                             |
| 21  | `/[locale]/login/email/verify`        | Auth         | Compact auth/account/onboarding; preserve factors and drafts                               | Owner focused auth/UI tests; final connected/recovery views pending                             |
| 22  | `/[locale]/login`                     | Auth         | Compact auth/account/onboarding; preserve factors and drafts                               | Owner focused auth/UI tests; final connected/recovery views pending                             |
| 23  | `/[locale]/login/verify`              | Auth         | Compact auth/account/onboarding; preserve factors and drafts                               | Owner focused auth/UI tests; final connected/recovery views pending                             |
| 24  | `/[locale]/t/[token]`                 | Root         | Collection/track task density; preserve booking and token access                           | Owner 89 focused tests reported; final collection/track views pending                           |
| 25  | `/[locale]/join/[business]/documents` | Auth         | Compact auth/account/onboarding; preserve factors and drafts                               | Owner focused auth/UI tests; final connected/recovery views pending                             |
| 26  | `/[locale]/join/[business]`           | Auth         | Compact auth/account/onboarding; preserve factors and drafts                               | Owner focused auth/UI tests; final connected/recovery views pending                             |
| 27  | `/[locale]/join/kabadiwala`           | Auth         | Compact auth/account/onboarding; preserve factors and drafts                               | Owner focused auth/UI tests; final connected/recovery views pending                             |
| 28  | `/[locale]/join/saathi`               | Auth         | Compact auth/account/onboarding; preserve factors and drafts                               | Owner focused auth/UI tests; final connected/recovery views pending                             |
| 29  | `/[locale]/join/stakeholder`          | Auth         | Compact auth/account/onboarding; preserve factors and drafts                               | Owner focused auth/UI tests; final connected/recovery views pending                             |
| 30  | `/[locale]/join/status`               | Auth         | Compact auth/account/onboarding; preserve factors and drafts                               | Owner focused auth/UI tests; final connected/recovery views pending                             |
| 31  | `/[locale]/[...rest]`                 | Public/admin | Retain localised 404 and working home action                                               | AR phone original inspected; final public matrix pending                                        |
| 32  | `/[locale]/contact`                   | Public/admin | Compact task header with existing purpose image                                            | Original header views inspected; final public matrix pending                                    |
| 33  | `/[locale]/help/[role]/[guide]`       | Public/admin | Compact help task header; correct search prompt                                            | Help content/search/route tests; final public captures pending                                  |
| 34  | `/[locale]/help/[role]`               | Public/admin | Compact help task header; correct search prompt                                            | Help content/search/route tests; final public captures pending                                  |
| 35  | `/[locale]/help/contact`              | Public/admin | Compact help task header; correct search prompt                                            | Help content/search/route tests; final public captures pending                                  |
| 36  | `/[locale]/help`                      | Public/admin | Compact help task header; correct search prompt                                            | Help content/search/route tests; final public captures pending                                  |
| 37  | `/[locale]/how-it-works`              | Public/admin | Retain editorial composition                                                               | EN phone original inspected; final public matrix pending                                        |
| 38  | `/[locale]/join`                      | Auth         | Compact auth/account/onboarding; preserve factors and drafts                               | Owner focused auth/UI tests; final connected/recovery views pending                             |
| 39  | `/[locale]`                           | Public/admin | Retain editorial composition                                                               | EN phone original inspected; final public matrix pending                                        |
| 40  | `/[locale]/participants`              | Public/admin | Retain editorial composition                                                               | EN phone original inspected; final public matrix pending                                        |
| 41  | `/[locale]/prices`                    | Public/admin | Compact task header with existing purpose image                                            | Original header views inspected; final public matrix pending                                    |
| 42  | `/[locale]/sell`                      | Root         | Collection/track task density; preserve booking and token access                           | Owner 89 focused tests reported; final collection/track views pending                           |
| 43  | `/[locale]/solar`                     | Public/admin | Compact task header with existing purpose image                                            | Original header views inspected; final public matrix pending                                    |
| 44  | `/[locale]/standards`                 | Public/admin | Retain editorial composition                                                               | EN phone original inspected; final public matrix pending                                        |
| 45  | `/admin`                              | Public/admin | Recent account wording reflects profile creation                                           | New profile/empty-state regression; final private view pending                                  |
| 46  | `/admin/pilot`                        | Public/admin | Source review; shared operational layout                                                   | Source reviewed; final private/fixture visual evidence pending                                  |
| 47  | `/admin/prices`                       | Public/admin | Remove retired demo-seed instruction                                                       | New empty-catalogue regression; final private view pending                                      |
| 48  | `/admin/support`                      | Public/admin | Use shared line tabs without local size overrides                                          | Support filter and action tests; final private view pending                                     |
| 49  | `/admin/verification/[id]`            | Public/admin | Source review; shared operational layout                                                   | Source reviewed; final private/fixture visual evidence pending                                  |
| 50  | `/admin/verification`                 | Public/admin | Source review; shared operational layout                                                   | Source reviewed; final private/fixture visual evidence pending                                  |
| 51  | `/admin/forgot-password`              | Auth         | Compact auth/account/onboarding; preserve factors and drafts                               | Owner focused auth/UI tests; final connected/recovery views pending                             |
| 52  | `/admin/login`                        | Auth         | Compact auth/account/onboarding; preserve factors and drafts                               | Owner focused auth/UI tests; final connected/recovery views pending                             |
| 53  | `/admin/reset-password`               | Auth         | Compact auth/account/onboarding; preserve factors and drafts                               | Owner focused auth/UI tests; final connected/recovery views pending                             |
| 54  | `/admin/setup`                        | Auth         | Compact auth/account/onboarding; preserve factors and drafts                               | Owner focused auth/UI tests; final connected/recovery views pending                             |
| 55  | `/[locale]/app/facility`              | Workspace    | Facility capabilities, workbook references and append-only consent/registration references | Focused local browser result reported; final source/final visual matrix pending                 |
| 56  | `/[locale]/app/evidence`              | Workspace    | Reported document references and preserved corrections                                     | Focused local browser result reported; final source/final visual matrix pending                 |
| 57  | `/admin/payments`                     | Root         | Fixed vendor references and guarded provider-status lookup                                 | Focused local browser result reported; final admin matrix pending; no provider execution proved |

### Dynamic routes and missing states

- `/help/[role]`: inspect household, kabadiwala, preprocessor (`yard` in the URL),
  recycler, manufacturer and Saathi. `HELP_ROLES` and `ROLE_HELP` own the list.
- `/help/[role]/[guide]`: use each role's `guidesFor(role)` result. Existing route
  tests validate guide links, steps and invalid combinations. Representative
  header inspection does not prove every guide's long content fits.
- `/join/[business]` and its document page: yard, recycler and manufacturer use
  the shared business form, with their actual conditional fields. Include a
  missing/invalid business case and an applicant without approved access.
- `/app` varies by approved role. Test kabadiwala, preprocessor, recycler,
  manufacturer and Saathi; record unavailable seeded states as explicit skips.
  Viewer access is separate from an owner/member workflow.
- Lot, pickup, trade invoice, application review and tracking routes require
  actual approved records. Preserve not-found, unauthorized and empty states.
  A component fixture can prove layout only; it cannot prove server access.
- Account invitation and recovery URLs must never expose tokens in screenshots.
  Use blank forms or safe post-token states, and record blocked views honestly.
- Error, loading and not-found files are additional states, not extra page
  templates. Auth availability gets a separate real-quota recovery capture.

## Verification and capture order

1. Finish owner lint, type checks and focused behavior tests. Inspect changed
   layouts at phone, tablet and desktop widths in light/dark, including English,
   Arabic and Kannada. Verify actual glyph fonts, label fit, control reach and
   horizontal overflow. Record exact routes and states, not inherited coverage.
2. Root freezes runtime source, then runs the final connected journey suite.
   No final guide capture runs while a source owner is still changing layouts.
3. Capture the approved local price board and **264** planned refinement views
   (the original 246 plus 18 kabadiwala requests views) from local ports
   3100/3210/3211. Keep fixed per-context client identity and bounded batches
   with at least 11 seconds of quiet time; respect Retry-After. Do not re-login
   to evade quotas. Missing data states are explicit skips.
4. Auth owner plans **36** real recovery views, including the current invitation
   retry state. Workspace owner plans **450** local lot/business/reference views:
   the existing 216 lot/Saathi/byproduct views, 72 evidence/sandbox views and
   126 facility/industry/registration/controlled-disposition views and 36
   manufacturer stock-intake views. These counts
   describe the capture plan, not completed or reviewed evidence. Manufacturer
   stock-intake and admin material-classification changes are still in progress;
   their affected images must use final source. Root captures the separate
   collection/tracking views. Reuse outputs; do not duplicate broad matrices.
5. Guide owner plans **126** isolated component-fixture views, **78** isolated
   failure views, **36** explicit synthetic financial interface examples, and
   **36** real local admin views, including payment-policy
   section and blank policy-dialog states. Root rebuilds the public
   production capture family and supplies the current CSS/font inputs.
   Preserve labels for synthetic fixtures and unavailable live services. Never
   refresh a source hash without recapturing the actual image.
6. Inspect every original final PNG at readable resolution. Capture no password,
   OTP, QR/key, backup code, token, private contact or live customer data. Save
   actual source/image hashes and review results in the appropriate manifests.
7. Update affected guide chapters and captions, rebuild the maintained DOCX
   once changes are stable, render and inspect every page. Reuse the existing
   cloud document ID and preserve sharing, or record an explicit connection gate.
8. Root completes full checks, production build, protected-branch CI, backend
   and hosting verification. Provider, email/SMS and signed-app gates stay
   separate from local evidence.

Public/help/admin source checkpoint: 32 focused tests and scoped lint passed.
Seventeen temporary original PNGs were inspected from the local app, including
help EN phone/desktop, AR phone, KN tablet; prices EN phone/AR tablet loading
headers; solar AR phone/KN desktop; contact EN phone; help contact AR phone;
Kannada sign-in guide; Arabic preprocessor help; four English editorial phone
headers; and Arabic 404. Actual CDP glyph checks passed for Geist, Noto Sans
Arabic and Noto Sans Kannada. None had horizontal overflow. The editorial
headers had no new layout issue in these views. These are diagnostic views,
with development indicators, not final guide evidence or full route coverage.
Originals and geometry: `/private/tmp/luma-public-ui-after/`.

Public/help source has its diagnostic checkpoint above. Admin material
classification and manufacturer stock intake are now in progress. Final
captures wait for the root agent to freeze source, finish connected acceptance
and release the capture window.
Older interrupted captures remain historical evidence, including the pre-font
Arabic images. They must not be relabelled as final current UI.

## Booking copy correction

The founder approved four existing-key corrections in all 33 catalogues:
`participants.householdBody`, `help.roles.household.lead`,
`help.guides.firstPickup.summary` and `sell.promises.noAccount`. Booking now
states that the mobile number must be verified. The unsupported two-minute
claim is removed. Public bearer-link tracking copy stays unchanged. Native/error
copy generation was rerun; coverage hashes and focused checks are refreshed.
Translations are machine-drafted; native-speaker review remains pending.

## Guide impact

Replace affected public prices, solar/contact/help headers, auth and account
screens, workspace/team views, role dashboards, requests, market, stock, trades,
lot forms, admin overview/price/support and failure/recovery images. Preserve
all useful instructions and distinguish local connected evidence from fixtures.
The root agent owns `guide.md`, the maintained DOCX, build/review records and
cloud state; page owners supply the exact changed paths and capture notes.

## Worktree cleanup after verified completion

The founder requested eventual cleanup of all Luma task worktrees. Cleanup is a
final phase, after accepted changes and required evidence are integrated. Root
must inventory each managed worktree and its owner, dirty/untracked state,
unpushed commits and attachments. Do not remove the original checkout's unrelated
work. Preserve needed ignored state before archive, especially the restricted
local acceptance annex, local Convex data/export recovery files, review evidence
and any fixture inputs that are not reproducible. Keep secrets outside Git and
shared documents. Use the managed archive operation so each archive has a
recoverable Git snapshot. Record what was preserved and where before removing a
checkout; verify the remaining primary checkout and needed artifacts afterward.
