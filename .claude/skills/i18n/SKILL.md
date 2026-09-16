---
name: i18n
description: How translation works in Luma.Green — adding strings, adding a locale, locale-aware links and formatting, RTL, and the key-parity test. Use whenever touching user-facing copy, adding a route, or working on a non-English locale.
---

# i18n

We ship **12 locales** on day one: `en hi bn mr ta te kn ml gu pa ur ar`.
`ur` and `ar` are right-to-left. Treat every one as a first-class user.

The registry is `src/i18n/locales.ts` — locale list, endonyms, direction and
hreflang tags all come from there. Nothing else hardcodes a locale list.

## Adding a string

1. Add the key to `messages/en.json`, in the namespace it belongs to.
2. Add the same key to **every** other file in `messages/`. The parity test
   (`src/i18n/messages.test.ts`) fails otherwise, by design — a missing key must
   block the PR, not silently ship English to a Tamil user.
3. Read it with a hook, never a literal:

```tsx
// Server component
const t = await getTranslations("inventory");
return <h2>{t("title")}</h2>;

// Client component
const t = useTranslations("inventory");
```

Missing keys fall back to English at runtime (`src/i18n/request.ts` deep-merges
over `en.json`), so a gap degrades instead of crashing — but the test still
fails, which is the point.

## Naming keys

Namespace by feature, not by page: `inventory.emptyState`, not
`dashboardPage.section2.text`. Keep keys stable — renaming a key means editing
12 files.

## Interpolation and plurals

Use ICU syntax, not string concatenation:

```json
{
  "lotSummary": "{count, plural, =0 {No lots} one {# lot} other {# lots}} · {kg} kg"
}
```

Concatenating translated fragments produces nonsense in languages with
different word order. Never do it.

## Numbers, dates, money

Use `useFormatter` / `getFormatter`. Never `toLocaleString` with a hardcoded
locale, and never hand-format currency.

```tsx
const format = useFormatter();
format.number(paise / 100, { style: "currency", currency: "INR" });
```

Storage stays integer paise and integer grams — formatting happens only at the
render edge.

## Links and navigation

Always from `@/i18n/navigation`:

```tsx
import { Link, useRouter, usePathname } from "@/i18n/navigation";
```

ESLint blocks `next/link` and the locale-unaware `next/navigation` helpers. The
bug it prevents is invisible in English and breaks every other locale.

## RTL

`dir` is set on `<html>` from the registry. Your job is to use logical
properties everywhere:

| Use               | Not            |
| ----------------- | -------------- |
| `ms-2` / `me-2`   | `ml-2`/`mr-2`  |
| `ps-4` / `pe-4`   | `pl-4`/`pr-4`  |
| `text-start`      | `text-left`    |
| `start-0`/`end-0` | `left-0`       |
| `rounded-s-lg`    | `rounded-l-lg` |

Icons that indicate direction (arrows, chevrons) need `rtl:rotate-180` or an
RTL-aware icon choice. shadcn was initialised with RTL support enabled.

Check any layout change at `/ar` before calling it done.

## Adding a locale

1. Add the code to `locales` and an entry to `localeMeta` in
   `src/i18n/locales.ts` (endonym, direction, hreflang).
2. Create `messages/<code>.json` with the full key set.
3. If the script is not Latin, Cyrillic, Greek or Devanagari, add a Noto face
   for it in `src/lib/fonts.ts` using the shared `--font-noto-script` variable,
   and map the locale in `scriptFontByLocale`.
4. Run `npm run test` — parity and registry tests must pass.
5. Run `npm run build` — the new locale should appear in the prerender list.
6. `sitemap.ts` and hreflang alternates pick it up automatically.

## Translation quality

The non-English copy currently in `messages/` was **machine-drafted** and needs
native-speaker review before launch. Flag any string you are unsure about in
the PR rather than guessing — a wrong word in a compliance flow costs more than
a slow review.
