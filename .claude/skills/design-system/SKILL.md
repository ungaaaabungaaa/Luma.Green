---
name: design-system
description: The Luma.Green visual system — brand tokens, semantic colours, shadcn/ui usage, typography (Geist display and Noto body), light and dark themes, mobile-first layout, spacing and component patterns. Use when building or restyling any UI, adding a shadcn component, or picking a colour.
---

# Design system

The brand is one idea: **material in motion**. Four leaves turning around a
shared centre. Calm, green, legible in twelve scripts. The UI should feel like
an instrument, not a marketing site — operators use it all day.

## Components: shadcn only

```bash
pnpm dlx shadcn@latest add <component>
```

Primitives are vendored into `src/components/ui/`. Rules:

- **Never hand-roll** a button, dialog, select, table or form field. If shadcn
  ships it, add it.
- **Edit vendored files deliberately.** They are ours now, but a change there
  affects every screen — prefer composition or a variant.
- Feature components live in `src/components/<feature>/` and compose primitives.
  They never re-implement them.
- New variants go through `cva`, matching the existing pattern in the file.

Installed: alert, avatar, badge, button, card, checkbox, dialog, dropdown-menu,
input, label, progress, select, separator, sheet, skeleton, sonner, switch,
table, tabs, textarea, tooltip, chart.

## Colour

Two layers, and you must know which you are using.

**Semantic tokens** — for almost everything:

`bg-background` `text-foreground` `bg-card` `bg-muted` `text-muted-foreground`
`bg-primary` `text-primary-foreground` `bg-destructive` `border-border`
`ring-ring` `bg-accent` `bg-popover` `bg-sidebar`

**Brand scale** — `brand-50` … `brand-950`, sampled from the mark. Use it for
brand accents: the logo, verified badges, carbon-credit accents, "material
recovered" states, charts.

```tsx
<div className="bg-card text-card-foreground">…</div>      // right
<Badge className="bg-brand-100 text-brand-900">Verified</Badge> // right
<div className="bg-[#1F7A5A]">…</div>                       // wrong — never
<div style={{ color: "green" }}>…</div>                     // wrong — never
```

`--primary` is brand green, so a primary button is on brand without any extra
class.

Charts use `--chart-1` … `--chart-5`: green, blue, amber, teal and neutral.
Use these categorical colours consistently. Use one hue for sequential data.
The shadcn chart primitive uses Recharts (MIT). Only chart consumers import it.
Use recorded query values, disable decorative animation, and keep an accessible
text or table equivalent. Format public values through next-intl.

## Typography

**Geist for Latin display; Noto Sans for body and script coverage.** Both are
loaded in `src/lib/fonts.ts`. Non-Latin headings use Noto script fallbacks and
normal letter spacing. Do not force Latin heading line counts on other scripts.

- `font-sans` — all UI text (the default on `<html>`).
- `font-display` — Geist for Latin headings, Noto and script fallback otherwise.
- `font-mono` — Noto Sans Mono, for serials, ids and quantities in tables.

Never add a `next/font` call outside `src/lib/fonts.ts`, and never spread an
options object into one — `next/font` requires literal arguments.

Scale: `text-sm` for dense operational tables, `text-base` for body,
`text-2xl`/`text-4xl` with `tracking-tight` for headings. Numbers in tables get
`tabular-nums`.

## Light, dark and system appearance

The founder requested light and dark mode on 2 October 2026. ADR 0017 supersedes
ADR 0010's white-only rule. Use semantic surfaces and text so each screen works
in both modes. Theme preference is local to the device and can follow its system
setting. Keep the explicit `.dark` variant and first-paint bootstrap.

Fixed inverse brand panels must pair `bg-brand-950` with `text-brand-50`, not
`text-primary-foreground`, which changes in dark mode. Do not pair pale brand
backgrounds with theme-dependent light text. Test forms, menus and tables in
both themes, including Arabic and narrow screens.

## Mobile first

Design every screen at 360–390 px first, then add `md:`/`lg:` layouts where the
role uses a desktop. Household and kabadiwala screens are phone-only. Touch
targets are at least 44 px — 48–56 px for the main actions in those two apps.
Layouts per area: `docs/architecture/frontend.md`.

## Spacing, radius, motion

- Spacing: Tailwind's 4px scale. Prefer `gap-*` in flex/grid over margins.
- Radius: base `--radius` is 0.5rem. Controls use 8px corners; feature cards
  use 12px corners. Avoid pill overrides on ordinary action buttons.
- Regular buttons are 44px tall; large actions are 48px. Use shared variants.
- Public section padding is 64px on phones and 96px on desktop. Operational
  sections use 24/32px spacing. Use fine dividers instead of nested cards.
- Lucide is the single icon family: 1.75 stroke, 18/20px controls, 24px features.
- Surfaces are neutral white or charcoal. Green marks actions and selected states;
  avoid green washes and decorative photographs in operational dashboards.
- Motion: `tw-animate-css` is available. Keep transitions under 200ms and
  respect `prefers-reduced-motion`.

## Layout and RTL

Logical properties only — `ms-*`, `me-*`, `ps-*`, `pe-*`, `text-start`,
`start-*`, `end-*`. Never `ml-*`, `pl-*`, `text-left`, `left-*`. shadcn is
configured with RTL support; the rest is on you. Verify at `/ar`.

## Accessibility

- Every control has an accessible name; icon-only buttons need `sr-only` text.
- Contrast: 4.5:1 for body text. `brand-400` and lighter are **not** readable on
  white — use `brand-700`+ for text on a light ground.
- Focus rings come from `ring-ring`; never remove focus styling.
- Keyboard-navigate every new flow before merging.

## The mark

`<LogoMark />` and `<Logo />` in `src/components/brand/logo.tsx`; static file at
`public/logo.svg`. Never restretch, recolour or rotate it — size it and leave it
alone. Minimum size 24px; keep clear space equal to one leaf-width around it.
