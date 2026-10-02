# Language coverage

Status: 33 complete source catalogues, 2 October 2026.

The founder selected an Indian/global mix with more than 20 additional
languages. The source now supports 33 locales: the original 12 plus these 21.

| Region                             | Additional languages                                                                     |
| ---------------------------------- | ---------------------------------------------------------------------------------------- |
| India and neighbouring region      | Assamese, Odia, Nepali, Sinhala                                                          |
| Europe and wider international use | Spanish, French, German, Italian, Portuguese, Dutch, Polish, Russian, Ukrainian, Turkish |
| Southeast and East Asia            | Indonesian, Malay, Vietnamese, Thai, Japanese, Korean, Simplified Chinese                |

Each locale includes all 2,260 current message values, all 26 catalogue
material names, native mobile/desktop controls, locale metadata and script font
coverage. The mechanical audit found no missing keys, blank values, contract
mismatches or copied English paragraphs. The root error controls and mobile
messages are generated from these same catalogues. No English-filled catalogue
was added as a translation.

Run `pnpm exec jiti scripts/audit-locales.mts` to update
[`coverage.json`](coverage.json). It checks exact keys, non-empty text, ICU
arguments/plural contracts, copied English paragraphs, native control coverage
and material names. See the generated report for the current checked count.
Tests in `src/i18n/messages.test.ts` enforce the same message contracts.

Mechanical coverage cannot certify wording, grammar or regulatory terminology.
All non-English catalogues are machine drafts and require native-speaker review
before launch. Admin remains English under the project policy. Native app build,
OS language selection and real-device checks remain separate release evidence.

For each completed language, test the homepage, main navigation, help, pricing,
onboarding and validation screens. Check phone/tablet/desktop layouts, font
loading, links that keep the language, formatting and the language selector.
Keep the existing Arabic and Urdu right-to-left checks.

Run `pnpm i18n:generate` after catalogue changes. This derives the two root-error
controls and the native mobile namespaces from the same message files. Tests
reject stale generated copies. The root-error bundle no longer imports every
full catalogue. Desktop preparation reads the same registry and messages.

Existing database material rows need the authenticated, audited
`catalogue.fillMissingNames` repair after deployment. New source catalogues do
not update stored names by themselves. The migration preserves all existing
names and never changes prices, mass or factors. No migration has run in this
local work.
