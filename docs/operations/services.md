# Services and accounts

> Status: inventory updated 6 October 2026. This is a setup and evidence record,
> not a claim of live provider readiness. Account ownership is unverified unless
> stated below. The [setup checklist](launch-checklist.md) owns exact settings;
> the [10 October test plan](../testing/launch-2026-10-10.md) owns acceptance.

The approved plan adds normal verified email/password alongside phone OTP and
workspace email invitations. It requires gateway-only B2B payment. Earlier
claims that Resend is not needed, that demo escrow is a live path, or that
cloud test-code delivery is authorized are superseded for this work.

## Existing platform and access to reuse

| Service                                 | Current evidence and remaining action                                                                                                                                                                                                                                                    |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GitHub                                  | Existing repository and protected PR path. Verify required checks on the exact release head; owner access/recovery and current CI are release checks.                                                                                                                                    |
| Convex                                  | Existing dev `glorious-rooster-470` and prod `outstanding-buzzard-942`. The 6 October reset record verifies both empty and paused. Preserve recovery exports; deploy and reactivate only through the approved release.                                                                   |
| Local Convex                            | Anonymous local process reported at `127.0.0.1:3210` and HTTP actions at `127.0.0.1:3211`. Component auth, persistence and storage acceptance still need proof. Local deployments are beta and have no public URL; see [official limits](https://docs.convex.dev/cli/local-deployments). |
| Vercel                                  | Existing `luma_green` project. Confirm domain, branch, environment and build command. Default repository build does not deploy Convex; configured release build must deploy the matching backend first.                                                                                  |
| Domain and DNS                          | Reuse `luma.green` ownership. Verify registrar access, Vercel HTTPS/domain records and Resend sending-domain records. DNS access is not yet verified here.                                                                                                                               |
| Better Auth                             | Existing self-hosted library on Convex; no separate account. New normal email verification/reset and invitations are under implementation. Admin TOTP and recovery remain separate.                                                                                                      |
| Next.js, Tailwind, shadcn and next-intl | Existing local packages, not service accounts. Keep the current UI contract and all registered locales; an installed package is not acceptance evidence.                                                                                                                                 |

## Required external paths for the approved launch

| Service             | Setup and release gate                                                                                                                                                                                                                                                |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Resend email        | Required for production email signup verification, password reset and workspace invite delivery under the approved plan. Create/verify account, owned domain, DNS, restricted sending key and sender. Existing admin recovery code does not prove the new paths work. |
| MSG91 OTP           | Required for production phone signup/login. Create/verify account, DLT entity/header/content approvals, OTP template, credits and limits. The local pass sends no external SMS. Require controlled-handset proof before production.                                   |
| MSG91 Flow          | Optional status messages for booking/application events once configured. Use separate approved Flow IDs and language mappings. Verify actual recipient delivery separately from the API response.                                                                     |
| B2B payment gateway | Provider not selected and payment integration not established. Confirm marketplace/vendor settlement fit, eligibility and onboarding. Complete sandbox and live gates. Never replace gateway state with manual approval, payment-proof upload or simulated escrow.    |

[Razorpay Route](https://razorpay.com/docs/payments/route/) and
[Cashfree Easy Split](https://www.cashfree.com/docs/payments/split/overview)
are examples for provider review, not a recommendation that Luma is eligible.
Route publishes turnover/review eligibility; Easy Split needs account-manager
enablement. The [setup checklist](launch-checklist.md) records the current
checks. B2B payment-dependent actions remain blocked until verified gateway
state exists. A kabadiwala pays a household directly; Luma records that fact
without collecting or transferring those funds.

### SMS preparation

Prepare the exact approved content for the launch languages: sign-in/booking
code; application received, approved, changes requested and rejected; booking
confirmed; kabadiwala assigned; new pickup request. These are event purposes,
not approved message text. The detailed [SMS runbook](sms-notifications.md)
owns all eight status event keys, including events beyond this short list.
Check actual DLT text, variables, links, sender and Flow ID before enabling sends.
Do not claim a response time or service promise in a template without approval.
[MSG91 template setup](https://msg91.com/help/template/how-to-create-flow-id-to-send-sms-via-api)
explains the required mapping.

## Optional feature accounts

| Service                                            | When an account is needed                                                                                                                                                                      |
| -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| OpenRouter or self-hosted vision                   | Only for optional photo estimates. Use one selected endpoint with evaluation and limits; manual entry needs neither account nor model.                                                         |
| Sentry                                             | Only when error capture is enabled with the deployment flag and DSN. Verify scrubbed receipt.                                                                                                  |
| PostHog and Google Analytics 4                     | Only for enabled, consented public-page analytics. No private workflow data.                                                                                                                   |
| Search Console and Bing Webmaster Tools            | For domain ownership, sitemap and search operations. Verification is not indexing evidence.                                                                                                    |
| NewsAPI and data.gov.in                            | Only for explicitly enabled industry news or public-area data. Verify plan rights, quotas, source freshness and fallbacks.                                                                     |
| Browser push                                       | Generate VAPID credentials; no separate paid account implied. Device permission and delivery/revocation checks are required.                                                                   |
| Expo/EAS, Apple Developer, Google Play Console     | Needed for the corresponding native build/distribution path; stores require their own accounts/signing/review. Earlier handoff says not set up; current founder verification is still pending. |
| Apple desktop signing and Windows signing provider | Needed for signed desktop releases and trusted updates. A local unsigned pack is not a release artifact.                                                                                       |
| WhatsApp Business                                  | Later optional channel, not a present onboarding prerequisite.                                                                                                                                 |
| CodeRabbit, uptime and backup tooling              | Optional operations services; verify any existing account first and name the alert/recovery owner.                                                                                             |

No Mapbox account is needed for current browser location. No Cloudflare R2
account is needed for current Convex document storage. No payment key can make
an unimplemented gateway work. Follow [native app releases](app-releases.md),
[observability](observability.md), [push](push-notifications.md) and
[public data](public-data.md) for each enabled feature's setup.

## Access and evidence rules

- Use one named owner and recovery custodian per service; verify existing access
  before signup. Keep secrets in secured provider settings or a password manager.
- Local disposable auth tests stay local. No live keys, SMS/email delivery,
  production records or public development verification endpoint in that pass.
- Keep the restricted credentials annex outside Git and the shared guide.
  Give access only to the founder and named test team, then expire test accounts.
- Record configured, sandbox verified and live verified separately. For email
  and SMS, also record recipient receipt. Set quotas and costs before activation.
- Missing required accounts are launch blockers for their flows. Keep those
  flows listed; only the founder can explicitly change the proposed release
  scope. Saturday 10 October is conditional on passing evidence and readiness.
