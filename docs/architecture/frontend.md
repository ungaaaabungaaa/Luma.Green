# Frontend and UI plan

> **Status:** decided, 29 Sep 2026 —
> [ADR 0017](../decisions/0017-light-dark-theme.md). Rules for
> writing UI code live in [`.claude/skills/design-system`](../../.claude/skills/design-system/SKILL.md).

## The rules

1. **shadcn/ui on Tailwind v4 — don't reinvent the wheel.** Every button,
   field, dialog, sheet, tab and toast comes from shadcn (`pnpm dlx
shadcn@latest add …`). Next.js's own `next/image` and `next/font` for images
   and fonts. No second component library.
2. **Light, dark and system appearance.** Shared semantic tokens and a local preference apply to public pages, admin and workspaces.
3. **Mobile first.** Every screen is designed at 360–390 px first. Household
   and kabadiwala screens are phone-only; yard, recycler, manufacturer and
   admin screens also get a desktop layout.
4. **Every string is translated** and every layout works right-to-left
   (`/ar`, `/ur`) — see the i18n skill.
5. **Server components by default**; a client component only for a form,
   camera, live data or other interaction.

## Areas and layouts

| Area                                      | Main device       | Shell                                                                                | Content width                         |
| ----------------------------------------- | ----------------- | ------------------------------------------------------------------------------------ | ------------------------------------- |
| Public site `(site)`                      | Both              | The existing header and footer                                                       | `max-w-6xl`                           |
| Household `(household)`                   | Phone             | Top bar (mark + language) · single column · sticky bottom action                     | `max-w-md`, centred on larger screens |
| Sign-in and onboarding `(auth)`, `(join)` | Phone             | Top bar (back + language) · step indicator · single column · sticky bottom action    | `max-w-md`; a centred card on desktop |
| Kabadiwala app `(app)`                    | Phone             | Green top bar (name, "taking pickups") · bottom tabs: Requests, Today, Stock, Prices | `max-w-md`; no desktop design         |
| Yard, recycler, manufacturer `(app)`      | Phone and desktop | Bottom tabs below `md`; left sidebar from `md`                                       | Fluid, `max-w-7xl`                    |
| Saathi app `(app)`                        | Phone             | Bottom tabs                                                                          | `max-w-md`                            |
| Admin `admin/`                            | Desktop           | Left sidebar · list and detail side by side from `lg`, stacked below                 | Fluid                                 |

## Look and feel

### Current visual direction — 2 October 2026

The founder requested a richer public site and more polished app screens. This
refinement supersedes the earlier compact public heading and radius guidance.
See [designer system plan](../design/designer-system.md).

- Support light and dark themes with neutral white and charcoal surfaces.
  Forest green marks actions and selected states, not every section background.
- Public content uses `max-w-7xl`, editorial headings, larger section spacing,
  and compressed materials photography. Geist supplies Latin display type;
  Noto supplies body text and all twelve scripts.
  Hero tracking and line-height are reset for non-Latin scripts.
- Base radius is `0.5rem`: 8px control corners, 12px cards. Shared shadcn
  buttons are 44px regular and 48px large, with stable focus and disabled states.
- Desktop sign-in has an image panel beside the form. Phone sign-in keeps the
  form first. Operational shells use compact headers, neutral navigation and
  clearer status/metric rows. Transaction content does not animate on updates.
- Homepage GSAP parallax follows native scrolling and is bounded to 64 px,
  halved on phones. Secondary-page reveals use native browser animation.
  Entrances may exceed 200 ms; control transitions stay short. Reduced motion
  stops running movement and restores content. Server content is visible before
  animation starts, and each route cleans up its observers/listeners.
- Use `SectionHeading` offsets for in-page links under the fixed header. Keep
  translated copy, logical RTL spacing, prices and permission checks unchanged.

The following baseline still applies to functional controls and data presentation.

- **Surfaces:** a light grey page (`bg-muted`) with white cards (`bg-card`) and
  hairline borders — as in the prototype. Primary actions in brand green
  (`bg-primary`).
- **Type:** Geist display with Noto Sans for body and every script. Body 16 px; 17–18 px in the kabadiwala
  app; headings 24–28 px; numbers `tabular-nums`.
- **Targets:** 44 px minimum everywhere; 48–56 px for the main actions in the
  household and kabadiwala apps.
- **Material colours:** one colour and one icon per material family, used
  everywhere (chips, rows, charts). Defined once as tokens
  (`--material-paper`, `--material-cardboard`, `--material-plastic`,
  `--material-metal`, `--material-glass`, `--material-ewaste`, each with a
  `-foreground`), never picked per screen.
- **Icons:** lucide-react, 1.75 stroke; 18/20px controls and 24px features.
  Material family icons share `components/app/material-family.ts`.
  Direction icons flip in right-to-left layouts.
- **Charts:** Recharts through the vendored shadcn primitive. Real query data,
  semantic categorical colours, readable text/table equivalents and no decorative
  animation. Only pages with charts import the library.
- **States:** skeletons while loading; an empty state with one next action; a
  toast for a failed action plus an inline message where it happened; an
  offline banner when the connection drops.

## Components to add from shadcn

Already vendored: alert, avatar, badge, button, card, checkbox, dialog,
dropdown-menu, input, label, progress, select, separator, sheet, skeleton,
sonner, switch, table, tabs, textarea, tooltip, chart.

To add as screens need them: `form` (React Hook Form + Zod), `radio-group`,
`toggle-group`, `input-otp`, `alert-dialog`, `scroll-area`, `popover`,
`sidebar` (admin and desktop business shells), `breadcrumb` (admin).

## Forms

- React Hook Form with a Zod schema per form. The schema is the contract: the
  same shape is validated again by the Convex mutation.
- Messages come from `messages/*.json`, never from Zod's defaults.
- Onboarding forms save a draft to Convex as the user moves between steps, so
  a closed browser loses nothing.
- Photos and PDFs upload straight to Convex file storage with a short-lived
  upload URL, showing progress; the form stores only the file id.
- The camera opens with `<input type="file" accept="image/*" capture="environment">`
  — no camera library.

## Every screen

| Screen                                            | URL                                                   | Prototype | Build order     |
| ------------------------------------------------- | ----------------------------------------------------- | --------- | --------------- |
| Language · phone · SMS code                       | `/login`, `/login/verify`                             | Yes       | 1               |
| Join entry (what each role is)                    | `/join`                                               | Yes       | 1               |
| Kabadiwala shop details                           | `/join/kabadiwala`                                    | Yes       | 1               |
| Yard / recycler / manufacturer details            | `/join/{kind}`                                        | Yes       | 1               |
| Documents and photos                              | `/join/{kind}/documents`                              | Yes       | 1               |
| Saathi personal details                           | `/join/saathi`                                        | Yes       | 1               |
| Application status                                | `/join/status`                                        | No        | 1               |
| Admin sign-in and verification queue              | `/admin/login`, `/admin/verification`                 | Yes       | 2               |
| Admin price tables                                | `/admin/prices`                                       | No        | 3               |
| Household: snap, estimate, book, track            | `/sell`, `/sell/estimate`, `/sell/book`, `/t/{token}` | Yes       | 3               |
| Kabadiwala: requests, today, weigh, stock, prices | `/app/{org}/…`                                        | Yes       | 3               |
| Yard: stock near me, collections                  | `/app/{org}/…`                                        | No        | After research  |
| Saathi jobs                                       | `/app/saathi/…`                                       | No        | After the pilot |

## Installable app

The web app manifest already exists (`src/app/manifest.ts`). Kabadiwalas are
asked once to add Luma.Green to their home screen. An offline shell (service
worker) comes after the pilot; until then Convex reconnects on its own and the
interface shows when it's offline.
