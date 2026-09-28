# 0010. White theme, mobile first, shadcn/ui

- **Status:** Decided — supersedes the dark-mode rule in the first design
  system
- **Date:** 29 Sep 2026
- **Deciders:** founder, Claude

## Context

The founder: use ready-made components ("don't reinvent the wheel"), a white
theme only, the latest Tailwind, mobile first. Households and kabadiwalas only
use phones; other roles also use desktops. The repo already has shadcn/ui on
Tailwind v4 powering the public site.

## Decision

- **Components:** shadcn/ui (Radix) on Tailwind v4, plus Next.js built-ins
  (`next/image`, `next/font`). No second component library.
- **Theme:** white only. Remove dark mode, the theme toggle, `next-themes`,
  the `.dark` tokens and the theme message keys.
- **Layouts:** designed at 360–390 px first. Household and kabadiwala areas are
  phone-only; business and admin areas add desktop layouts.
- Plan: [architecture/frontend.md](../architecture/frontend.md).

## Consequences

- Less CSS and fewer states to test; one set of colour tokens to keep accessible.
- The design-system skill and AGENTS.md drop their dark-mode rules.
- Tailwind stays on the latest v4 release through Dependabot.

## Alternatives considered

- **HeroUI (formerly NextUI)** — would mean replacing shadcn and redoing the
  live pages; offered to the founder, who chose to keep shadcn.
