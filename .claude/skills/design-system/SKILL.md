---
name: design-system
description: The Luma.Green visual system — brand tokens, semantic colours, shadcn/ui usage, typography (Geist display and Noto body), light and dark themes, mobile-first layout, spacing and component patterns. Use when building or restyling any UI, adding a shadcn component, or picking a colour.
---

# Design system

The brand is one idea: **material in motion**. Four leaves turning around a
shared centre. Calm, green, legible across all registered languages. The UI should feel like
an instrument — operators use it all day. Public pages can use editorial art;
operational pages keep the task clear.

Read the [current UI contract](../../../docs/design/designer-system.md#current-ui-contract)
first. It is the canonical owner of the founder's layout, mobile, localisation,
motion, data-honesty and visual-proof rules. Historical checkpoints in that
file do not override its current contract. This skill explains how to apply it.

Before changing a screen, identify its user task, existing state and primary
action. Refine the approved identity. Do not fill empty space with generic cards,
explanation tiles, invented figures or controls without a working next step.

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
table, tabs, textarea, tooltip, chart. The installed `card` primitive is retained
for compatibility; its presence is not permission to add content-card layouts.
Use semantic sections, rows, lists or tables with dividers instead.

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
<section className="bg-background text-foreground">…</section> // right
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

The registry currently has 33 locales. Keep locale font mapping in `fonts.ts`;
confirm the intended script font downloads and renders in the browser. A CSS
family name alone is insufficient. System fallback fonts must come after the
configured script face. Do not preload every script or duplicate locale lists.
Use normal tracking for non-Latin headings and allow headings/body text to wrap.
Action labels follow the single-line rule in the current UI contract.

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

Design every screen at 320–390 px first, then adapt to tablet and desktop.
Household and kabadiwala tasks put touch use first. Targets are at least 44 px;
use the existing large variants for primary actions. The public header stays on
one row. Below 1280 px, move navigation, theme, language, sign-in and sell actions
into the side menu; only the brand link and menu trigger remain in the header.
Phones show the brand mark without the wordmark. Use endonyms for language
selection, with a chevron instead of a translate icon. Follow the current UI
contract for menu scroll, focus, RTL and breakpoint checks.

Layouts per area: `docs/architecture/frontend.md`.

## Spacing, radius, motion

- Spacing: Tailwind's 4px scale. Prefer `gap-*` in flex/grid over margins.
- Radius: preserve the existing tokens (`--radius` is 0.5rem) and approved
  control corners. This refinement does not authorise a global radius change.
  Do not turn ordinary actions into pills or add rounded content-card wrappers.
- Regular buttons are 44px tall; large actions are 48px. Use shared variants.
- Public section padding starts from the existing 64/96px rhythm; operational
  sections use 24/32px. Adjust to content and task density rather than preserving
  empty bands. Align headings, content and actions on the same reading grid.
  Use fine dividers and meaningful rows instead of nested cards.
- Lucide is the single icon family: 1.75 stroke, 18/20px controls, 24px features.
- Surfaces are neutral white or charcoal. Green marks actions and selected states;
  avoid green washes and decorative photographs in operational dashboards.
- Motion: use short existing control feedback, normally 150–200ms. Longer
  approved effects are limited to the named logo, marquee and editorial motion
  in the current UI contract. Keep them selective and disable/cancel them when
  `prefers-reduced-motion` changes. Never make motion necessary to read or act.

## Layout and RTL

Logical properties only — `ms-*`, `me-*`, `ps-*`, `pe-*`, `text-start`,
`start-*`, `end-*`. Never `ml-*`, `pl-*`, `text-left`, `left-*`. shadcn is
configured with RTL support; the rest is on you. Verify at `/ar` and `/ur`.
Use the shared locale-aware decimal parser for amount inputs and next-intl for
output. Do not solve a translation fit problem with clipping, hidden overflow,
a blanket tiny font, or English-only labels.

## Accessibility

- Every control has an accessible name; icon-only buttons need `sr-only` text.
- Contrast: 4.5:1 for body text. `brand-400` and lighter are **not** readable on
  white — use `brand-700`+ for text on a light ground.
- Focus rings come from `ring-ring`; never remove focus styling.
- Keyboard-navigate every new flow before merging.

## The mark

`<LogoMark />` and `<Logo />` in `src/components/brand/logo.tsx`; static file at
`public/logo.svg`. Never restretch or recolour it. The founder approved one
900ms eased turn of the mark on pointer hover or link keyboard focus. Keep the
wordmark still and disable the turn for reduced motion. Do not rotate the
resting mark. Minimum size 24px; keep clear space equal to one leaf-width around it.

## Apply and verify

1. Read the current UI contract, affected screen code and the local i18n/testing
   playbooks. Check loaded, empty, loading, error and disabled states that apply.
2. Use existing primitives and server-rendered structure. Keep browser logic in
   small interactive components. Preserve static public caching and the private
   data boundary described in the contract.
3. Run relevant behavior, keyboard, locale, numeric and reduced-motion checks.
   Shared-header changes exercise all registry locales and the specified widths.
4. Capture and visually inspect affected current screens in light/dark, phone,
   tablet, desktop, RTL and the changed scripts after fonts load. Check actual
   label bounds, spacing, crop, focus and contrast. A successful build is not
   visual proof; an old screenshot is not evidence for changed source.
5. Follow `docs/user-guide/README.md`: update affected guide text and captures,
   rebuild the Word document, inspect every rendered page, and record evidence
   limits in the handoff. If only instructions changed, record that no screen or
   workflow changed rather than inventing a capture requirement.
