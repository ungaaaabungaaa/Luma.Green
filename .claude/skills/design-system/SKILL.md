---
name: design-system
description: The Luma.Green visual system — brand tokens, semantic colours, shadcn/ui usage, typography (Noto), dark mode, spacing and component patterns. Use when building or restyling any UI, adding a shadcn component, or picking a colour.
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
table, tabs, textarea, tooltip.

## Colour

Two layers, and you must know which you are using.

**Semantic tokens** — for almost everything. They flip correctly in dark mode:

`bg-background` `text-foreground` `bg-card` `bg-muted` `text-muted-foreground`
`bg-primary` `text-primary-foreground` `bg-destructive` `border-border`
`ring-ring` `bg-accent` `bg-popover` `bg-sidebar`

**Brand scale** — `brand-50` … `brand-950`, sampled from the mark. Use only
where the colour must stay green regardless of theme: the logo, carbon-credit
accents, "material recovered" states, charts.

```tsx
<div className="bg-card text-card-foreground">…</div>      // right
<Badge className="bg-brand-100 text-brand-900">Verified</Badge> // right
<div className="bg-[#1F7A5A]">…</div>                       // wrong — never
<div style={{ color: "green" }}>…</div>                     // wrong — never
```

`--primary` is already brand green in both themes, so a primary button is on
brand without any extra class.

Charts use `--chart-1` … `--chart-5`, a light→deep green ramp. Never pick chart
colours ad hoc; sequential data reads wrong when hues jump.

## Typography

**Noto Sans, everywhere** — it is the one family with consistent coverage of
every script we ship, so the UI never changes texture when a user switches
language.

- `font-sans` — all UI text (the default on `<html>`).
- `font-display` — wordmark and large headings. Same family today; it exists so
  a display face can be swapped in one place later.
- `font-mono` — Noto Sans Mono, for serials, ids and quantities in tables.

Never add a `next/font` call outside `src/lib/fonts.ts`, and never spread an
options object into one — `next/font` requires literal arguments.

Scale: `text-sm` for dense operational tables, `text-base` for body,
`text-2xl`/`text-4xl` with `tracking-tight` for headings. Numbers in tables get
`tabular-nums`.

## Dark mode

Both themes are first-class; `next-themes` defaults to system. Every colour
must come from a token — that is the whole mechanism. Check both themes before
you call a screen done, and attach both to the PR.

## Spacing, radius, motion

- Spacing: Tailwind's 4px scale. Prefer `gap-*` in flex/grid over margins.
- Radius: driven by `--radius` (0.625rem). Use `rounded-md`/`rounded-lg`, not
  arbitrary values.
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
