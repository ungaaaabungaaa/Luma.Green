# Transactional SMS notifications

The pilot outbox covers booking confirmation, pickup offers, acceptance,
reassignment, application receipt, approval, changes requested and rejection.
SMS is optional. Booking and review work with no SMS settings.

## Setup checklist

Set these **Convex** environment variables only after account and DLT approval:

- `MSG91_AUTH_KEY`: the account key (also used by sign-in SMS).
- `MSG91_NOTIFICATION_TEMPLATES`: JSON object from event name to locale to approved
  MSG91 SMS template ID. Each template must use `VAR1` for the full HTTPS link.
  These are Flow/SMS template IDs, not `MSG91_OTP_TEMPLATE_ID`.
- `SMS_NOTIFICATION_BASE_URL`: the public HTTPS origin, with no path, query,
  credentials or fragment. For example, the verified production site origin.
- `MSG91_NOTIFICATION_ENGLISH_FALLBACK`: set to `true` only if the team approves
  English messages for locales with no approved template. Otherwise leave unset.

Configure only approved entries. Shape (replace the placeholder before use):

```json
{ "booking_confirmed": { "en": "<approved MSG91 SMS template ID>" } }
```

Supported event keys: `booking_confirmed`, `booking_offer`, `booking_accepted`,
`booking_reassigned`, `application_received`, `application_approved`,
`application_changes_requested`, `application_rejected`.

1. Register sender and templates with DLT and MSG91. Approve each language.
2. Register the destination link domain with the provider as required. URL
   shortening is disabled. Confirm that full links are accepted in `VAR1`.
3. Use static template text that matches the event. An offer is sent only while
   the booking needs a response. Auto-accepted bookings suppress that owner offer
   SMS; the owner sees them in the live app.
4. Configure cost limits and monitoring in MSG91. Application and booking
   rules bound event creation. The outbox permits at most 20 send attempts per
   profile in a rolling 24 hours, including failed and unknown attempts. This
   is not a replacement for account spend caps.
5. Deploy the additive `smsNotifications` table and internal functions before
   enabling keys. No migration or backfill is needed.
6. With permission, send one test per approved template/locale to a controlled
   number. Check the site link and actual handset delivery separately.

No account setup, deployment or live provider send is part of local verification.

## State and operations

The event mutation writes an outbox row and audit row together. A dedup key
prevents a second row for the same event and revision. Disabled events are
terminal and are not replayed when settings are later added.

A worker atomically reserves a pending row. It resolves the current phone from
its profile reference, checks that the event is still current, and sends once.
The only stored payload is record references, event, locale and revision. No
phone, OTP, link token, provider response text or secret is stored in the outbox
or audit log. Template identity and the selected language are recorded at claim.

- `pending`: queued for one attempt.
- `disabled`: missing or invalid configuration; no scheduled retry.
- `cancelled`: missing recipient, invalid Indian mobile, missing record or stale event.
- `rate_limited`: the recipient reached 20 attempts in a rolling 24 hours; no retry.
- `sending`: reserved. An independent, single 60-second watchdog resolves a
  crashed action to `unknown`.
- `provider_accepted`: MSG91 returned an HTTP success and `type: success`.
  This **does not mean delivered**. No delivery webhook is implemented.
- `failed`: HTTP client rejection or an explicit provider error.
- `unknown`: timeout, transport error, server error, unreadable response or
  a worker that did not record its result.

All state changes write `auditLog`. The request timeout is eight seconds.
There is no automatic retry for any outcome. Do not reset rows to pending:
MSG91 might have accepted an unknown request and another send can cost money
and duplicate the message. Check provider reports by event time and the
recipient profile through authorized operations. Confirm the current record
before an operator sends a separate message. No resend UI/API is included.
Use the `by_status_updatedAt` index for bounded inspection in the Convex console.
Remove template configuration to stop new sends; a call already in flight may finish.

For the pilot, offer messages go to the shop owner profile only. Drop-off
booking confirmation and manual acceptance are covered. Drop-off shop offer
notifications are not included. Notification references follow the owning
record retention policy; the outbox stores no independent contact details.

## Provider contract

Checked against the official [MSG91 Send SMS API](https://docs.msg91.com/sms/send-sms):
POST `https://control.msg91.com/api/v5/flow`, `authkey` header,
`template_id`, `short_url: "0"`, `recipients` with `mobiles` in international
format without `+`, and `VAR1`. The [template ID guide](https://msg91.com/help/text-sms/where-to-find-my-flow-id)
explains where account-specific IDs come from. No approved ID is supplied by code.
