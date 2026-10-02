# Bind push registrations to authenticated sessions

Status: additive source change; deployment pending. No provider credentials or
live delivery are required to verify the change locally.

## Reason

A second browser tab can register a device after another tab removes its binding
but before the shared auth session signs out. Account ownership alone does not
make that replacement stop receiving pushes after logout.

## Widen

Add optional `pushDevices.sessionId`. Registration derives it from the current
server identity and checks the live Better Auth session's owner and expiry.
Clients cannot supply a profile, auth user or session binding in registration
arguments. Deploy the schema and corresponding registration/claim functions
together after the normal checks.

## Renew and retire

There is no inferred backfill: a profile or installation ID cannot prove a live
session. Existing unbound rows remain valid schema data but cannot be claimed.
Authenticated registration can bind the same token to its current session. Claim
cancels a stale delivery and audits retirement only when the device still belongs
to that delivery's owner. A new registration also prunes inactive rows within the
existing bounded ten-device lookup before enforcing the device limit.

The token is still owned by one account. A token renewed under another live
session of the same account can receive that account's earlier generic queued
updates. A token reassigned to another account cannot receive the previous
account's queued updates, and cancellation must not delete its new binding.

## Narrow

Keep the field optional during this release. A later release may require it only
after all legacy rows have been renewed or retired and a bounded audit confirms
none remain. Do not restore the old claim logic during rollback: disable push
channels first if the session-aware functions must be removed.

## Verification

- Real HTTP test: register, unregister, re-register from a second client sharing
  the session, sign out, queue a new event, and confirm the claim is cancelled.
- Check expired, revoked, owner-mismatched and legacy unbound sessions.
- Check renewal, independent live sessions, token handoff and exact audit counts.
- Check that ten inactive rows do not prevent a new authenticated registration.

These tests do not contact providers. Deployment and physical-device delivery
remain separate release gates. A delivery already claimed before logout may
already be dispatched; payloads remain generic and the inbox requires sign-in.
