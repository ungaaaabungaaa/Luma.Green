# Services and accounts

What is wired in code and what still needs a human with a login. Keep this
file current — it answers "is X set up?". Last reviewed 29 Sep 2026.

Legend: **✅ live** · **🟡 partly** · **🔑 needs a human** · **⏸ deferred** ·
**⬜ later**

## Core platform

| Service             | Status | Notes                                                                                                                                               |
| ------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Next.js 16          | ✅     | App Router, Turbopack, server components by default                                                                                                 |
| Tailwind v4         | ✅     | Tokens in `src/app/globals.css`; white theme only ([ADR 0010](../decisions/0010-white-theme-mobile-first-shadcn.md))                                |
| shadcn/ui           | ✅     | Vendored in `src/components/ui`; add more with the shadcn CLI                                                                                       |
| next-intl           | ✅     | 12 locales, hreflang, RTL                                                                                                                           |
| Convex              | 🟡     | Dev deployment live (`glorious-rooster-470`, EU West). Prod deploys need the deploy key — [switch-on](./environments.md#one-time-switch-on-founder) |
| Vercel              | 🟡     | Project `luma_green`; production at `lumagreen.vercel.app`, previews per PR. Build command not yet running `convex deploy`                          |
| Domain `luma.green` | 🔑     | Not resolving yet. Add it in Vercel and point DNS; `www` → apex                                                                                     |
| GitHub              | ✅     | Actions, Dependabot, branch protection, templates                                                                                                   |
| CodeRabbit          | 🔑     | `.coderabbit.yaml` committed; install the GitHub app                                                                                                |

> **Vercel plan.** Vercel's free Hobby plan is for personal, non-commercial
> projects. Check the current terms and move the project to Pro before the
> pilot takes real business.

## Product services

| Service                 | Status | Notes                                                                                               |
| ----------------------- | ------ | --------------------------------------------------------------------------------------------------- |
| Better Auth (on Convex) | 🟡     | Decided ([ADR 0004](../decisions/0004-auth-phone-otp-and-admin-totp.md)); built with onboarding     |
| MSG91 (SMS codes)       | 🔑     | Founder is registering on DLT. Needs: principal entity, sender ID, and the templates below approved |
| OpenRouter (AI)         | 🔑     | Set a **hard spend limit** on each key before it leaves local                                       |
| Mapbox                  | 🔑     | Token must be URL-restricted before shipping                                                        |
| PostHog                 | ⏸      | Deferred until the partner decision ([ADR 0012](../decisions/0012-pilot-analytics-in-convex.md))    |
| Sentry                  | ⏸      | Same. Turn on first when the decision is made                                                       |
| Resend (email)          | ⬜     | Not needed in the pilot                                                                             |
| Razorpay                | ⬜     | Escrow after the pilot ([ADR 0009](../decisions/0009-money-off-platform-first.md))                  |
| Cloudflare R2           | ⬜     | Only if files outgrow Convex storage or need expiring links                                         |
| WhatsApp Business       | ⬜     | Household channel after the pilot                                                                   |

### SMS templates to register

**DLT in short** (TRAI rules as amended Feb 2025; MSG91's guides): register
Luma.Green as a _principal entity_ on a telecom operator's DLT portal (PAN,
GST, identity and address proof, an authorisation letter; ₹5,000 + GST), then a
6-letter **sender ID** that matches the brand, then link it to MSG91's
telemarketer ID ("chain binding"). Each template names the brand, marks
variables as `{#var#}` and takes 2–4 working days to approve; allow **about a
week** end to end. A sign-in code sent within 30 minutes of the user asking is
_transactional_ — no consent template needed. In MSG91, an OTP template uses
`##OTP##` and is sent with `POST https://control.msg91.com/api/v5/otp`.

Every SMS must match a DLT-approved template exactly, per language (Unicode
templates for Kannada and Hindi). Register at least these, in English, Kannada
and Hindi, with `{#var#}` placeholders:

| Template                | Example (English)                                                                         |
| ----------------------- | ----------------------------------------------------------------------------------------- |
| Sign-in / booking code  | `{#var#} is your Luma.Green code. It expires in 5 minutes. Do not share it. - Luma.Green` |
| Application received    | `We have received your Luma.Green application. We usually reply within 24 hours.`         |
| Application approved    | `Your Luma.Green account is verified. Open the app: {#var#}`                              |
| Changes requested       | `Please update your Luma.Green application: {#var#}. Open: {#var#}`                       |
| Application rejected    | `We could not verify your Luma.Green application. Reason: {#var#}. Call {#var#}`          |
| Booking confirmed       | `Pickup booked for {#var#}. Track it: {#var#}`                                            |
| Kabadiwala assigned     | `{#var#} from {#var#} will collect your scrap on {#var#}. Track: {#var#}`                 |
| New pickup (kabadiwala) | `New pickup request near you: {#var#}. Open Luma.Green to accept.`                        |

## Mobile

| Item                | Status | Notes                                                         |
| ------------------- | ------ | ------------------------------------------------------------- |
| Installable web app | 🟡     | Manifest exists; install prompt comes with the kabadiwala app |
| Expo / React Native | ⬜     | After the pilot; `ios/` and `android/` are placeholders       |

## Operations

| Item                   | Status | Notes                                                      |
| ---------------------- | ------ | ---------------------------------------------------------- |
| CI (5 required checks) | ✅     | [ci-checks skill](../../.claude/skills/ci-checks/SKILL.md) |
| E2E (Playwright)       | ✅     | PRs only, path-filtered                                    |
| Daily local backups    | 🔑     | Founder's Mac; set up from [backups.md](./backups.md)      |
| Uptime monitoring      | ⬜     | Better Stack or UptimeRobot once the domain is live        |

## Accounts hygiene

- Separate Google accounts for production, support and billing.
- All shared credentials in one password manager (1Password or Bitwarden) —
  never in chat, email or a repo.
- An emergency admin account with recovery codes stored offline; the admin's
  authenticator backup codes too.
- Every third-party key gets a spend limit or quota where the vendor offers one.
