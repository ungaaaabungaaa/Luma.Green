# Account inbox and device notifications

The account inbox is available at `/account/notifications` after sign-in. It
works for households, applicants and approved operators. Organisation approval
is not required to receive an application decision. Each person reads and marks
only their own entries. The page uses the active language and has no shared
cache of private data.

## Event ownership

The existing booking/application mutation calls `queueNotification`. The same
transaction adds one inbox entry per event and revision, even when SMS and push
are off. SMS remains a separate outbox. Its delivery status is not the inbox's
read status. No historical SMS records are imported into the inbox in this change.

The first event set covers booking confirmation, pickup offers, acceptance,
reassignment, application receipt, approval, changes requested and rejection.
The inbox stores event keys and timestamps. It does not store English sentences,
tracking tokens, phone numbers or verification documents.

## Web Push setup

Set these on the intended **Convex deployment**, not only in `.env.local`:

| Variable               | Purpose                                                           |
| ---------------------- | ----------------------------------------------------------------- |
| `WEB_PUSH_ENABLED`     | Set `true` only after credentials and browser checks pass.        |
| `WEB_PUSH_PUBLIC_KEY`  | Public VAPID key, 87 URL-safe base64 characters.                  |
| `WEB_PUSH_PRIVATE_KEY` | Private VAPID key, 43 URL-safe base64 characters. Keep in Convex. |
| `WEB_PUSH_SUBJECT`     | Operator contact, such as a valid `mailto:` address or HTTPS URL. |

Generate the key pair once using the installed `web-push` package in a secure
operator terminal. Do not paste the private key into a ticket, document or source
file. Changing the key pair requires browsers to subscribe again.

The signed-in page receives only the public key. The user selects **Enable**
before the browser asks for permission. Unsupported, denied and unconfigured
states have explicit feedback. HTTPS is required outside local development.
The notification-only service worker caches no pages or API responses.

Only Chrome/FCM, Mozilla, Apple Web Push and Windows notification service hosts
are accepted. Unknown endpoints are rejected. Delivery does not follow redirects.
Web subscription encryption keys and endpoints are private server fields and are
never returned by public queries or placed in audit metadata.

## Expo setup

Native setup remains in [app releases](app-releases.md). Remote notifications
require an Expo/EAS project, platform credentials and a development or signed
build on a physical device. Expo Go is not acceptance evidence.

On Convex set `EXPO_PUSH_ENABLED=true` and `EXPO_PUSH_ACCESS_TOKEN`. Enable Expo
push access-token security in the project as well. The native build's separate
push flag and project ID must be valid. The native Android channel is
`account-updates`.

The native shell accepts only `luma.push.enable` and `luma.push.status` from its
current trusted top document. Status never prompts. When permission already
exists, status can retrieve the current token. `luma-push-ready` and
`luma-push-changed` contain no token; the authenticated web provider responds with
a status request. The reply is a document `luma-push-result` event with a matching
bounded request ID. Enable has a 120-second consent window; status has 15 seconds.
Navigation or logout cancels the waiting request. The native token acquisition
itself is bounded separately.

## Consent, logout and privacy

- Browser storage holds only a consent flag, a pending cleanup flag and a random installation ID. Raw
  push tokens, endpoints and subscription keys are never persisted by the page.
- Convex derives the caller from a real session. An installation is indexed with
  its owner. Knowing another installation ID cannot revoke another account's
  devices. One token can bind to only one account at a time.
- Each device registration also records the exact live Better Auth session,
  checked against the profile's auth user on the server. Re-registration under
  a new session replaces that binding, even when its token has not changed.
  Immediately before claiming a delivery, the worker checks that session again.
  A deleted, expired, mismatched or absent session cancels the delivery and
  retires that owner's inactive device with an audit event. This server check
  also covers another tab re-registering between device cleanup and HTTP logout.
  Other active sessions and tokens reassigned to another account are preserved.
- Legacy device rows without a session binding are inactive until authenticated
  registration renews them. Registration prunes inactive bindings in its bounded
  ten-device check before applying the quota. Do not backfill a session from a
  profile or installation ID. See the [session-binding migration](../migrations/2026-10-03-push-session-binding.md).
- Member sign-out, admin sign-out and security reauthentication use the same
  `signOutWithDeviceRevocation(sessionId)` transaction in `src/lib/sign-out.ts`.
  It locks notification registration synchronously, before awaiting device
  cleanup. Settings show the existing loading label and cannot enable a new
  device while this session is leaving. Automatic restore, native renewal and
  direct registration calls also check the session lock.
- The transaction calls `revokeCurrentDevice()` to wait for a pending
  registration, remove any late result, and revoke all bindings for the current
  installation. It can revoke before initial token restoration. It then calls
  auth sign-out. A successful transaction retains the lock through provider
  cleanup and same-session remounts; a new authenticated session has its own
  lifecycle. Do not call auth sign-out directly from a new account control.
- If cleanup or auth sign-out fails, the transaction releases only that
  attempt's session lock so the person can retry. It does not remove a pending
  revocation marker on failure. Turning notifications off uses device cleanup
  alone; it does not start or release the sign-out transaction.
- A storage or network failure rejects revocation. The shared sign-out control
  keeps the session available and shows an error so the person can retry. Do not
  suppress that error and claim device cleanup succeeded. If browser storage is
  blocked, enable and cleanup cannot safely persist/read the installation choice.
- Failed cleanup remains marked across reloads. Restore does not register a new
  device while cleanup is pending. Sign-out waits for the cleanup lifecycle to
  be ready, then retries revocation. The flag clears only after cleanup succeeds.
- Device bindings expire after 30 days without renewal. A restore can renew a
  binding after half its lifetime. Turning notifications off revokes the current
  installation but does not alter the account inbox or other devices.
- A logout can race with a delivery already claimed or a provider call in flight.
  The claim is the server authorization boundary; it cannot recall a provider
  request after dispatch. All lock-screen
  payloads are therefore generic: “Luma.Green update” and a prompt to open the
  app, translated from the shared catalogue. There is no private record ID,
  address, amount, phone number or booking link in the push payload.
- Every tap opens the locale-aware account inbox. Sign-in and second-factor
  checks still apply. Push permission is not account authorization.

## Limits and delivery evidence

Each account has at most 10 device bindings and 30 new registrations per hour.
The outbox permits at most 30 claimed deliveries per account per rolling day.
Each delivery is claimed once and has an 8-second provider timeout. A 60-second
watchdog records an interrupted attempt as unknown. Unknown outcomes are not
automatically retried. A 404/410 Web Push response or Expo DeviceNotRegistered
removes only the relevant binding.

Expo ticket acceptance records a receipt ID and schedules one receipt lookup
after 15 minutes. A rejected receipt records failure and removes an invalid
device. Missing/temporarily unavailable receipts leave the state as provider
accepted. Acceptance is never presented as proof that a device displayed a push.

Electron uses the native OS permission gate and the standard Notification API
for new inbox entries while the app process is open. It does not register Web
Push. Closing or quitting the process stops these foreground notifications.

## Verification before enabling

Deploy the matching Convex schema and functions before enabling push credentials.
Coordinate this release with other backend work; do not overwrite another
active deployment from a stale branch. If the web release arrives first, the
notification query boundary shows an unavailable state and keeps the surrounding
application and its unsaved form state mounted. A missing inbox query affects
only the inbox section. This fallback is not proof of backend release completion.

Automated tests use synthetic accounts, intercepted provider calls and mock OS
permission results. They cover account isolation, idempotent events, device
rotation, restore/logout races, unsafe endpoints, disabled configuration,
permission denial, timeout and generic payloads. They do not send live alerts.

On an approved test deployment, verify Chrome, Firefox, Safari/iOS supported
install mode, Android and signed desktop builds. Test grant, denial, later OS
revocation, account switch, logout, offline cleanup, token rotation, a terminated
mobile app, tap while signed out, two-factor challenge, language changes and
delivery rejection. Confirm no sensitive text appears on a locked screen. Record
device, OS, build, channel, credential environment and the observed result.

Keep provider credentials off until these checks and the native account/signing
gates pass. A local build, JavaScript export or unsigned desktop pack proves none
of those external gates.

Sources: [Web Push package](https://github.com/web-push-libs/web-push),
[Expo delivery and receipts](https://docs.expo.dev/push-notifications/sending-notifications/),
[browser Push API](https://developer.mozilla.org/en-US/docs/Web/API/Push_API).
