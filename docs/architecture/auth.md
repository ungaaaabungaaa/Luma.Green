# Sign-in, roles and permissions

> **Status:** decided, 29 Sep 2026 —
> [ADR 0004](../decisions/0004-auth-phone-otp-and-admin-totp.md). Built first,
> with onboarding.

## Who signs in, and how

| Who                                                      | How                                                     | When                                        |
| -------------------------------------------------------- | ------------------------------------------------------- | ------------------------------------------- |
| Household                                                | Phone number + SMS code; email account is optional      | Verified phone remains required for booking |
| Kabadiwala, preprocessor, recycler, manufacturer, Saathi | Verified email + password, or phone number + SMS code   | `/login`                                    |
| Admin (one person)                                       | Email + password, then a 6-digit authenticator-app code | `/admin/login`                              |

A household phone confirmation creates a passwordless identity, so bookings and
points follow the number across devices. Email signup creates a separate verified
email identity. These methods do not silently merge accounts or bypass phone
verification required by booking.

### Verify a phone on an existing email account

A verified non-admin email member can open Account Security and explicitly verify
one unused Indian mobile number. The real SMS code is delivered through MSG91,
or through the secured inbox on the local-only test deployment. Delivery stays
unavailable without either configuration. This binds possession to the current
email identity; it does not merge an existing phone account or enable phone-only
sign-in for the email account. Continue to sign in with email and the existing
second factor, when enabled.

The verification endpoint requires the existing five-minute full-authentication
assurance. If it has expired, the screen offers sign-in again. A required TOTP
challenge must already have passed. Anonymous users, unverified email users,
admins, phone-only identities, already-bound identities and numbers owned by
another account are rejected. Generic user updates cannot set or remove a phone.
The Convex adapter checks unique phone ownership inside its write transaction.
The same transaction updates the matching profile and records `auth.phone.verified`
without copying the phone or code to the audit log. User identity, session and
TOTP remain unchanged. This supplies the verified matching phone required by the
payment preparation guard; it does not enable live payment processing.

## How it's built

**Better Auth, running inside Convex** through the `@convex-dev/better-auth`
component. Built and tested on 29 Sep 2026.

- **Plugins:** `phoneNumber` (SMS codes), `emailAndPassword` (verified normal-user
  email and a separate admin bootstrap requiring `ADMIN_EMAIL` plus the owner-held
  `ADMIN_SETUP_TOKEN`) and `twoFactor`
  (authenticator app, with backup codes).
- **Installed locally** (`convex/betterAuth/`). The component's tables come
  from our own plugin list: `pnpm auth:schema` writes
  `convex/betterAuth/generatedSchema.ts`, and `schema.ts` next to it adds our
  extra indexes. The packaged default schema lagged better-auth 1.6.33 — it
  had no room for the two-factor lockout fields — which is why. **Run
  `pnpm auth:schema` after changing a plugin or upgrading `better-auth`.**
- **Versions move together.** `@convex-dev/better-auth` 0.12 needs
  `better-auth` `>=1.6.11 <1.7`; the repo pins `~1.6.33` and Dependabot skips
  1.7+. Upgrade both in one PR, regenerate the schema, and test sign-in.
- **Next.js:** `convexBetterAuthNextJs` (`src/lib/auth-server.ts`) provides the
  `/api/auth/[...all]` proxy and server helpers (`isAuthenticated`,
  `getToken`). Protected layouts check the session on the server and redirect;
  a cookie check in `proxy.ts` alone is not security. On Vercel only the
  `.convex.cloud` URL is injected into builds, so the `.convex.site` URL is
  derived from it.
- **Browser:** sign-in and sign-out happen client-side through the auth client
  (`src/lib/auth-client.ts`); Convex queries are gated with `useConvexAuth`.
- **Convex functions** resolve the caller with `requireUser` / `requireAdmin`
  (`convex/lib/access.ts`), which use the component's session-validated user —
  never `ctx.auth.getUserIdentity()` alone — then load the `profiles` row.
- **Sessions** last 30 days from sign-in and are never extended
  (`disableSessionRefresh`); then a new phone or email sign-in. The admin's last 12 hours.
- **Rate limits** are stored in the database, so they hold across Convex
  requests: 10 requests a minute per client IP on the phone endpoints, 3 per
  10 seconds on two-factor. The client IP is Vercel's `x-forwarded-for`,
  passed through the Next.js proxy.
- **Public signing-key discovery:** only `GET /api/auth/convex/jwks` is exempt
  from the per-IP auth limiter through Better Auth's exact-path `customRules`.
  It returns public verification keys, creates no user session and grants no
  access. Convex verifiers share a network address; limiting their key fetches
  caused HTTP 429 responses and loss of client auth while login sessions remained
  valid. Other methods and auth routes retain their limits, including signup,
  sign-in, verification email, password recovery and token issuance. This rule
  does not cover the server-only `latest-jwks` route or expose private key fields.
  A real-handler regression performs 105 key reads from one IP and checks the
  existing credential quotas and unauthenticated token denial.

### SMS codes

- 6 digits, valid 5 minutes, 5 attempts per code, resend after 30 seconds.
- **Sending:** Better Auth's `sendOTP` schedules an internal action
  (`convex/sms.ts`), which calls MSG91's OTP API with our code and DLT
  template. The action has an 8-second timeout and checks the provider's
  success payload as well as its HTTP status. It does not automatically retry
  a timed-out send, which might already have reached the provider. Nothing is
  left as an un-awaited promise, which Convex may drop.
- **Without MSG91 keys:** the secured local inbox can receive the actual generated
  code only when both `SITE_URL` and system `CONVEX_SITE_URL` are loopback HTTP
  origins and `AUTH_LOCAL_TEST_MODE=true`. It also requires a loopback inbox URL
  and private bearer token. See [local delivery](../../scripts/local-auth/README.md).
  Delivery is awaited. There is no fixed demo code or OTP logging. The old
  `AUTH_DEV_MODE` flag no longer enables authentication delivery on any backend.
  Without either delivery path, `/login` offers the labelled code-entry preview;
  preview sends nothing, creates no session and cannot access private routes.
- **Before switching MSG91 on** — SMS costs money, and code endpoints attract
  SMS pumping:
  1. The server now enforces a 30-second resend delay, 3 requests per rolling
     15 minutes and 10 per rolling day before it creates a code. The quota
     uses a keyed phone digest, is shared across IP addresses, and expires
     after a day of inactivity. Failed or ambiguous sends still consume quota.
     Keep `BETTER_AUTH_SECRET` stable: rotating it resets these identifiers.
  2. Set MSG91's own per-number OTP limits in its dashboard.
  3. Anyone can call the Convex site URL directly and fake `x-forwarded-for`,
     which weakens the per-IP limit. Consider requiring a shared secret header
     that only our Next.js proxy sends.

### Optional authenticator for member accounts

Any signed-in household, applicant or business user can open
`/account/security`. Organisation approval is not required for account settings.
Phone-only identities remain passwordless. Email identities sign in with their
password and must provide it again for authenticator enrollment, disable and
recovery-code replacement. The same recent-sign-in proof applies to both methods.

- A complete sign-in grants five minutes to enable protection, replace recovery
  codes or disable protection. If protection is already enabled, both the primary
  sign-in and an authenticator/recovery code must have passed. The proof is bound to
  the user and the current server session; client flags cannot grant it.
- Setup shows a local QR image and a manual key. Protection starts only after a
  valid authenticator code. Existing sessions are revoked at that point. The ten
  recovery codes are shown in the current screen only; they are not stored in
  browser storage, logs or screenshots. Cancelling setup leaves protection off.
- Subsequent SMS verification creates a ten-minute signed challenge. It creates
  no usable session or Convex JWT until the second factor passes. This also
  applies to the household booking sign-in form.
- Better Auth 1.6.33 does not challenge SMS verification by default. The small
  `phoneTwoFactor` plugin extends its existing challenge hook to that route and
  runs before the Convex JWT hook. It retains the library's one-use challenge,
  atomic recovery-code update and account attempt limits. Trusted-device bypass
  is disabled, including previously issued trust cookies.
- A challenge permits five failed attempts; the account lockout also spans
  separate challenges. Expired or exhausted challenges require a new phone code.
  Regenerating recovery codes invalidates the previous set. A recovery code does
  not disable protection.
- Lost authenticator and no recovery code means the account cannot pass the
  second factor. There is no automatic SMS-only reset. Support must follow a
  separately approved identity recovery process; one is not enabled by this UI.
- Direct phone-password, phone-password-reset and number-change endpoints are
  disabled. Changing the registered number needs a separate verified workflow.
  The server checks forbidden number-change and trusted-device flags independently;
  a malformed unrelated option cannot disable either guard.
- Authenticator setup, enable/disable, recovery-code changes and password changes
  write audit events without secrets. Every private Convex operation still checks
  the stored session through `requireUser` / `requireAdmin`.

### Verified email accounts

`/login` shows Phone and Email tabs after the language choice. Email supports
sign-in, signup, verification resend and password recovery. All UI copy is in the
33 message catalogues; native-language review remains a release gate.

- Passwords contain 12–128 characters. Better Auth owns hashing, credentials,
  verification tokens and sessions. No service account is needed to create an
  identity in the existing Convex component.
- Signup creates an unverified identity and returns no session or Convex JWT.
  The verification link lasts 15 minutes. `/login/email/verify` removes the token
  from the address bar, sets no-referrer, and requires an explicit Verify action.
  Successful verification does not sign in; password and any enabled second
  factor are still required. Duplicate signup receives a neutral response and
  never replaces the existing password. Unverified users can request another
  verification message if the original send fails or the link expires.
- Optional Resend delivery uses server-only `RESEND_API_KEY`, `AUTH_FROM_EMAIL`
  and HTTPS `SITE_URL`. Missing config and provider failures produce unavailable
  states. A successful provider response proves acceptance, not inbox delivery.
  Links use fixed same-origin routes and the requested supported locale. Current
  transactional email templates are English; locale UI translations are separate.
- Normal-user recovery accepts only verified identities with an existing password
  credential. Unknown, unverified and phone-only accounts receive neutral results
  without email. A reset link lasts 15 minutes, works once and revokes sessions
  and previous primary-authentication proofs. It keeps the authenticator and
  recovery codes. `/login/email/reset` retains its token only in component memory.
- The reserved `phone.luma.green` placeholder domain cannot sign up through email
  or receive email verification/reset. Reset cannot add a password to a phone
  identity. Email change and account merging are not enabled by this work.
- The local runner stores real verification links and phone codes in memory only.
  Its bearer-protected API rejects browser Origin headers, has no CORS permission,
  limits payloads/messages and expires messages after 15 minutes. A browser flag
  cannot enable it. Cloud development, preview and production backends fail the
  local gate even with `AUTH_LOCAL_TEST_MODE=true`.
- Identity creation and successful email verification write audit events with
  the internal user ID only. No email address, password or token is recorded.
- Email signup, verification resend and password recovery have database-backed
  request limits. Phone delivery retains its existing per-number limits.

### The admin

- **One admin account:** first sign-up requires `ADMIN_EMAIL` and a separate
  `ADMIN_SETUP_TOKEN` set on the Convex deployment. Use a random token with at
  least 32 characters (maximum 512). Setup at **`/admin/setup`** collects the
  token, name, mobile, date of birth, last four Aadhaar digits, email and password,
  then requires an authenticator app and backup codes. Missing or invalid token
  configuration disables new account creation. The token is sent only in the
  `x-luma-admin-setup-token` header on sign-up. It is not a public env variable,
  session credential or mailbox-ownership check.
- **The owner supplies the setup token privately.** Remove it from the Convex
  environment after setup. Normal password/TOTP sign-in and completion of an
  already-created account do not need it. If an unexpected account already
  exists, stop and follow an owner-led incident/recovery procedure; this change
  does not prove ownership of a pre-existing account or erase one automatically.
- **Admin phone verification is rejected before session creation.** Phone codes
  cannot substitute for the admin password and second factor, even if an admin
  auth record has a linked phone number.
- **Every sign-in** at `/admin/login`: password, then a code from the app — or
  a backup code, each of which works once.
- **Profile, not credentials.** Name, email, phone, date of birth and the
  **last four** Aadhaar digits are kept in `adminProfiles` as the admin's
  identity record. They are never used to sign in: those details aren't
  secret, and a private company may not store full Aadhaar numbers.
- **Session: 12 hours**, capped when it's created. Every console query calls
  `requireAdmin`, which also requires the authenticator to be on.
- The console (`/admin`) is **English only** and outside the locale segment.

### Admin password recovery

The admin login and setup fields include password visibility and length guidance.
The server requires 12–128 characters. Guidance is not an entropy estimate.
Admin phone-code verification is rejected even if a phone number is attached to
the admin identity; the admin must use the password and authenticator route.

`/admin/forgot-password` and `/admin/reset-password` are implemented. Delivery is
optional: set `RESEND_API_KEY`, `ADMIN_RESET_FROM_EMAIL` (a verified sender address)
and an HTTPS `SITE_URL` in the Convex environment. No provider account or live
email execution is implied by the local tests. Without this configuration the
screen states that recovery is unavailable.

Only the configured `ADMIN_EMAIL` with an existing password credential can request
or redeem a reset. Other addresses receive the same neutral success response and
no email. The link is fixed to the site's admin reset route, expires after 15
minutes and works once. The provider request has an eight-second timeout, does not
follow redirects and does not retry an uncertain send. The handler awaits delivery
confirmation because Better Auth's default background helper hides provider errors.

A successful reset revokes active sessions and earlier pending sign-in proofs,
trust records and other reset links. It preserves the authenticator and recovery
codes. The new password still leads to the second-factor check. The reset page
removes its token from the address bar after reading it and uses a no-referrer
policy. Never capture reset tokens, passwords, QR keys or recovery codes for docs.

### Testing

- **Unit:** the rules live in pure functions (`convex/lib/*.test.ts`,
  `src/components/{auth,admin}/*.test.ts`); `convex/identity.test.ts` uses
  convex-test to check signed-out callers get nothing.
- **Handler integration:** `convex/auth-two-factor.test.ts` calls the actual
  Better Auth HTTP handlers and Convex component. It covers pending-session/JWT
  denial, old-session revocation, expiry, attempt limits, concurrent redemption,
  recovery replacement, admin-phone rejection and password-reset boundaries.
- **E2E** (`e2e/auth.spec.ts` and `e2e/account-settings.spec.ts`) also checks the
  disconnected preview and protected route return paths. Fixtures do not prove
  live SMS/email delivery or an authenticated production walkthrough.
- **Local browser acceptance:** run the secured inbox and a local Convex backend.
  Create disposable users through actual signup/verification handlers. Retrieve
  tokens in the protected runner, never from logs or direct auth table insertion.
  `convex/auth-email.test.ts` covers email verification, duplicate signup, wrong
  password, recovery, real second-factor enrollment, phone signup, and hosted
  rejection. Local tests do not prove Resend or MSG91 delivery.

## Roles and permissions

| Can…                                                  | Household | Applicant (not yet approved) | Approved kabadiwala / yard / recycler / manufacturer | Approved Saathi | Admin |
| ----------------------------------------------------- | :-------: | :--------------------------: | :--------------------------------------------------: | :-------------: | :---: |
| Create and track their own bookings                   |     ✓     |                              |                                                      |                 |   ✓   |
| Fill in and submit their own application              |           |              ✓               |             ✓ (edits go back to review)              |        ✓        |   ✓   |
| See and act on their org's requests, stock and prices |           |                              |                   ✓ (own org only)                   |                 |   ✓   |
| See a household's phone and address                   |           |                              |             After accepting that booking             |                 |   ✓   |
| Review applications, approve, reject, suspend         |           |                              |                                                      |                 |   ✓   |
| Edit minimum and fallback price tables                |           |                              |                                                      |                 |   ✓   |
| Open uploaded documents and IDs                       |           |          Their own           |                      Their own                       |    Their own    |   ✓   |

Every row is enforced inside Convex functions and covered by an authorisation
test ("org A can't read org B").

## Private files

A file URL from Convex storage works for anyone who has it, and can't be
revoked short of deleting the file. So:

- Photos, certificates and IDs are **never** handed out as plain storage URLs.
- They are served through a Convex **HTTP action** that checks the caller's
  session and permission on every request (files up to 20 MB — which is why
  video uploads are capped at 20 MB).
- If we need expiring links later, files move to Cloudflare R2 through the R2
  component.

## Later: team members

The admin will add team members after the pilot. The model already separates
platform staff (`profiles.kind = "admin"`) from business users; team members
become staff roles — _reviewer_ (verification only), _support_ (read-only plus
notes), _owner_ (everything) — with the permission table above gaining columns.
No schema rewrite is needed.

### Server session availability

Protected locale routes and the admin console use `hasServerSession` for the
server gate. It calls the configured Convex token endpoint with only the incoming
cookie, authorization and client IP headers. The check has no token cache and no
automatic retry. A valid token response permits rendering; explicit HTTP 401/403
keeps the sign-in redirect. HTTP 429, other failed responses, malformed success
responses and network failures stop private rendering and reach a recovery
boundary above the guarded layouts. These failures never claim that a valid
session has ended.

Recovery is an explicit current-page reload. It also recreates a browser auth
client that retained a failed token request; a segment-only retry does not do
that in the installed adapter. The existing token quota remains in force. Local
capture tools use separate client IPs and bounded quiet intervals that respect
`X-Retry-After`. Better Auth 1.6.33 resets its counter after the full quiet window
since the last accepted request, so a continuous capture can otherwise reach the
quota over more than one nominal window. No capture may silently sign in again.
