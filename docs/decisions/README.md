# Architecture decisions

One short record per decision that would be expensive to reverse. Read the
list top to bottom to see how the platform got its shape.

## How to add one

1. Copy [0000-template.md](./0000-template.md) to the next number:
   `NNNN-short-title.md`.
2. Fill it in. Keep it to one screen — context, the decision, what it costs.
3. Link it from the doc it affects, and add it to the table below.
4. Never edit a decided record to change its meaning. Write a new one that
   **supersedes** it and mark the old one `Superseded by NNNN`.

## Index

| #    | Decision                                                                                                 | Status                     | Date        |
| ---- | -------------------------------------------------------------------------------------------------------- | -------------------------- | ----------- |
| 0001 | [Record architecture decisions](./0001-record-architecture-decisions.md)                                 | Decided                    | 29 Sep 2026 |
| 0002 | [Convex is the backend, with dev and prod deployments](./0002-convex-as-the-backend.md)                  | Decided                    | 29 Sep 2026 |
| 0003 | [One Next.js app, areas as route groups](./0003-one-nextjs-app-with-route-group-areas.md)                | Decided                    | 29 Sep 2026 |
| 0004 | [Phone codes for users, password + authenticator for the admin](./0004-auth-phone-otp-and-admin-totp.md) | Decided                    | 29 Sep 2026 |
| 0005 | [Orgs by kind, visible by location and material](./0005-orgs-by-kind-visible-by-location.md)             | Decided                    | 29 Sep 2026 |
| 0006 | [Onboarding with manual verification](./0006-onboarding-with-manual-verification.md)                     | Decided                    | 29 Sep 2026 |
| 0007 | [URLs and canonical strategy](./0007-urls-and-canonical-strategy.md)                                     | Decided                    | 29 Sep 2026 |
| 0008 | [Prices: rate cards with a floor and a fallback](./0008-prices-rate-cards-with-floor-and-fallback.md)    | Decided                    | 29 Sep 2026 |
| 0009 | [Money stays off the platform in the pilot](./0009-money-off-platform-first.md)                          | Superseded by 0019 for B2B | 29 Sep 2026 |
| 0010 | [White theme, mobile first, shadcn/ui](./0010-white-theme-mobile-first-shadcn.md)                        | Theme superseded by 0017   | 29 Sep 2026 |
| 0011 | [AI estimates materials; our tables set prices](./0011-ai-estimates-priced-by-our-tables.md)             | Superseded by 0015         | 29 Sep 2026 |
| 0012 | [Pilot analytics in Convex; PostHog and Sentry later](./0012-pilot-analytics-in-convex.md)               | Superseded by 0016         | 29 Sep 2026 |
| 0013 | [Backups: Convex plus a daily local export](./0013-backups-convex-plus-daily-local.md)                   | Decided                    | 29 Sep 2026 |
| 0014 | [Shared web UI in native shells](./0014-shared-web-ui-in-native-shells.md)                               | Decided                    | 1 Oct 2026  |
| 0015 | [Bounded photo cache and selectable inference](./0015-bounded-photo-cache-and-selectable-inference.md)   | Decided                    | 1 Oct 2026  |
| 0016 | [Optional analytics and error monitoring](./0016-optional-analytics-and-error-monitoring.md)             | Decided                    | 1 Oct 2026  |
| 0017 | [Light, dark and system appearance](./0017-light-dark-theme.md)                                          | Decided                    | 2 Oct 2026  |
| 0018 | [Scoped industry REST API](./0018-scoped-industry-rest-api.md)                                           | Decided                    | 2 Oct 2026  |
| 0019 | [Business payments require a verified gateway](./0019-gateway-only-business-payments.md)                 | Decided                    | 6 Oct 2026  |
