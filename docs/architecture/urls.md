# URLs and canonical rules

> **Status:** decided, 29 Sep 2026 —
> [ADR 0007](../decisions/0007-urls-and-canonical-strategy.md). Every new route
> follows this page and [`.claude/skills/seo`](../../.claude/skills/seo/SKILL.md).

## Principles

1. **One URL per page per language.** English lives at `/…`, every other
   language at `/{code}/…` — next-intl's `localePrefix: "as-needed"`, already in
   `src/i18n/routing.ts`. Codes come from `src/i18n/locales.ts`.
2. **English slugs in every language.** `/kn/sell`, never a Kannada slug. All 11
   other locales use non-Latin scripts, so translated slugs would become long
   percent-encoded strings in SMS links (and right-to-left in Urdu and Arabic).
   Google reads the language from the page and its hreflang tags, not the path.
3. **Lowercase, hyphenated, no trailing slash, no file extensions.** Next already
   redirects `/about/` to `/about`.
4. **One canonical host: `https://luma.green`.** `www.luma.green` redirects to
   it with a 301, set up on the Vercel domain. Until the domain is pointed at
   Vercel, production answers at `lumagreen.vercel.app`, but canonical links
   already use `luma.green` (`NEXT_PUBLIC_SITE_URL`).
5. **Public pages are indexed; everything else is not.** See _Indexing_ below.
6. **Nothing private is guessable.** Share links use random tokens; database IDs
   appear only inside signed-in areas.

## Route map

| Area             | URLs                                                                                                                                                 | Who                | Sign-in                          | Indexed | Route group            |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ | -------------------------------- | ------- | ---------------------- |
| Public site      | `/` · `/how-it-works` · `/participants` · `/contact`                                                                                                 | Everyone           | —                                | Yes     | `[locale]/(site)`      |
| Household entry  | `/sell`                                                                                                                                              | Households         | —                                | Yes     | `[locale]/(site)`      |
| Join entry       | `/join` — what each role is, with a start button                                                                                                     | Would-be partners  | —                                | Yes     | `[locale]/(site)`      |
| Household flow   | `/sell/estimate` · `/sell/book`                                                                                                                      | Households         | — (SMS code at booking)          | No      | `[locale]/(household)` |
| Booking tracking | `/t/{token}`                                                                                                                                         | The household      | Token                            | No      | `[locale]/(household)` |
| Sign in          | `/login` · `/login/verify`                                                                                                                           | All business roles | —                                | No      | `[locale]/(auth)`      |
| Onboarding       | `/join/kabadiwala` · `/join/{yard,recycler,manufacturer}` · `/join/{kind}/documents` · `/join/saathi` · `/join/status`                               | Applicants         | Phone                            | No      | `[locale]/(join)`      |
| Business app     | `/app` → `/app/{org}/…` (kabadiwala: `requests`, `today`, `today/{booking}/weigh`, `stock`, `prices`, `settings`)                                    | Approved orgs      | Phone                            | No      | `[locale]/(app)`       |
| Saathi app       | `/app/saathi/…` (after the pilot)                                                                                                                    | Approved Saathis   | Phone                            | No      | `[locale]/(app)`       |
| Admin console    | `/admin` · `/admin/login` · `/admin/verification` · `/admin/verification/{application}` · later `/admin/prices`, `/admin/bookings`, `/admin/metrics` | The admin          | Email + password + authenticator | No      | `admin/` (no locale)   |
| Auth endpoints   | `/api/auth/…`                                                                                                                                        | Browsers           | —                                | No      | `api/`                 |
| Webhooks         | `https://{deployment}.convex.site/…` (MSG91 delivery reports, later WhatsApp)                                                                        | Providers          | Signature                        | No      | Convex HTTP actions    |
| Files            | `/robots.txt` · `/sitemap.xml` · `/manifest.webmanifest` · `/icon.svg` · per-page Open Graph images                                                  | Crawlers, browsers | —                                | —       | `app/`                 |

Every localized URL above also exists with a locale prefix: `/kn/join/kabadiwala`,
`/hi/t/{token}`, and so on.

### Why these shapes

- **`/app/{org}/…`** carries the organisation's slug, like GitHub or Vercel. A
  person who later runs two shops can switch between them without a URL change,
  and a link to _Ramesh Kabadi Store's requests_ is stable.
- **`/join/{kind}`** uses the interface names (`yard`, not `preprocessor`).
  Yard, recycler and manufacturer share one component; the path picks the title
  and hints.
- **`/t/{token}`** is short enough for an SMS. The token is 10 characters from
  an unambiguous alphabet (about 50 bits), unguessable and single-purpose; the
  SMS link carries the household's locale, e.g. `luma.green/kn/t/k7q2m9xw4c`.
- **`/admin` sits outside the locale segment.** It is an internal tool for one
  operator, English only, with its own root layout. The proxy matcher excludes
  it — otherwise next-intl rewrites `/admin` to `/en/admin`.
- **`/join/status`** is where an applicant lands after signing in without a
  `?next=`: it shows the role picker, their draft, or where their application
  stands.
- **`?next=`** on `/login` only accepts a relative path that starts with a single
  `/`. Anything else is ignored, so the login page can't be used as an open
  redirect.

## Canonical and hreflang (public pages)

- Each public page's canonical is **itself, in its own language**:
  `https://luma.green/kn/sell` canonicals to `https://luma.green/kn/sell`.
  Pointing every language at English would drop the other 11 from search.
- Each page lists **all 33 languages plus `x-default`** (→ the English URL), with
  absolute URLs, reciprocally. Generated by `languageAlternates()` in
  `src/i18n/paths.ts`; never hand-written.
- Head tags only. next-intl's duplicate `Link` response header is switched off
  (`alternateLinks: false`), because it also fires on 404s and private pages.
- The root layout must **not** set `alternates` — Next merges metadata shallowly,
  so a child page without its own `alternates` would inherit the home page's
  canonical. Public pages call `pageMetadata()`; private areas use
  `privateMetadata()` (below).
- Query strings never appear in a canonical.

## Indexing

| Public                                                                                                         | Private                                                                                                                     |
| -------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `index, follow`                                                                                                | `noindex, nofollow` in metadata **and** an `X-Robots-Tag` header                                                            |
| Self-canonical + 12 hreflang + `x-default`                                                                     | No canonical or hreflang                                                                                                    |
| Listed in `sitemap.xml` (from `publicRoutes` in `src/i18n/paths.ts`), with the same alternates and `x-default` | Never in the sitemap                                                                                                        |
| Allowed in `robots.txt`                                                                                        | **Not** blocked in `robots.txt` — a blocked page can't show its `noindex`, and blocked URLs can still be indexed from links |

`robots.txt` disallows everything outside production (`VERCEL_ENV`), and in
production only `/api/`.

## Language negotiation

- **Visitors:** next-intl picks the language from the `NEXT_LOCALE` cookie, then
  the browser. Search crawlers send no language, so they always get English at
  `/`, and reach every other language through the hreflang links and plain
  `<a>` language links in the footer.
- **Signed-in users:** the language they chose at `/login` is saved on their
  profile and wins over the browser.
- **SMS links** include the recipient's locale, so they never bounce through a
  redirect.

## Checklist for a new route

- [ ] Picked the right route group from the map above.
- [ ] Public: `pageMetadata()` with title, description, canonical and alternates;
      added to `publicRoutes` so it reaches the sitemap.
- [ ] Private: sits under a layout that applies `privateMetadata()`.
- [ ] English, lowercase, hyphenated slug; no IDs in public URLs.
- [ ] Links built with `@/i18n/navigation`, never `next/link`.
- [ ] Checked at `/kn/…` and `/ar/…` (right-to-left).

## SEO implementation checkpoint — 1 October 2026

The sitemap uses `languageAlternates()` with `x-default`. It omits `lastModified`
until an authoritative per-page content update time exists; build time is not
content modification time. The locale root no longer passes the home canonical
to child pages. Routing sets `alternateLinks: false`, and the SEO skill uses the
current `publicRoutes` and `localizedPath` names.

Production robots rules block `/api/`, while private HTML pages remain crawlable
so their noindex tags can be read. Optional Google Search Console and Bing
ownership tags are configured through public environment values. See
[search setup](../operations/seo.md) for the live verification checklist.

The route table above records the original design. The current household wizard
uses `/sell?step=...`, and business workflows live at `/app/...` without an org
slug. The current guide's [route reference](../user-guide/guide.md) is the
operational route inventory; the public entry/private workflow distinction here
still applies.
