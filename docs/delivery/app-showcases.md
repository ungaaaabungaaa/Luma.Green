# Platform imagery and role app previews — 1 October 2026

Task baseline: `6ca9391`, branch `feat/pilot-readiness-cleanup`. The existing
untracked root `luma-green-user-guide.pdf` belongs to the user and is preserved.

The founder clarified that the platform needed more images throughout, with
mock-ups only where they help explain a role. This delivery adds eight generated
scenes and seven localized app preview variants. Dense tables, transaction
records and focused controls remain clear.

## Where images appear

| Area                              | Placement                                                              |
| --------------------------------- | ---------------------------------------------------------------------- |
| Home                              | Six role cards; existing hero artwork retained                         |
| Participants                      | Seven role scenes with seven illustrative app previews                 |
| Join                              | Five role cards; compact image below each resolved onboarding form     |
| Sign-in                           | Collection scene beside the form; short image below it on phones       |
| Sell                              | Household sorting scene in the introduction                            |
| Help                              | General help image and six role hero scenes; six compact app previews  |
| How it works                      | Three material-chain scenes                                            |
| Prices, standards, solar, contact | Relevant image in each page header                                     |
| Workspace homes                   | Compact images for kabadiwala, yard, recycler, manufacturer and Saathi |
| Admin                             | Operations scene on access pages and the overview                      |

The 13 app-preview placements use inert, translated HTML. Phone frames suit
field roles; browser frames suit desk work. Each is labelled as an illustration,
not a live record, real transaction or released native app. Account permissions,
queries, forms, state transitions and payment behavior are unchanged.

## Image cost and provenance

Eight WebP assets total **1,084,472 bytes**, with each below 180,000 bytes. Static
imports use the existing Next image optimizer and content-hashed cache. Images
load lazily; reserved dimensions prevent page jumps. Narrow 180px and 256px
panels provide matching responsive `sizes`. No new dependency, database work or
runtime image-generation API is added.

[Image provenance](../design/showcase-images.md) records the built-in image tool,
source files, compression settings, four exact prompts and four recovered briefs.
The interrupted generation session did not leave the last four exact prompts;
these briefs are not presented as verbatim tool inputs. Generated scenes are not
photographs of actual staff, facilities, customers or certified operations.

## Verification and documentation

Configured and fresh-cache normal production builds passed (925 pages). The final
55 standard Chromium checks passed, including image loading, menu access,
English/Arabic/Urdu phone layouts, reduced motion and the corrected crop's computed
style. Five configured analytics checks passed with fake keys and intercepted
external requests. The image-source budget test passed. `pnpm check` passed: lint and typecheck,
1,152 web tests in 147 files, 23 mobile tests and 19 desktop tests. Formatting
and guide freshness checks passed. Two conditional-test lint warnings were
removed and the affected browser assertions rechecked before commit.

The navigation regression test now waits for DOM content and the menu's observable
state after a viewport change. Its previous full-load wait timed out on unfinished
responsive image requests, despite successful document delivery. Dedicated image
tests still wait for decoded image dimensions; this does not waive image checks.

Browser evidence covers 14 public routes, four public preview captures and
26 protected-screen fixture captures, including six at phone width. Seven
additional review screenshots cover desktop role sections and English/Arabic/Urdu
phone layouts. Public guide captures have no browser errors or external traffic.
Protected captures retain their visible synthetic-data label and cannot mutate
records. Their local image adapter is limited to documentation; production
browser checks exercise the real Next optimizer.

The guide adds chapter 36, explains image and app-preview boundaries, and refreshes
changed screens. Its editable source, unchanged browser PNGs, provenance manifests,
build record and 50-page PDF ship together. Shared image/adapter hashes require
recapture when those inputs change. A stale compiler cache omitted the final crop
class. Moving that cache aside and rebuilding restored it; browser computed styles
and the recaptured phone image verify the result. The final PDF was rendered and
all pages inspected, with changed pages checked again after final captures.

## Release limits and continuation

This is local UI and documentation evidence. Native-speaker review of new copy,
authenticated staging flows, signed native builds, hosted CI, deployment and
provider receipt remain separate gates in [the handoff](handoff.md). No schema,
secret, external account or provider setting changed.

No task worktree was created: agents used disjoint files in the existing branch.
The root PDF is the only pre-existing untracked file and must remain untouched.
Find this delivery with `git log -1 --grep='role app previews'`. Continue from the
handoff queue after confirming remote equality and checking new user changes.
