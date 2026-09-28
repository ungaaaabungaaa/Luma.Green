# 0012. Pilot analytics in Convex; PostHog and Sentry later

- **Status:** Decided
- **Date:** 29 Sep 2026
- **Deciders:** founder, Claude

## Context

The pilot's purpose is to collect data and improve. The founder will add
PostHog "and all that" once the partner commits. The providers are already
stubbed in the repo and switch on when their keys appear.

## Decision

- Until then, pilot numbers come from our own data: an `events` table written
  by the same mutations that change state (booking created, accepted, weighed;
  application submitted, decided), plus the audit log.
- The admin console gets a **pilot numbers** page reading those tables.
- PostHog (funnels, session replay) and Sentry (errors) stay off; their keys
  stay empty. Errors in the meantime: Vercel and Convex dashboard logs.

## Consequences

- No third-party tracking of users during the pilot — simpler privacy notice.
- Front-end errors are invisible unless someone reports them. **Turn Sentry on
  first** when the partner decision is made; it's a key and a redeploy.

## Alternatives considered

- **PostHog now** — deferred by the founder.
