# Sign-in, roles and permissions

> **Status:** decided, 29 Sep 2026 —
> [ADR 0004](../decisions/0004-auth-phone-otp-and-admin-totp.md). Built first,
> with onboarding.

## Who signs in, and how

| Who                                              | How                                                       | When              |
| ------------------------------------------------ | --------------------------------------------------------- | ----------------- |
| Household                                        | Phone number + SMS code — no password, no profile to fill | Only when booking |
| Kabadiwala, yard, recycler, manufacturer, Saathi | Phone number + SMS code                                   | `/login`          |
| Admin (one person)                               | Email + password, then a 6-digit authenticator-app code   | `/admin/login`    |

A household's phone confirmation creates a light, passwordless identity behind
the scenes, so their bookings and points follow the number to any device. To
them it is not an account — nothing to remember, nothing to fill in.

## How it's built

**Better Auth, running inside Convex** through the `@convex-dev/better-auth`
component. Built and tested on 29 Sep 2026.

- **Plugins:** `phoneNumber` (SMS codes), `emailAndPassword` (admin only — the
  server refuses sign-up for any address but `ADMIN_EMAIL`) and `twoFactor`
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
  (`disableSessionRefresh`); then a new SMS code. The admin's last 12 hours.
- **Rate limits** are stored in the database, so they hold across Convex
  requests: 10 requests a minute per client IP on the phone endpoints, 3 per
  10 seconds on two-factor. The client IP is Vercel's `x-forwarded-for`,
  passed through the Next.js proxy.

### SMS codes

- 6 digits, valid 5 minutes, 5 attempts per code, resend after 30 seconds.
- **Sending:** Better Auth's `sendOTP` schedules an internal action
  (`convex/sms.ts`), which calls MSG91's OTP API with our code and DLT
  template. The action has an 8-second timeout and checks the provider's
  success payload as well as its HTTP status. It does not automatically retry
  a timed-out send, which might already have reached the provider. Nothing is
  left as an un-awaited promise, which Convex may drop.
- **Without MSG91 keys** (every variable is optional): with `AUTH_DEV_MODE=true`
  (dev and preview only) the code is written to the Convex log, number masked;
  otherwise `/login` keeps the language and phone steps available and opens
  a labelled code-entry preview. Preview never calls the provider, creates a
  session or grants private access. Verify and Resend are disabled. A tab-only
  preview flag separates this state from a real sent-code flow; starting a real
  request clears that flag.
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

### The admin

- **One admin account:** whoever signs up with `ADMIN_EMAIL`, a Convex
  environment variable. Setup is at **`/admin/setup`**, open only while
  `ADMIN_EMAIL` is set and no admin exists: name, mobile, date of birth, last
  four Aadhaar digits, then email and password (12+ characters), then an
  authenticator app (QR code or typed key) and ten backup codes, shown once.
  It picks up where it left off if interrupted.
- **Set `ADMIN_EMAIL` right before running setup, then run it at once.** Until
  the account exists, anyone who knows the address could claim it. If setup
  says the account already exists and it wasn't you, delete that user in the
  Convex dashboard (component `betterAuth` → `user`) and start again.
- **Every sign-in** at `/admin/login`: password, then a code from the app — or
  a backup code, each of which works once.
- **Profile, not credentials.** Name, email, phone, date of birth and the
  **last four** Aadhaar digits are kept in `adminProfiles` as the admin's
  identity record. They are never used to sign in: those details aren't
  secret, and a private company may not store full Aadhaar numbers.
- **Session: 12 hours**, capped when it's created. Every console query calls
  `requireAdmin`, which also requires the authenticator to be on.
- The console (`/admin`) is **English only** and outside the locale segment.

### Testing

- **Unit:** the rules live in pure functions (`convex/lib/*.test.ts`,
  `src/components/{auth,admin}/*.test.ts`); `convex/identity.test.ts` uses
  convex-test to check signed-out callers get nothing.
- **E2E** (`e2e/auth.spec.ts`) runs against a build without Convex — the
  state production is in until it's switched on.
- **By hand, against the dev deployment:** `AUTH_DEV_MODE=true` is set there,
  so codes appear in `npx convex logs`. The dev admin test account's details
  are in your `.env.local` (`DEV_ADMIN_*`, never committed); add the key to
  an authenticator app to sign in.

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
