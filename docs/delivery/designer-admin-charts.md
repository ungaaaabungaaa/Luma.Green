# Admin and charts designer pass

Status: implemented locally, 2 October 2026. Base `e403503` on
`feat/design-system-polish`. Scope follows
[the approved designer system](../design/designer-system.md).

## Route and state coverage

| Route or surface           | Work completed                                                                                                                                        | States preserved                                                                                             |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `/admin`                   | Removed decorative photo; compact task overview, report action, task totals, price link and sign-in table                                             | Query loading, empty sign-ins, overdue state                                                                 |
| Admin console shell        | Neutral sidebar and work surface, compact section navigation, consistent theme and sign-out controls                                                  | Session loading, member rejection, admin setup redirect, responsive navigation                               |
| `/admin/pilot`             | Filter strip, metric rhythm, booking outcome chart, estimate versus weighed material chart, visible text totals and material table                    | Loading, no records, unavailable averages, partial query warnings, unmeasured-data notice                    |
| `/admin/verification`      | Fine-border queue table and mobile cards, review timing and clear review action                                                                       | Loading, empty queue, applicant changes, overdue/due-soon indicators                                         |
| `/admin/verification/[id]` | Divided record header, roomy data/review columns at large widths, checklist rhythm, full-height decision actions, file cards and audit trail          | Not found, loading, every status, checklist approval gate, decision confirmation and failure                 |
| `/admin/prices`            | Consistent family sections and rules, 44px price inputs, wide-row layout moved to `xl` to fit beside sidebar                                          | Loading, empty catalogue, invalid inputs, dirty/save states, minimum price lift feedback, translation repair |
| `/admin/support`           | Clear filter strip, separated message body and actions, 44px call/answer controls                                                                     | Loading, each empty filter, open/answered records, mutation progress and failure                             |
| `/admin/login`             | Focused single-column access card, no decorative artwork, stable form spacing                                                                         | Password, TOTP, backup code, restart, unavailable deployment and errors                                      |
| `/admin/setup`             | Same access frame, consistent setup field rhythm, QR/key panel, narrow-screen backup-code layout                                                      | Account/profile/password enrolment, setup closed, pending/error, QR fallback, saved-code confirmation        |
| Admin route error          | Bounded error card with clear recovery action                                                                                                         | Expired session versus retryable page failure                                                                |
| `/solar` components        | Fine-border calculator/result panels, restrained numeric hierarchy, stacked roof controls below 400px, consistent contact/subsidy/assumption sections | No usage, invalid inputs, small/limited roof, home/business, bill/units, contact progress/errors             |
| Solar savings chart        | Correct chart swatch, semantic colour, reduced-motion-safe highlighting, 44px data-table disclosure                                                   | Pointer and arrow/Home/End navigation, full data table, translated English/Arabic labels                     |
| Insights material bars     | Compact divided rows, wrapping labels, thin semantic bars; zero values have no visible minimum-width bar                                              | Written totals/details retained; bar size bounded at 100%                                                    |

## Chart data and access

Charts consume the existing `api.pilot.summary` result. Booking bars show the
current outcome counts in the chosen report period, not a fabricated time
series. Material bars retain integer grams and convert to kilograms only for
display. The material table preserves all three decimal places and differences.
The outcome definition list and material table stay visible as the accessible
text equivalents. Charts are decorative to assistive technology and do not add
extra keyboard stops. Tooltips provide the same values for pointer users.
Animations are disabled, including for reduced-motion users. Recharts is imported
only by the pilot consumer, not by the shared app shell or public pages.

No permission, authentication, mutation contract, private-file fetch, ledger,
calculation, provider setup or server query changed. Authenticator codes, keys and
backup codes must be excluded from real screenshot evidence.

## Local verification

- Scoped ESLint passed for admin, solar, the insights bar list and the admin error route.
- Focused suites passed after the new regression checks: 24 files, 131 tests.
- Added exact one-gram material difference coverage beside the report charts.
- Added keyboard and visible table coverage for solar savings in English and Arabic.
- Extended bar scaling coverage for an inconsistent maximum.

Coordinator owns the final whole-repository checks, browser captures and guide.
Browser acceptance is still required at 360, 390, 768, 1024 and 1440px in both
themes. Check populated pilot charts, price forms beside the sidebar, admin mobile
navigation and Arabic solar. Protected component fixtures remain synthetic and
do not prove live authentication or provider execution.
