# Selection controls, demo prices and account UX

## Current delivery — 2 October 2026

The founder rejected large bordered selection blocks. The first-login language
step now uses a searchable, bounded radio list with a separate Continue action.
Native and English language names are searchable. Shared form choices, pickup
mode/time, material filters, weight presets and solar choices use compact radio,
checkbox or underline controls. Tap areas remain at least 44 px.

The founder changed the earlier loading-only pricing instruction and explicitly
requested production demo prices. The public board already marks these as sample
rates. A new internal-only `demoPrices:seed` imports only catalogue and price data;
it does not create users, businesses, transactions or provider events.

### Verified backend import

- Production: `outstanding-buzzard-942`, EU West. The reviewed functions and
  schema were deployed after a successful dry run with no index deletions.
- Production inserted 26 materials, 26 reference rates and 780 daily prices.
- Development: `glorious-rooster-470`, EU West. Its existing rows were preserved;
  78 missing daily prices were added.
- Both public boards return the same 26 price rows and 780 series points for
  3 September–2 October 2026, including today, weekly changes, floors and fallbacks.
- Logical price SHA-256 at 05:40 UTC:
  `20de9f77a794c6b3b97e963ccf117f3b6a7478226d0bcc25db2879dc340cb34a`.
- Production materials contain all 33 locale names. Existing development names
  were preserved by the additive importer.
- Vercel's Production `NEXT_PUBLIC_CONVEX_URL` was set to the verified regional
  production endpoint. This takes effect in the next frontend build. Hosted
  frontend deployment monitoring was excluded at the founder's request.

The price formula uses the fixed 29 September 2026 anchor from the existing
local demo. Repeating the import preserves every existing row and adds no audit
record when nothing changes. The `demo.prices.seeded` audit event stores the
inserted IDs and complete values, including the batch date. Money stays in
integer paise. No general demo reset was run.

### Repeat and cleanup

Run the same date on the intended deployment only:

```sh
CONVEX_DEPLOYMENT=dev:glorious-rooster-470 pnpm exec convex run demoPrices:seed '{"asOf":"2026-10-02"}'
CONVEX_DEPLOYMENT=dev:glorious-rooster-470 pnpm exec convex run --prod demoPrices:seed '{"asOf":"2026-10-02"}'
```

For later cleanup, first read the batch audit manifest. Remove only recorded
sample price IDs whose current values still match their recorded snapshots.
Preserve changed values, real prices, references and material records used by
other records. Keep the audit event. Cleanup is a separate reviewed change; no
bulk-delete or whole-table reset is part of this importer.

Full platform demo data remains a separate offline plan. This price import does
not complete its identity, industry, workflow or isolation requirements.

## Next authorised work

The founder requested this follow-up while the current delivery was being
verified. Keep it separate from claims about the current completed changes.

1. Add useful page-specific descriptions and more distinct imagery across the
   main public pages. Use the existing editorial design, with no content cards,
   fabricated business claims or rounded images.
2. Keep phone-code sign-in. Add optional authenticator 2FA for platform users,
   including enrollment, challenge, recovery and disable flows. Inspect the
   existing Better Auth contract before implementation. Password strength and
   forgot-password details apply where passwords already exist, including admin.
3. Add opt-in platform/browser notifications and support the desktop and Expo
   shells. Implement ownership checks, clear permission/error states, preference
   controls and safe notification content. Distinguish in-app alerts from remote
   OS push and from the existing SMS outbox.
4. Build and test web, Android/iOS JavaScript bundles and desktop packages as
   available. Signed installers, Apple/Google accounts, APNs/FCM credentials,
   native-device tests and store submissions remain separate verified gates.
5. Update the maintained user guide, test manual and source rules with actual
   screenshots and validated behavior. Commit each coherent verified slice and
   integrate through the protected main PR path.
