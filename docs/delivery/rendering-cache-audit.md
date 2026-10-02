# Rendering and cache audit

Checked on 2 October 2026 with Next.js 16.3.6 and Node.js 24.18.0.

## Decision

Keep the existing static rendering for public pages. Do not force request-time
SSR or add a second catalogue cache. The production build already emits complete
HTML, and its public pages use the Next.js route cache. Request-time SSR would
add server work to pages whose content changes with a deployment.

No runtime change was made to `src/i18n/request.ts` or
`src/components/providers/index.tsx`. The new rendering tests protect the useful
behavior already in place.

## Initial evidence

The production sample used clean build `nWHzBM5j3qf-EeGji2i3p` on
`http://localhost:3009` at 00:40 UTC. The prerender manifest contained 925 routes. These
representative entries all had `compute: "static"` and
`initialRevalidateSeconds: false`:

| Built route                       | HTML bytes |
| --------------------------------- | ---------: |
| `/en`                             |    414,582 |
| `/en/how-it-works`                |    220,320 |
| `/ar/how-it-works`                |    276,762 |
| `/en/prices`                      |    195,737 |
| `/en/help/household/first-pickup` |    222,892 |

All five canonical page responses returned `x-nextjs-cache: HIT` and
`Cache-Control: s-maxage=31536000`. Each repeated request returned the same HTML
body, including its heading. The `/how-it-works` response also supplied an ETag.
Its 220,320-byte HTML response compresses to 51,124 bytes with Node's default gzip settings; this is a size
estimate, not a measured network transfer or loading-time result. The locale
middleware also sets the public `NEXT_LOCALE` preference cookie. This local
origin check does not prove CDN behavior on a deployed host. A sampled
content-hashed font returned `public, max-age=31536000, immutable`.

`e2e/rendering.spec.ts` checks the home, process, Arabic process, prices and a
household guide page with browser JavaScript disabled. Each test checks the
heading, body text, text direction and raw response body. These tests run in
both development and production; development intentionally has different cache
headers. All five tests passed against this clean production build.

## Catalogue and provider boundary

The locale layout already generates static parameters. Its request configuration
gets the locale from `next/root-params`, which preserves static rendering.
The installed `next-intl` configuration code uses React `cache` to deduplicate
configuration work during a render. JSON imports use the module loader cache.

A local microbenchmark repeated the current English fallback merge 200 times
for each of the 11 other locales after warm-up. The mean per locale was
0.139–0.146 ms. That result does not justify another cache with a separate
invalidation rule. Keep `now` in the request configuration; do not put it in a
process-wide cached object.

The provider composition remains a Server Component. Passing server-rendered
children through interactive providers does not move their source code into the
client bundle. Theme, language, menu and live Convex controls still need browser
JavaScript.

The full catalogue is passed to the client translation provider. Its compact
JSON size ranges from 110,421 bytes for English to 312,043 bytes for Tamil in
this sample. Route-specific message delivery is a possible later optimization,
but needs a complete namespace audit across shared controls and private routes.
This audit does not introduce a partial catalogue that could break translations.

## Data boundaries

The cached prices page is a public shell. `PriceBoard` reads current values with
a live Convex query when configured; no price snapshot was added to a shared
cache. No session, account, application, private document or authorization result
was cached by this work. A cached public or sign-in shell is not proof of
authenticated access or provider execution.

The applicable installed Next.js guides were
`01-app/02-guides/caching-without-cache-components.md` and
`01-app/02-guides/server-and-client-boundary.md`. This project does not enable the
`cacheComponents` flag.

## Repeat the checks

Use a production build with optional services disabled, start it, then run:

```sh
PLAYWRIGHT_BASE_URL=http://localhost:3009 pnpm exec playwright test e2e/rendering.spec.ts
curl -sS -D - -o /dev/null http://localhost:3009/how-it-works
```

Inspect `.next/prerender-manifest.json` after that same build. Do not infer
production caching from `next dev`, and do not add a global public cache header
to make this check pass.

## Expanded-script font repair

The 29-language build emitted 2,217 static pages. A browser font-load check
found that Japanese, Korean, Chinese and Arabic were using an OS fallback.
The computed CSS stack placed the fallback family inserted by the base
`next/font` configuration before the locale script face. Changing only that
order in disposable test pages loaded the supplied Japanese and Arabic fonts.

The repair disables the early metric fallback on Geist and base Noto Sans and
removes the early base system-family list. The shared CSS keeps system fallbacks
at the end. Latin still uses Geist/Noto; a script face now gets priority over an
OS substitute. Font display remains `swap`, and script fonts remain lazy-loaded.
`e2e/locale-fonts.spec.ts` checks loaded font families. The final 33-language build passes all ten script-font checks, including actual
painted font checks for Arabic and the expanded scripts. The earlier 393 layout
checks used the pre-repair font order and remain historical evidence only.

## Final 33-language production build

At 04:54 UTC, build `2OHxnYMmfLTFyiEI3Jpcx` contained 2,521 prerendered routes.
The local production responses below returned HTTP 200, `x-nextjs-cache: HIT`
and `Cache-Control: s-maxage=31536000`. Repeated requests had identical HTML.

| Public route                   | HTML bytes |
| ------------------------------ | ---------: |
| `/`                            |    421,747 |
| `/how-it-works`                |    225,829 |
| `/ar/how-it-works`             |    282,518 |
| `/prices`                      |    201,486 |
| `/fr/join`                     |    238,280 |
| `/ja/how-it-works`             |    255,922 |
| `/help/household/first-pickup` |    229,374 |

These are uncompressed body sizes, not network transfer sizes or a speed score.
The cache stores public page shells; live prices and private records retain
their existing data boundaries. Hosted CDN behaviour remains a separate
deployment check.
