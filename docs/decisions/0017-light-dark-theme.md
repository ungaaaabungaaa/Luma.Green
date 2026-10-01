# 0017. Light, dark and system appearance

- **Status:** Decided
- **Date:** 2 October 2026
- **Decider:** founder's explicit UI redesign request
- **Supersedes:** only the white-only theme policy in ADR 0010

## Context

The founder requested a richer shared interface with light and dark mode. The
existing Next.js, Radix/shadcn and Tailwind components already use semantic
variables, but many decorative surfaces used a fixed pale green.

## Decision

Use one shared semantic token system with light and dark values. A device-local
appearance control offers Light, Dark and System. System is the default. A small
first-paint bootstrap reads the preference before the page displays; the React
provider owns subsequent changes and follows system changes. Storage failures
must not break navigation. No preference is written to the database.

Public, authenticated and admin roots share the behavior. Admin labels remain
English; public controls use the twelve locale catalogues. Native shells inherit
the website's appearance; native controls keep their own platform behavior.

Keep Next.js Image and server components for public content. Use the published
MIT Magic UI shimmer as a small adapted component composed with existing
shadcn controls. Decorative motion respects reduced-motion preferences. Do not
add a second application framework or a second general component library.

## Consequences

Every surface needs contrast checks in both themes. Fixed inverse panels must
pair their own background and foreground colors. New public copy and menu labels
must remain localized. The guide includes real browser evidence of both themes;
its protected-screen fixtures remain explicitly synthetic.

This changes visual presentation only. Ledger values, permissions, authentication,
telemetry consent and native signing/update policy remain owned by their existing
modules. Hosted UI changes do not remove native binary or store release gates.
