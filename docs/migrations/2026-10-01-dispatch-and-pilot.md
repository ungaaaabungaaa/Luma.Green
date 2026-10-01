# Pickup dispatch and pilot reports

> **Status:** implemented and checked locally, 1 October 2026. Not deployed.

## Schema change

This is an additive change. Existing documents remain valid.

- `orgs.autoAccept?` and `orgs.pickupRadiusKm?` store pickup preferences.
  Missing values mean manual acceptance and a 5 km radius.
- `bookings.dispatch?` stores the current offer attempt, deadline, attempted
  shops, and search origin. The origin is private. The public tracking view
  returns only offer timing, attempt count and an approximate-origin flag.
- `bookingOffers` records immutable offered, accepted, declined and timed-out
  events. Related booking changes also write `auditLog` in the same mutation.
- `orgs.by_kind_city_pickup` selects active pickup shops in one city.
- `bookings.by_createdAt` and `applications.by_submittedAt` support reports.
- `smsRateLimits` stores hashed-phone send timestamps for the separate SMS cap.

## Activation and compatibility

Deploy the schema and functions together. No backfill or narrowing is needed.
New home pickups use dispatch. Existing bookings and all drop-offs keep their
previous manual acceptance path; no timers are added to old records.

Only a shop owner can change automatic acceptance. It applies to future offers.
Automatic acceptance requires a shared household pin within the shop's radius.
Without that pin, dispatch uses the selected shop's location as an approximate
search origin and keeps manual acceptance. If no search origin exists, a failed
offer ends as declined. The booking form explains that a shared location is saved.

Each unanswered offer expires after 15 minutes. A timer acts only on its own
attempt while the booking is still requested. Accepted, cancelled and newer
offers are protected from old timers. Rejection and timeout select the nearest
eligible shop in the same city. A replacement must offer pickup, handle all
material families, have a known location inside its radius, and offer at least
the current estimated total. A shop is never offered the same booking twice.
Drop-offs never move to another shop. No eligible replacement, or a passed
appointment window, ends the booking as declined.

Dispatch reads all active pickup shops in the city before comparing distance.
The arbitrary first-200 limit is removed: it could miss the nearest shop and
incorrectly end a booking. This indexed city scan is for the small pilot. A
large-city rollout needs a spatial candidate index before Convex read limits
become a risk. There is no silent truncation in dispatch.

Tracking updates through Convex. Booking SMS messages are not added by this
change. No payments or provider requests are made.

## Pilot report

`/admin/pilot` requires the existing admin session and two-factor guard. Reports
use bookings created in the selected India-time period and applications whose
latest submission is in that period. Outcomes are their current states, not a
historical snapshot at the end of the period. A report covers at most 31 days.

The latest 1,000 rows per group are returned. A visible partial-report warning
appears when a group has more rows. Material and payment totals use only
completed bookings with receipts. Estimates are household estimates, not AI
measurements. Acceptance time is measured from booking to first acceptance.
Decision time uses the latest submission and decision, not historical rounds.

Photo-to-booking conversion and onboarding step drop-offs are not instrumented;
the report says so. Demo records are included if present in the deployment.
No personal contact data is returned by the report query.

## Checks before and after deployment

1. Run dispatch, household, shop, pilot and report-component tests.
2. Run lint, TypeScript and the build. Keep generated API registrations with
   the new `dispatch`, `lib/dispatch`, `pilot` and `lib/pilot` modules.
3. In a test deployment, book one manual pickup and check the scheduled expiry.
4. Reject an offer. Check the new shop, protected price and private contact data.
5. Accept or cancel before a timeout. Confirm its timer makes no change.
6. Open `/admin/pilot` with an admin session and compare one receipt to the totals.

Hosted deployment and live scheduled execution remain release checks. Local
Convex tests include execution of the scheduled timeout and stale timer replay.
