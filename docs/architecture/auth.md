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
component.

- **Plugins:** `phoneNumber` (SMS codes), `emailAndPassword` (admin only, public
  sign-up switched off) and `twoFactor` (authenticator app). Convex's
  integration supports all three without schema changes. It pins Better Auth to
  a specific release (`~1.6.x` when checked on 29 Sep 2026), so the repo's
  `better-auth` version follows the component's, not the other way round.
- **Next.js:** `convexBetterAuthNextJs` provides the `/api/auth/[...all]`
  handler and server helpers (`getToken`, `isAuthenticated`). Protected route
  groups check the session in their **server layout** and redirect; a cookie
  check in `proxy.ts` alone is not security.
- **Browser:** sign-in and sign-out happen client-side through the auth client;
  Convex queries are gated with `useConvexAuth`.
- **Convex functions** resolve the caller through the component's validated
  user, never `ctx.auth.getUserIdentity()` alone (it doesn't validate the
  session), then load the `profiles` row and check role and org membership.

### SMS codes

- 6 digits, valid 5 minutes, 5 attempts, resend after 30 seconds.
- Rate limits: 3 codes per number per 15 minutes, 10 per day, and a per-device
  limit (Convex rate-limiter component).
- **Sending:** Better Auth's `sendOTP` writes an outbox row and schedules an
  internal action, which calls MSG91 with our DLT template and records the
  result. Nothing is left as an un-awaited promise, which Convex may drop.
- **Without MSG91 keys** (every var is optional): on the **dev** deployment the
  code is written to the Convex function log for testing; on **production** the
  phone sign-in says "opening soon" instead of pretending to send.
- **Test numbers** with fixed codes exist only on dev and preview deployments,
  controlled by a Convex environment variable that production never has.

### The admin

- **One admin account.** Created once with a bootstrap command run by the
  founder (`npx convex run --prod identity:bootstrapAdmin`), which prints a
  one-time link to set the password. Public sign-up with email is off.
- **First sign-in** enrols an authenticator app (QR code) and shows backup
  codes to store offline. Every later sign-in needs the password and a code.
- **Profile, not credentials.** Name, email, phone, date of birth and the
  **last four** Aadhaar digits are kept in `adminProfiles` as the admin's
  identity record. They are never used to sign in: those details aren't
  secret, and a private company may not store full Aadhaar numbers.
- Session length 12 hours; the admin area always re-checks the role in Convex.

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
