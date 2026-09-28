# 0004. Phone codes for users, password + authenticator for the admin

- **Status:** Decided
- **Date:** 29 Sep 2026
- **Deciders:** founder, Claude

## Context

- Kabadiwalas, yards, recyclers, manufacturers and Saathis are identified by
  their mobile number; many don't use email.
- Households must confirm their number when booking; the founder is setting up
  MSG91 with DLT registration.
- There is one admin. The founder proposed signing in with name, email,
  Aadhaar, date of birth and phone. Those details aren't secret, and a private
  company may not store full Aadhaar numbers, so they can't be credentials.
- Better Auth is already a dependency. Convex's Better Auth component supports
  the phone-number, email-and-password and two-factor (authenticator) plugins
  without schema changes. Convex Auth has no multi-factor sign-in.

## Decision

- **Better Auth inside Convex** (`@convex-dev/better-auth`), with the Next.js
  handler at `/api/auth/[...all]`.
- **Everyone except the admin:** phone number + 6-digit SMS code via MSG91.
  Households get a passwordless identity only when they book.
- **The admin:** email + password, then an authenticator-app code (TOTP), with
  backup codes. Created by a bootstrap command; public email sign-up is off.
  _Amended 29 Sep 2026: created through a one-time setup page,
  `/admin/setup`, open only while `ADMIN_EMAIL` is set and no admin exists —
  simpler for the founder than a command, and it enrols the authenticator in
  the same sitting._
  Name, email, phone, date of birth and the last four Aadhaar digits are stored
  as the admin's profile.
- Details: [architecture/auth.md](../architecture/auth.md).

## Consequences

- No SMS dependency for the admin; the admin can work before DLT approval.
- Phone sign-in can't go live in production until MSG91's DLT templates are
  approved. Until then it shows "opening soon" in production and logs codes on
  the dev deployment.
- The Better Auth version is pinned to what the Convex component supports.

## Alternatives considered

- **Sign-in by matching name, email, Aadhaar, date of birth and phone** —
  anyone who knows the admin gets full access; storing full Aadhaar isn't
  allowed.
- **Convex Auth** — no multi-factor sign-in.
- **Clerk or Auth0** — paid at scale, and Indian SMS delivery still needs DLT.
