# Services and accounts

What is wired in code and what still needs a human with a login. Keep this
file current. Code was reviewed on 1 Oct 2026. Account and deployment notes
from 29 Sep are historical and have not been re-verified. Use the
[launch checklist](launch-checklist.md) for the current setup steps.

Legend: **✅ implemented** · **🟡 partly** · **🔑 needs a human** · **⏸ deferred** ·
**⬜ later**

## Core platform

| Service             | Status | Notes                                                                                                                                                                    |
| ------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Next.js 16          | ✅     | App Router, Turbopack, server components by default                                                                                                                      |
| Tailwind v4         | ✅     | Tokens in `src/app/globals.css`; white theme only ([ADR 0010](../decisions/0010-white-theme-mobile-first-shadcn.md))                                                     |
| shadcn/ui           | ✅     | Vendored in `src/components/ui`; add more with the shadcn CLI                                                                                                            |
| next-intl           | ✅     | 12 locales, hreflang, RTL                                                                                                                                                |
| Convex              | 🟡     | Historical dev deployment: `glorious-rooster-470`, EU West. Verify the target; production needs a deploy key — [switch-on](./environments.md#one-time-switch-on-founder) |
| Vercel              | 🟡     | Project `luma_green`; production at `lumagreen.vercel.app`, previews per PR. Build command not yet running `convex deploy`                                               |
| Domain `luma.green` | 🔑     | Verify DNS and the Vercel domain binding; route `www` to apex                                                                                                            |
| GitHub              | ✅     | Actions, Dependabot, branch protection, templates                                                                                                                        |
| CodeRabbit          | 🔑     | `.coderabbit.yaml` committed; install the GitHub app                                                                                                                     |

> **Vercel plan.** Check the current terms and choose a plan that permits
> the pilot's business use.

## Product services

| Service                 | Status | Notes                                                                                                   |
| ----------------------- | ------ | ------------------------------------------------------------------------------------------------------- |
| Better Auth (on Convex) | 🟡     | Implemented with onboarding, per-number OTP limits and recovery paths ([auth](../architecture/auth.md)) |
| MSG91 (SMS codes)       | 🔑     | OTP and status-message code implemented; account, sender and template approval remain external checks   |
| OpenRouter (AI)         | 🔑     | Photo estimates implemented; needs key, evaluated vision model and a hard spending limit                |
| Mapbox                  | ⬜     | Not used. Browser location and distance calculations need no map account                                |
| PostHog                 | ⏸      | Deferred until the partner decision ([ADR 0012](../decisions/0012-pilot-analytics-in-convex.md))        |
| Sentry                  | ⏸      | Same. Turn on first when the decision is made                                                           |
| Resend (email)          | ⬜     | Not needed in the pilot                                                                                 |
| Razorpay                | ⬜     | Escrow after the pilot ([ADR 0009](../decisions/0009-money-off-platform-first.md))                      |
| Cloudflare R2           | ⬜     | Only if files outgrow Convex storage or need expiring links                                             |
| WhatsApp Business       | ⬜     | Household channel after the pilot                                                                       |

### SMS templates to register

Use [MSG91's current setup documentation](https://docs.msg91.com/) and the
account dashboard to confirm registration, sender IDs, template category,
languages, fees and approval status. These requirements are external to the
application. The OTP adapter uses `POST /api/v5/otp`; status messages use Flow
and their own approved templates. Local tests do not send messages.

Prepare approved templates for the enabled launch languages. The examples
below describe intended content, not approved provider text. Confirm each
placeholder and URL against the actual template before enabling sends:

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
