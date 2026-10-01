# Roadmap to the pilot

> **Current implementation checkpoint:** [agent handoff](handoff.md). Use its
> ordered queue to resume work; the dated schedule below is the original plan.

> Implementation update, 1 Oct 2026: dispatch, photo estimates, status-message
> adapters and the pilot report are implemented in the current branch. External
> account approval and live provider checks remain. See the
> [delivery log](cleanup-progress.md) and [launch checklist](../operations/launch-checklist.md).
> Native shells and motion were added at the founder's request on 1 October;
> [source and release evidence](apps-and-motion.md) are tracked separately from store approval.

> **Status:** plan as of Tue 29 Sep 2026. Goal: real users in Bengaluru between
> **13 and 20 October 2026**. Every change ships straight to production once its
> checks pass.

## Week 1 — 29 Sep to 5 Oct: the door

| Work                                                                                                                            | Who     |
| ------------------------------------------------------------------------------------------------------------------------------- | ------- |
| ✅ Planning docs, decisions, URL plan, backup plan (this folder)                                                                | Claude  |
| White theme only — remove dark mode                                                                                             | Claude  |
| Sign-in: Better Auth on Convex; phone codes; admin password + authenticator                                                     | Claude  |
| Onboarding for every role: forms, uploads, drafts, status screen                                                                | Claude  |
| Admin: sign-in and verification queue                                                                                           | Claude  |
| **Start DLT registration** (entity, sender ID, templates in [services.md](../operations/services.md#sms-templates-to-register)) | Founder |
| **Convex deploy keys** in Vercel; **point `luma.green`** at Vercel                                                              | Founder |
| **Daily local backups** on the Mac ([backups.md](../operations/backups.md))                                                     | Founder |

## Week 2 — 6 to 12 Oct: the first pickup

| Work                                                                       | Who              |
| -------------------------------------------------------------------------- | ---------------- |
| Price tables: minimum and fallback (admin), rate cards (kabadiwala)        | Claude           |
| Household: snap → estimate → book (SMS code) → track                       | Claude           |
| AI estimate on OpenRouter with a spend limit; labelled Bengaluru photo set | Claude + founder |
| Kabadiwala: requests, auto-accept, today, weigh and pay, stock             | Claude           |
| SMS notifications once DLT templates are approved                          | Claude           |
| Fill the minimum and fallback tables for Bengaluru                         | Founder          |
| Onboard the pilot kabadiwalas through the real flow                        | Founder          |

## Week 3 — 13 to 20 Oct: pilot

| Work                                                            | Who      |
| --------------------------------------------------------------- | -------- |
| Pilot with the founder and two testers ([pilot.md](./pilot.md)) | Everyone |
| Pilot numbers page in the admin console                         | Claude   |
| Fix what the pilot breaks, daily                                | Claude   |
| First monthly restore drill                                     | Founder  |

## Cut line — not before the pilot

Kabadiwala → yard collections (until the research is in) · recycler and
manufacturer trading · escrow · carbon credits · solar, documentation and legal
services · machinery data bank · WhatsApp channel · Saathi jobs and pay · PostHog and Sentry · team members for the admin.

## Critical path — things that take days no matter how fast we build

1. **DLT approval for MSG91** — without it, no SMS codes in production: no
   business sign-in and no household bookings.
2. **Pointing `luma.green`** at Vercel.
3. **Convex production deploy key** in Vercel — without it, merges don't reach
   the production backend.
4. **Optional AI activation:** configure either a self-hosted endpoint or an
   OpenRouter key with a spend limit. Manual material entry needs neither.
