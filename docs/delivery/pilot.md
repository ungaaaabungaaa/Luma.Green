# Pilot plan

> Implementation note, 1 Oct 2026: `/admin/pilot` measures stored bookings and
> application reviews. It does not measure abandoned flows, photo usage or
> original AI accuracy. Submitted basket weights can include manual changes.
> Reports include all records in the period, including demo records, and show
> truncation warnings. See the [delivery log](cleanup-progress.md).

> **Status:** draft, 29 Sep 2026. Pilot window: 13–20 October 2026, Bengaluru.

## Who

- **Team:** the founder and two testers, each playing real roles.
- **Kabadiwalas:** a handful of verified shops in one or two neighbourhoods —
  **open**: which ones and where.
- **Households:** people the team knows in those neighbourhoods first, then
  their neighbours.
- **One yard**, if the hand-off research is done in time; otherwise the pilot
  stops at the kabadiwala.

## What has to work

1. A kabadiwala joins, is verified within 24 hours and sets prices.
2. A household photographs scrap, books with an SMS code and gets a tracking
   link.
3. The kabadiwala accepts (or auto-accepts), picks up, weighs and records
   payment.
4. The household sees what was paid and the points earned.

## What we measure

From our own `events` and records ([ADR 0012](../decisions/0012-pilot-analytics-in-convex.md)),
shown on the admin's pilot numbers page:

| Measure                                    | Why it matters                                     |
| ------------------------------------------ | -------------------------------------------------- |
| Photo → booked (share of households)       | Is the three-step flow simple enough?              |
| Time to accept a booking                   | Do kabadiwalas respond, and does auto-accept help? |
| Bookings completed vs cancelled or expired | Does dispatch work?                                |
| Estimated vs weighed kg, per material      | How good is the AI estimate?                       |
| Paid vs estimated ₹                        | Do households feel the estimate was fair?          |
| Kilograms and rupees through the platform  | The business we generate                           |
| Application submitted → decided (hours)    | Is the 12–24 hour promise realistic?               |
| Where people drop out of onboarding        | Which form step is too hard                        |

## How we listen

- A two-question follow-up SMS after each pickup (rating and one comment).
- A weekly visit or call with each pilot kabadiwala.
- One review a week of the numbers above; decisions go in
  [open-questions.md](../product/open-questions.md).

## Stop or change course if

- Personal data is exposed — follow [incidents.md](../operations/incidents.md).
- Kabadiwalas stop accepting because pickups are unprofitable — revisit prices
  and the minimum table first.
