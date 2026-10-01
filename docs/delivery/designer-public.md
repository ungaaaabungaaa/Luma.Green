# Public design coverage — 2 October 2026

Scope: public marketing, help and standards presentation on
`feat/design-system-polish`. This record covers source review and focused local
checks. It does not claim completed browser, deployed or provider verification.
The coordinator owns the final screenshot matrix and maintained Word guide.

## Design changes

- Shared navigation uses neutral surfaces, 44px targets, restrained active states
  and the same rounded control shape as the rest of the product. Mobile Sheet,
  keyboard focus, locale switching and route selection behavior are unchanged.
- Public titles use one wide heading and readable lead, with optional contextual
  imagery. The previous grid background, decorative bars and pill labels are gone.
- Home uses a wide editorial title, two main actions and a panoramic materials
  warehouse image (`materials-hall.webp`). The existing GSAP reveal/parallax
  selectors remain in place. The image is decorative; it is not product evidence.
- Home material stages are joined columns, role benefits are six compact rows,
  trust rules are a list, and the closing action area uses neutral surfaces.
- Help role links use Lucide icons. Guide steps use a compact ordered reading
  sequence. Planned videos are information rows with no play-button appearance.
  Search, FAQ disclosure, local training progress and contact behavior are preserved.
- Standards use compact rules and verification rows. Material-code table/export,
  receipt content and planned escrow wording are unchanged.
- Shared RoleStoryImage now uses the 12px card corner. Its API is unchanged.
- No user copy, backend logic, service configuration, permissions or metadata
  contracts changed. Existing message keys remain the source of all copy.

## Route coverage

| Route                     | Source review and presentation work                                                                          |
| ------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `/`                       | Hero, real price teaser, material chain, role directory, trust, context and CTA                              |
| `/participants`           | Seven participant sections in separated rows; compact imagery                                                |
| `/how-it-works`           | Three process sections, ledger principles, closing actions                                                   |
| `/standards`              | Shared header, jump targets, rules, verification, codes and adoption CTA                                     |
| `/prices`                 | Shared header and bottom sell CTA; price components belong to operations owner                               |
| `/solar`                  | Shared header and page spacing; calculator components belong to operations owner                             |
| `/contact`                | Shared header, balanced email/security panels, existing email targets                                        |
| `/join`                   | Shared header, page spacing and household aside; role cards belong to operations owner                       |
| `/sell`                   | Reviewed route composition; form/hero/bookings belong to operations owner                                    |
| `/help`                   | Header, search/topics, compact role links, contact strip                                                     |
| `/help/[role]`            | All six generated role routes share updated header, guides, FAQ, video, training and related-role components |
| `/help/[role]/[guide]`    | All generated guides share updated icon header, numbered instructions, related FAQ and next-guide links      |
| `/help/contact`           | Header, quick-contact controls, existing form and contact panel                                              |
| Localized 404 / catch-all | Reviewed localized routing and metadata; main action uses shared large button                                |
| Public layout             | Reviewed skip link, main focus target, shared header/footer and existing SectionMotion                       |

## Local proof

- Scoped ESLint passed for `src/components/site`, `src/components/help`,
  `src/components/standards`, `src/components/showcase/role-story-image.tsx`
  and `src/app/[locale]/(site)`.
- Existing focused Vitest run: 17 files, 155 tests passed. Coverage includes
  home links and content, active navigation, locale switching, price teaser,
  help page routing, search, FAQ, contact states, training and standards export.
- Added guide instruction test: one test passed. It checks ordered step content,
  heading visibility and the accessible step label after the composition change.
- Styling-only changes require browser evidence, not implementation-mirroring tests.

## Browser and guide gates

Pending coordinator browser review: 360–390px mobile and wide desktop, light/dark,
Arabic RTL, keyboard navigation and reduced motion. Source uses logical spacing,
mirrored directional arrows, named controls and existing reduced-motion logic.
These source properties do not prove rendered layout or keyboard behavior.

Inspect long translated hero titles, mobile header fit, help topic wrapping,
process-column dividers in RTL, price-board overflow, contact action wrapping and
in-page anchor clearance. No mobile pinning was added. Existing provider-disabled
and synthetic-data labels must remain visible in evidence.

Guide impact: replace affected public screenshots and update the source edition.
Rebuild and inspect the Word guide and record cloud publication status through the
coordinator's guide workflow before final completion.
