# Luma.Green docs

Everything we've decided about what to build, how it's built and how it's run.
Code rules live in [AGENTS.md](../AGENTS.md) and the
[skills](../.claude/skills); this folder holds the plan and the reasons.

**New here?** Read in this order: [vision](./product/vision.md) →
[roles](./product/roles.md) → [architecture overview](./architecture/overview.md)
→ [roadmap](./delivery/roadmap.md).

**Resuming implementation?** Start with the [agent handoff](./delivery/handoff.md).
It lists the continuation branch, completed commits, tests and ordered next tasks.

**Clickable prototype:**
[Luma.Green Prototype](https://claude.ai/artifact/4hiq2r5tm5kWDBqTGEPD8C) —
private until shared from its Share menu.

## Product — what and why

| Page                                                     | What's in it                                                   |
| -------------------------------------------------------- | -------------------------------------------------------------- |
| [vision.md](./product/vision.md)                         | The problem, the chain, principles, what's in and out of scope |
| [roles.md](./product/roles.md)                           | Every role, their device and sign-in, what each wants          |
| [onboarding.md](./product/onboarding.md)                 | Every field each role gives us, states, admin checks, messages |
| [household.md](./product/household.md)                   | Snap → book → track and get paid                               |
| [kabadiwala.md](./product/kabadiwala.md)                 | Requests, auto-accept, weigh and pay, stock, prices            |
| [kabadiwala-to-yard.md](./product/kabadiwala-to-yard.md) | The hand-off still being researched                            |
| [pricing.md](./product/pricing.md)                       | Rate cards, the minimum table and the fallback table           |
| [glossary.md](./product/glossary.md)                     | Every term, and its name in code                               |
| [open-questions.md](./product/open-questions.md)         | Decided and still-open questions                               |
| [brief.md](./product/brief.md)                           | The founder's own words, as captured                           |

## Architecture — how it's built

| Page                                                | What's in it                                                    |
| --------------------------------------------------- | --------------------------------------------------------------- |
| [overview.md](./architecture/overview.md)           | Containers, modules, key flows, failure modes, what comes later |
| [urls.md](./architecture/urls.md)                   | Route map, canonical and hreflang rules, indexing               |
| [frontend.md](./architecture/frontend.md)           | Layouts per area, look and feel, components, every screen       |
| [auth.md](./architecture/auth.md)                   | Sign-in for each role, the admin, permissions, private files    |
| [data-model.md](./architecture/data-model.md)       | Planned tables and state machines                               |
| [ai-estimation.md](./architecture/ai-estimation.md) | Photo → estimate, model choice, cost controls                   |
| [native-apps.md](./architecture/native-apps.md)     | Mobile and desktop ownership, navigation and update boundaries  |
| [decisions/](./decisions/README.md)                 | Architecture decision records, one per decision                 |

## Operations — how it's run

For caching, compression, self-hosted AI and cost measurements, use
[low-cost operation](./operations/low-cost-operation.md) and its
[verification record](./delivery/cost-optimization.md).

| Page                                                      | What's in it                                                     |
| --------------------------------------------------------- | ---------------------------------------------------------------- |
| [environments.md](./operations/environments.md)           | Local, preview, production; releases; where each variable lives  |
| [launch-checklist.md](./operations/launch-checklist.md)   | Accounts, exact environment variables and launch verification    |
| [app-releases.md](./operations/app-releases.md)           | App accounts, environment values, signing and release acceptance |
| [sms-notifications.md](./operations/sms-notifications.md) | Status-message templates, outbox behavior and provider checks    |
| [services.md](./operations/services.md)                   | Every outside service, its status, SMS templates to register     |
| [backups.md](./operations/backups.md)                     | Daily local backups, restores, drills                            |
| [data-protection.md](./operations/data-protection.md)     | What personal data we hold, why, for how long; breach steps      |
| [incidents.md](./operations/incidents.md)                 | When something breaks                                            |
| [migrations/](./migrations/README.md)                     | Changing the schema safely, and the log                          |

## Delivery

| Page                                                  | What's in it                                               |
| ----------------------------------------------------- | ---------------------------------------------------------- |
| [cleanup-progress.md](./delivery/cleanup-progress.md) | UI and pilot implementation evidence from 1 October        |
| [apps-and-motion.md](./delivery/apps-and-motion.md)   | Native app and interface implementation evidence           |
| [roadmap.md](./delivery/roadmap.md)                   | Week by week to the pilot, the cut line, the critical path |
| [pilot.md](./delivery/pilot.md)                       | Who, what has to work, what we measure                     |

## Platform user guide

Use the [A-to-Z user guide](user-guide/guide.md) for role workflows and admin
access, or open the [PDF](../output/pdf/luma-green-user-guide.pdf).
[Capture and rebuild instructions](user-guide/README.md) explain the screenshot
evidence labels and the mandatory update process. Source, screenshots and PDF
must be updated together when the user experience changes.

## Keeping these docs true

- A pull request that changes behaviour updates the page that describes it.
- A decision that would be expensive to reverse gets an
  [ADR](./decisions/README.md).
- An answered question moves to _Decided_ in
  [open-questions.md](./product/open-questions.md) with the date.
- Each page starts with a **Status** line; if it says "planned" and the thing
  is built, update it.
