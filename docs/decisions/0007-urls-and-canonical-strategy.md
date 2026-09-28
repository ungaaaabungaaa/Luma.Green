# 0007. URLs and canonical strategy

- **Status:** Decided
- **Date:** 29 Sep 2026
- **Deciders:** founder, Claude

## Context

12 locales, two of them right-to-left, 11 in non-Latin scripts. Public pages
should rank in every language; everything behind a sign-in or a share link must
stay out of search. Links are sent by SMS. The repo already uses next-intl with
`localePrefix: "as-needed"` and English slugs. Sources: Google Search Central
on hreflang, canonicals and noindex; next-intl routing docs (reviewed 29 Sep
2026).

## Decision

- Keep **`as-needed`**: English at `/…`, other languages at `/{code}/…`.
- Keep **English slugs in every language**; no translated `pathnames`.
- Canonical host **`https://luma.green`**, `www` redirects to it; no trailing
  slash.
- Public pages: **self-referencing canonical** in their own language plus
  **12 hreflang alternates and `x-default`** (the English URL), absolute, in the
  head only; next-intl's `Link` header off (`alternateLinks: false`); listed in
  the sitemap with the same alternates.
- Private areas (household flow, tracking, sign-in, onboarding, app, admin):
  `noindex, nofollow` meta and `X-Robots-Tag`; never in the sitemap; **not**
  blocked in `robots.txt`.
- Share links use short random tokens (`/t/{token}`), never database IDs.
- The admin console lives at `/admin`, outside the locale segment.
- The full route map: [architecture/urls.md](../architecture/urls.md).

## Consequences

- One helper builds every public page's metadata; the root layout stops setting
  alternates (children were inheriting the home page's canonical).
- SMS links stay short and readable in every language.
- Changing the prefix strategy later would rewrite every canonical URL — don't.

## Alternatives considered

- **`localePrefix: "always"`** — uniform URLs, no search benefit, one more
  redirect for most visitors.
- **Translated slugs** — long percent-encoded links in SMS; no ranking gain.
- **Blocking private areas in robots.txt** — hides their `noindex`, and blocked
  URLs can still be indexed from links.
