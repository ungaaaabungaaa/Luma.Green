export const meta = {
  name: 'luma-green-prototype-build',
  description: '8 agents, each in its own git worktree, build one area of the investor prototype (admin, kabadiwala, market, household, Saathi+insights, public pages, help centre, docs)',
  phases: [
    { title: 'Build', detail: 'one worktree agent per area; each commits on its own branch' },
  ],
}

const ENV_FILE = '/private/tmp/claude-501/-Users-syedabdulmuqeeth-Developer-Luma-Green/51228076-21f3-492f-baee-2e45f75c41c5/scratchpad/worktree.env.local'

const COMMON = `
You are building ONE area of Luma.Green's investor prototype, in your own git worktree (a copy of the repo on its own branch, based on the lead's latest commit). Seven other agents build the other areas in parallel; the lead merges everything afterwards, runs the app and tests it in a browser.

Luma.Green: an Indian recycling-chain platform. Households sell scrap to kabadiwalas (local scrap shops); kabadiwalas sell to yards; yards to recyclers; recyclers sell recycled material to manufacturers. Saathis are gig workers. One admin verifies businesses. Pilot city: Bengaluru. Audience includes people who read little: plain words, big targets, icons.

Stack: Next.js 16 App Router + next-intl (12 locales, English slugs, localePrefix "as-needed") + Convex (backend; one shared dev deployment already seeded with demo data) + Better Auth + shadcn/ui + Tailwind v4, white theme only, pnpm.
Read AGENTS.md first. The rules that matter most:
- Every user-facing string goes in messages/en.json and is read with useTranslations/getTranslations. The admin console (src/app/admin, src/components/admin) is the exception: English only, strings inline, uses next/link and next/navigation.
- Import Link/useRouter/usePathname/redirect from "@/i18n/navigation" (never next/link or next/navigation's router helpers) outside the admin console. useSearchParams from next/navigation is fine.
- Money: integer paise in Convex; rupees in forms. Weight: integer grams in Convex; kg in forms.
- Semantic colour tokens only (bg-primary, text-muted-foreground, bg-muted, the brand-* scale, amber/sky for warnings/info is OK); mobile first (375px), good on desktop.
- Convex functions always declare args AND returns validators and start with an access check.

What already exists — read before writing:
- convex/schema.ts (all tables). Do NOT change it. If you truly need a schema change, stop and report it.
- convex/lib/chain.ts (sellerKindFor, buyerKindFor, paiseFor, kgToGrams, pointsFor, canMoveBooking, tradeStep, tradeActionsFor, isInEscrow, requiresEwayBill, bookingToken), convex/lib/catalogue.ts (CATALOGUE, CHAIN_MARKUP, materialName), convex/lib/demo.ts (demo logins and data), convex/demo.ts (seed), convex/lib/dates.ts (shiftDate), convex/lib/onboarding.ts (indiaToday and onboarding rules), convex/lib/phone.ts (maskPhone, formatIndianMobile, normalizeIndianMobile), convex/lib/lifecycle.ts.
- convex/lib/workspace.ts (requireOrg(ctx, kinds?), requireSaathi(ctx), currentProfile(ctx), materialIndex(ctx)), convex/lib/access.ts (requireUser, requireAdmin), convex/lib/views.ts (shared return validators: vMaterialRef, vBookingView, vTradeView, vListingView, vReceipt, vOrgSummary, vNames).
- convex/workspace.ts (workspace.mine), convex/catalogue.ts (catalogue.materials, catalogue.priceBoard({city})), convex/support.ts (support.send, list, markAnswered).
- Test helpers in convex/lib/auth.testing.ts: convexModules, registerAuth, seedDemo(t) (call vi.stubEnv("AUTH_DEV_MODE","true") first), signInAs(t, phone) for seeded demo phones, signIn(t, {email, phoneNumber?, twoFactorEnabled?}) for new users. Patterns: convex/demo.test.ts and convex/applications.test.ts (they start with // @vitest-environment edge-runtime).
- src/components/app/*: AppShell (role nav), nav.ts (every /app route), format.ts (useFormat(): money(paise), perKg(paise), weight(grams), number, date, dateTime, material(names, code)), page-parts.tsx (AppPageHeader, StatCard, Section, EmptyState, ListSkeleton, StatusPill, DemoNote), use-workspace.ts (useWorkspace). Read-only for you.
- src/app/[locale]/(app)/app/** route files render placeholder components that you replace (keep the component names and props).
- UI primitives in src/components/ui (shadcn: button, card, input, label, select, tabs, table, dialog, sheet, badge, checkbox, radio-group, switch, textarea, dropdown-menu, skeleton, alert, progress, tooltip), lucide-react icons. House style for forms, errors and copy: src/components/join/* and src/components/auth/*.
- Demo logins on the dev deployment (code 123456): +919000000101 kabadiwala (Ramesh Kabadi Store), 102 yard (Peenya Paper & Plastic Yard), 103 recycler (GreenLoop Polymers), 104 manufacturer (Deccan Packaging), 105 Saathi (Lakshmi Devi), 106 new applicant, 107/108 applicants waiting for review, 109 household (Priya; tracking link /t/priyademo1). Admin: admin@luma.test (password + authenticator).

Set up your worktree first:
1. pnpm install --frozen-lockfile --prefer-offline
2. cp ${ENV_FILE} .env.local   (non-secret: which Convex deployment codegen talks to)
3. After adding or changing files under convex/, regenerate types: npx convex codegen --typecheck disable
   NEVER run npx convex dev, npx convex deploy, npx convex run, npx convex import/export or anything that pushes functions or changes data: every agent shares one dev deployment, and a push would wipe the others' functions.
4. Do NOT run pnpm dev, pnpm build, next build, pnpm e2e or Playwright (shared machine, little disk). The lead runs the app and a browser after merging.

Rules for a clean merge:
- Create or edit only the files your task lists (plus new files inside your own directories). Never edit convex/schema.ts, the existing convex/lib/*.ts files, src/components/app/*, src/i18n/*, another area's files, package.json (unless your task says so), configs, or messages other than en.json.
- New English strings go in messages/en.json under YOUR namespace(s) only. Don't touch other namespaces or other locale files; the lead translates later.
- Prices and impact figures are sample data: where a screen shows them, say so once with <DemoNote> (text from your namespace).

Quality bar: investor-ready. Polished, calm, clear hierarchy, mobile first, accessible (labels, one h1 per page, focus rings, aria where needed), with loading, empty and error states. Keep it simple: small components, one concern each.

Before you finish:
- pnpm exec prettier --write <your files>
- pnpm typecheck (must pass)
- pnpm exec eslint <your files> (must pass: fix the findings, don't disable rules without a strong reason)
- pnpm exec vitest run <your test files> (must pass). src/i18n/messages.test.ts fails until translations land: ignore only that one.
- Tests: convex-test for every Convex function you add (happy path and refusals: signed out, wrong role, someone else's data), plus component or unit tests where logic lives in the UI.
- Commit: git add -A && git commit -m "feat(app): <your area>" with a body that lists what you built and ends with the line: Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Return the structured result.
`

const RESULT = {
  type: 'object',
  properties: {
    branch: { type: 'string' },
    worktreePath: { type: 'string' },
    commit: { type: 'string' },
    summary: { type: 'string' },
    routes: { type: 'array', items: { type: 'string' } },
    convexFunctions: { type: 'array', items: { type: 'string' } },
    messageNamespaces: { type: 'array', items: { type: 'string' } },
    checks: {
      type: 'object',
      properties: { typecheck: { type: 'string' }, lint: { type: 'string' }, tests: { type: 'string' } },
      required: ['typecheck', 'lint', 'tests'],
    },
    unfinished: { type: 'array', items: { type: 'string' } },
    mergeNotes: { type: 'array', items: { type: 'string' } },
  },
  required: ['branch', 'worktreePath', 'commit', 'summary', 'routes', 'convexFunctions', 'messageNamespaces', 'checks', 'unfinished', 'mergeNotes'],
}

const TASKS = [
  { key: 'admin', task: `
AREA: the admin console — verification queue, decisions, private files, price tables, support inbox.
OWN: convex/review.ts, convex/adminPrices.ts, convex/files.ts (new), convex/http.ts (add a route), src/app/admin/(console)/** (new pages), src/components/admin/** (you may edit console-shell.tsx nav and console-home.tsx), tests.
MESSAGES: none (English only, inline).
BUILD:
- convex/review.ts (every function requireAdmin):
  - queue: applications with status submitted or changes_requested (index by_status_submittedAt), each with id, kind, applicant/business name (from the sections), phone (profiles.phone), submittedAt, hours waiting, sla ('ok' under 18h, 'due_soon' 18-24h, 'overdue' over 24h; constants in convex/lib/lifecycle.ts), file count, version.
  - get({applicationId}): kind, status, version, locale, the form sections, files (id, type, name, contentType, size), applicant phone, number of earlier versions (applicationSnapshots), and this application's audit trail (auditLog by_entity).
  - decide({applicationId, decision: 'approve'|'changes'|'reject', note?}): use canMove from convex/lib/lifecycle.ts. 'changes' and 'reject' need a note of 5+ characters (stored in applications.note, shown to the applicant). Approve sets decidedAt/decidedBy and CREATES the business or Saathi from the application: for kabadiwala/yard/recycler/manufacturer insert an orgs row (name from shopName/businessName; unique slug from the name; city 'Bengaluru'; area = locationTags[0] or the part of the address before 'Bengaluru'; address; location; phones; hours; weeklyOff; gstin; families from business.materials, or ['paper','plastic','metal'] for kabadiwalas; offersPickup/collectsFromSuppliers; vehicle; consent {board:'KSPCB'|state, number, validUntil} from documents) plus a memberships owner row, and for kabadiwalas a rate card at the city fallback prices (referencePrices); for saathi insert saathiProfiles. Write auditLog (application.approved / changes_requested / rejected with {from, to, note}).
- Private files: an HTTP GET route /files/{fileId} in convex/http.ts backed by convex/files.ts: authenticate the caller from the Authorization: Bearer <token> header (the Convex JWT; httpAction ctx.auth works with it, then authComponent.safeGetAuthUser(ctx)) — allow the admin (email = ADMIN_EMAIL with two-factor on) or the file's owner; stream the blob from ctx.storage.get with its Content-Type and Cache-Control: private, no-store; 401/403/404 otherwise; CORS headers for the site origin (SITE_URL and EXTRA_TRUSTED_ORIGINS env vars, as convex/auth.ts does) including an OPTIONS preflight. In the admin UI, fetch it with the Convex token (look at @/lib/auth-client and the @convex-dev/better-auth client plugin for how to get the token, e.g. authClient.convex.token()) and the site URL from NEXT_PUBLIC_CONVEX_SITE_URL (clientEnv in src/lib/env.ts; the .convex.site URL), then show images inline and PDFs in an iframe via an object URL. Unit-test the pure permission check.
- convex/adminPrices.ts: list({city}) → every material with floor and fallback (paise); set({city, materialCode, floorPaise, fallbackPaise}) with 0 < floor ≤ fallback; requireAdmin; auditLog.
- UI (English, desktop first, fine on phones): /admin/verification (queue table with SLA badges and waiting time), /admin/verification/[id] (details by section, file viewer, a per-role checklist from docs/product/onboarding.md "What the admin checks" as local state, Approve / Ask for changes / Reject with a note dialog; after a decision go back to the queue with a toast), /admin/prices (editable table: ₹/kg floor and fallback per material, grouped by family), /admin/support (inbox from api.support.list; mark answered). Make Verification, Prices and Support live in src/components/admin/console-shell.tsx (not "Soon"), and show counts on the console home (waiting, overdue, open support requests).
TESTS: queue ordering + SLA, get, decide (approve creates an org + owner membership + rate card; approve saathi creates a saathiProfile; changes/reject need a note; wrong state refused; non-admin refused), adminPrices (validation; non-admin refused).` },
  { key: 'shop', task: `
AREA: the kabadiwala's app — home, pickup requests, weigh and pay, stock, prices.
OWN: convex/shop.ts, convex/stock.ts, src/components/shop/** (replace the placeholders kabadiwala-home.tsx, requests-page.tsx, request-detail.tsx, stock-page.tsx, rate-card-page.tsx; add your own sub-components), tests.
MESSAGES namespace: "shop".
BUILD:
- convex/shop.ts (requireOrg(ctx, ['kabadiwala'])):
  - requests: my bookings in three groups: new (requested), active (accepted, on_the_way), done (completed/declined/cancelled, latest 20). Shape: vBookingView from convex/lib/views.ts. Privacy until the shop accepts: address = only the area (the part before ', Bengaluru', last comma-separated piece) and phone masked with maskPhone; after accepting, the full address and phone.
  - get({bookingId}): one of my bookings (same privacy) plus my rate for each item.
  - respond({bookingId, accept}): requested → accepted or declined (canMoveBooking), add a timeline entry.
  - startTrip({bookingId}): accepted → on_the_way.
  - complete({bookingId, lines:[{materialCode, grams}], method:'cash'|'upi'}): weigh and pay. Rate = my rate card, else the city fallback (referencePrices); line paise with paiseFor; points with pointsFor; receipt saved; status completed; my inventory += grams per material (upsert by_org_material).
  - rateCard: every scrap-stage material in my families (org.families) with my price, the admin floor and fallback, and today's market price (latest marketPrices on or before today).
  - setRate({materialCode, paisePerKg}): must be ≥ floor (ConvexError 'BELOW_FLOOR'), upsert.
- convex/stock.ts: mine (requireOrg(ctx) — any business kind): my inventory with material names and stage, grams, value at today's market price, totals. /app/stock uses it for every business.
- UI (mobile first; big numbers, icons, few words):
  - KabadiwalaHome (/app): greeting with the shop name; today's pickups (count + the next one with time and area); new requests (count, big button to /app/requests); paid out today and this week; stock value; a price-check strip (3 materials: my price vs today's market); quick links (Sell to a yard → /app/sell, Prices → /app/prices).
  - RequestsPage (/app/requests): tabs New / Today / Done; each card: household first name, area, slot (date + morning/afternoon/evening), items (material + estimated kg), estimate; Accept / Decline on new ones.
  - RequestDetail (/app/requests/[id]): the booking; Start trip; "Weigh and pay": one row per item (kg input prefilled with the estimate) + add another material; live total at my rates; Cash / UPI; Confirm → receipt (thank-you, points earned).
  - StockPage (/app/stock): for every business kind: stock by material (kg, value), totals, and a Sell button (/app/sell) when the business kind sells to someone (buyerKindFor).
  - RateCardPage (/app/prices): my ₹/kg per material next to the floor and today's market price; edit inline; save; clear error below the floor.
TESTS: respond/startTrip/complete (inventory, receipt, points), setRate floor, address/phone privacy before and after accepting, another role and signed-out refused, stock.mine totals.` },
  { key: 'market', task: `
AREA: the business-to-business market — buy, sell, trades with escrow, trade receipts, and the home screen for yards, recyclers and manufacturers.
OWN: convex/market.ts, src/components/market/** (replace the placeholders business-home.tsx, market-page.tsx, sell-page.tsx, trades-page.tsx, invoice-page.tsx), tests.
MESSAGES namespace: "market".
THE CHAIN (convex/lib/chain.ts): kabadiwalas sell to yards, yards to recyclers, recyclers to manufacturers. Recyclers also sell "recycled" stage materials (flakes, granules, kraft, ingots). Manufacturers only buy.
BUILD convex/market.ts (requireOrg):
  - browse({materialCode?}): open listings from the kind that sells to me (sellerKindFor(my kind)), not mine, newest first (vListingView).
  - myListings: mine, open first.
  - createListing({materialCode, grams, askPaisePerKg, note?}): only if someone buys from my kind (buyerKindFor); grams > 0 and ≤ my stock (inventory); ask > 0; note ≤ 140 chars.
  - withdraw({listingId}): mine and open → withdrawn.
  - requestTrade({listingId, grams}): I must be buyerKindFor(listing.sellerKind); 0 < grams ≤ listing.grams; creates a 'requested' trade at the ask price with a timeline.
  - trades: { buying, selling } as vTradeView, with actions = tradeActionsFor(status, side), needsEwayBill = requiresEwayBill(total), inEscrow = isInEscrow(status), counterparty.
  - act({tradeId, action}): allowed only when tradeStep(status, action, mySide) is not null. accept: listing.grams -= trade.grams (refuse if not enough; mark sold at 0). pay: assign the receipt number LG-<yy>-<4 digits> and hold the money in escrow (simulated). dispatch: my stock -= grams (refuse if not enough). confirm: buyer stock += grams, escrow released, completed. Timeline entry each step; auditLog.
  - receipt({tradeId}): for either party: both names, addresses, GSTINs, the line (material, kg, ₹/kg, amount), total, number and date, and the e-way-bill note when needed. Call it a "Trade receipt" — GST tax invoices come with real payments.
- UI:
  - BusinessHome (/app for yards, recyclers, manufacturers): greeting; KPIs from your own queries (money in escrow, trades waiting for me, open listings, completed this month); "Waiting for you" (trades needing my action, one-tap); latest listings for me; quick actions Buy / Sell. Manufacturers: emphasise recycled material offers.
  - MarketPage (/app/market): material filter chips; listing cards (seller, area, material, kg, ₹/kg, note, total); Buy → dialog (kg ≤ available, total, confirm) → toast and link to Trades.
  - SellPage (/app/sell): my listings (withdraw) + New listing (material from my stock with kg available, kg, ₹/kg with a suggested price = today's market price × CHAIN_MARKUP for my kind from convex/lib/catalogue.ts and api.catalogue.priceBoard, note). Kabadiwalas use this page too.
  - TradesPage (/app/trades): tabs Buying / Selling; each trade: a step timeline (requested → accepted → paid into escrow → dispatched → delivered), counterparty, amount, escrow badge, e-way-bill note, the next action as a primary button, link to the receipt.
  - InvoicePage (/app/trades/[id]/invoice): printable trade receipt with a Print button and print CSS.
TESTS: the whole lifecycle on demo data (yard 102 buys from a kabadiwala listing → kabadiwala 101 accepts → yard pays → kabadiwala dispatches → yard confirms; stock moves on both sides; listing reduced/sold), refusals (wrong side, wrong kind, too many grams, not enough stock, signed out), browse shows the right tier only.` },
  { key: 'household', task: `
AREA: households selling scrap — /sell (book a pickup or a drop-off) and /t/{token} (follow it).
OWN: convex/households.ts, src/app/[locale]/(site)/sell/** (public, already in the sitemap), src/app/[locale]/(household)/** (new route group: layout + t/[token]/page.tsx, private: privateMetadata from @/lib/seo), src/components/sell/**, src/components/track/**, tests.
MESSAGES namespaces: "sell", "track".
Households never register. They confirm their phone with the SMS code when they book: reuse the phone sign-in (authClient.phoneNumber.sendOtp/verify and api.identity.ensureProfile — see src/components/auth/*), inline in the flow, keeping their basket in sessionStorage. Demo household: +919000000109, code 123456.
BUILD convex/households.ts:
  - shops({items:[{materialCode, kg}], near?:{lat,lng}}): public. Active kabadiwala orgs in Bengaluru (orgs by_kind_city) with name, area, offersPickup, distance km (haversine) when near is given, rating omitted, and the basket estimate from each shop's rate card (fallback price when a material is missing). Sort by distance when near is given, else by the best estimate.
  - book({orgId, mode:'pickup'|'dropoff', items, slotDate, slotWindow, address?, name}): requireUser; the profile's phone; pickup needs an address and a shop that offers pickups; slotDate from today to +7 days (indiaToday); 1-20 items with 0 < kg ≤ 500; creates a 'requested' booking (bookingToken(Math.random)), the estimate and a timeline. Returns the token.
  - track({token}): public by token: status, timeline, items with names, estimate, receipt lines with names, points, slot, mode, and the shop's name, area and address. Never return the household's phone or address.
  - mine: the signed-in household's bookings (by_household), newest first, with token and status.
  - cancel({token}): the household that booked it, while requested or accepted.
- UI (a phone, any language, little patience):
  - /sell step 1 "What do you have?": a grid of scrap-stage materials (api.catalogue.materials) with a colour and icon per family; tap to add; a kg stepper (− / + and quick presets); a running estimate from today's prices (api.catalogue.priceBoard).
  - step 2 "Who buys it?": nearby shops with their offer for this basket ("Use my location" optional), pickup or drop-off.
  - step 3 "When?": the next 7 days + morning/afternoon/evening; address (pickup); name.
  - step 4: confirm the phone with the SMS code and book → go to /t/{token}.
  - A "My pickups" list for signed-in households (api.households.mine).
  - /t/{token}: a status hero, the timeline, what's collected, estimate vs final receipt, points, the shop's contact and area, Cancel while allowed. Works signed out. Friendly not-found state.
TESTS: shops (estimate and sort), book (validation, requires sign-in, pickup needs address), track (no phone or address leak), cancel rules, mine.` },
  { key: 'saathi-insights', task: `
AREA: the Saathi app, and the Impact and Compliance screens for every business.
OWN: convex/saathi.ts, convex/insights.ts, src/components/saathi/** (replace saathi-home.tsx), src/components/insights/** (replace impact-page.tsx and compliance-page.tsx), tests.
MESSAGES namespaces: "saathi", "impact", "compliance".
BUILD:
- convex/saathi.ts (requireSaathi): board → open jobs (all Bengaluru; prefer my area first), my assigned jobs, my done jobs, earnings (sum payPaise of done), each with the posting business's name; take({jobId}): open → assigned to me; finish({jobId}): assigned to me → done.
- convex/insights.ts:
  - impact: for a business (requireOrg): kg bought from households (completed bookings' receipts; kabadiwalas), kg sold and kg bought in completed trades, CO2e avoided = Σ kg × material co2eFactor (materials table) for material that moved on or came in, money earned and spent, and a by-family breakdown; for a Saathi: jobs done, earnings. Return a discriminated union {kind:'org', …} | {kind:'saathi', …}.
  - compliance (requireOrg): GSTIN or "not registered"; pollution-board consent (board, number, validUntil, days left; 'ok' | 'expiring' (under 90 days) | 'expired' | 'missing'); a checklist (GST, consent, weighing scale stamped under Legal Metrology — self-declared placeholder, safety kit for workers); trade receipts (from trades with an invoiceNo: number, date, counterparty, amount, e-way bill needed?); and for recyclers and manufacturers an EPR summary for the Indian financial year (April–March): kg received/recycled by family and which regime applies (plastic: Plastic Waste Management Rules 2016; e-waste: E-Waste (Management) Rules 2022; batteries: Battery Waste Management Rules 2022; paper, metal, glass: none), with a note that certificates are generated on CPCB's EPR portals.
- UI:
  - SaathiHome (/app for Saathis): today's jobs I've taken (Mark done), open jobs near me (Take), earnings this week; big and simple.
  - ImpactPage (/app/impact): KPIs (kg recycled, CO2e avoided, money), a small bar chart by family (plain SVG or divs, no chart library), and a short "credit-ready ledger" explainer (every kilo is recorded with who, when and where — the evidence carbon and plastic-credit standards ask for). Saathis see earnings and jobs.
  - CompliancePage (/app/compliance): the checklist with statuses, consent validity with a reminder, receipts table (links to /app/trades/{id}/invoice), EPR summary for recyclers and manufacturers, and a short "what this means" note per item.
TESTS: take/finish rules (someone else's job, wrong state), board contents, impact numbers on demo data, consent status math (pure function), refusals (signed out, wrong role).` },
  { key: 'public', task: `
AREA: the public pages that tell the story and show the data — home, live price board, industry standards, rooftop solar.
OWN: src/app/[locale]/(site)/page.tsx and the home sections in src/components/site/** (you may rewrite them), src/app/[locale]/(site)/prices/**, src/app/[locale]/(site)/standards/**, src/app/[locale]/(site)/solar/**, src/components/prices/**, src/components/standards/**, src/components/solar/**, the site nav (src/components/site/site-nav.tsx, mobile-nav.tsx) and footer links, e2e/site.spec.ts and e2e/smoke.spec.ts (update the expectations you change; don't run them), tests. The routes are already in the sitemap (src/i18n/paths.ts — don't edit it).
MESSAGES namespaces: "home" (rewrite), "prices", "standards", "solar", plus new keys under "nav" and "footer" for the links you add. Remove en.json keys that no page uses any more and list them in mergeNotes.
BUILD:
- Home (/): the new story. India's scrap chain on one platform: households → kabadiwalas → yards → recyclers → manufacturers, with Saathis. Hero with "Sell your scrap" → /sell and "Join as a business" → /join, and "See today's prices" → /prices. A drawn diagram of the chain (inline SVG, brand colours). What each role gets. A live prices teaser (4 materials from api.catalogue.priceBoard({city:'Bengaluru'})). Trust points: verified businesses, fair prices with a floor, escrow for business trades, digital receipts, 12 languages. A "Why now" strip (EPR rules, the informal sector, UPI) with no invented numbers. Retire the old sector/verifier copy.
- /prices: the Bengaluru price board. Per material, grouped by family: today's ₹/kg, the 7-day change (arrow + %), a 30-day sparkline (inline SVG), and the admin floor; tapping a material shows a larger 30-day chart. Recycled materials in their own "Factory gate" section. <DemoNote>: sample prices for the prototype. Client component with useQuery; a friendly message when Convex isn't configured (isConvexConfigured from @/components/providers/convex-provider).
- /standards: "The Luma.Green standard" — the open material codes (table from api.catalogue.materials: code, name, family, stage; CSV download via a client-side Blob), grading (dry, sorted, no contamination), fair weighing (stamped scales, weight shown to the seller, digital receipt), receipts and chain of custody, verification, escrow — framed as norms the industry can adopt.
- /solar: rooftop solar for homes and businesses in Karnataka. A calculator: monthly bill (₹) or units, roof area → suggested kW (1 kW ≈ 120 units a month; ≈ 10 m² per kW), estimated cost (₹55,000–65,000 per kW), PM Surya Ghar subsidy for homes (₹30,000 per kW for the first 2 kW, ₹18,000 for the 3rd, capped at ₹78,000; none for businesses), payback in years, and a simple savings chart; a "Talk to us" form using api.support.send with topic 'solar'. Cite https://pmsuryaghar.gov.in and label everything an estimate. Put the maths in a pure function src/components/solar/calc.ts.
- Site nav: How it works, Prices, Help (/help), Join (/join); header button "Sell scrap" → /sell. Footer links to Standards, Solar, Help.
TESTS: unit tests for the solar maths and any price-board helpers; update the e2e specs to the new copy.` },
  { key: 'help', task: `
AREA: support and learning for every user — the help centre, guides, FAQs, tutorials, training, contact — and a small illustration set.
OWN: src/app/[locale]/(site)/help/** (public; /help is already in the sitemap), src/components/help/**, src/components/illustrations/** (new), tests.
MESSAGES namespace: "help" (large; keep every answer short, plain and specific).
BUILD:
- A typed content model in src/components/help/content.ts (keys into messages): roles household, kabadiwala, yard, recycler, manufacturer, saathi. For each: 5–8 guides (3–6 steps each, an illustration or icon per step), 8–12 FAQs (question + one- to three-sentence answer), 2–3 tutorial slots (title + duration; the video is a placeholder card "Video coming soon"), and a training path of 3–5 short modules with "Mark as done" progress kept in localStorage (wrap access in try/catch) and a completion badge. Cover: getting started, signing in with the SMS code, prices and the floor price, weighing and receipts, payments (cash, UPI, escrow), documents and verification, safety (PPE, lifting, e-waste and battery handling), carbon credits and EPR basics, disputes, privacy.
- Pages: /help (search across all guides and FAQs, client-side; role cards; a contact strip), /help/[role] (guides, FAQs as an accessible disclosure list, tutorials, training), /help/[role]/[guide] (numbered, illustrated steps), /help/contact (form: name, phone, role, topic, message → api.support.send; WhatsApp and phone as placeholders "+91 80 0000 0000"; hours; "we reply within one working day"). generateMetadata with pageMetadata/privateMetadata from @/lib/seo as the other site pages do (help pages are public and indexed).
- Illustrations: src/components/illustrations/*.tsx — 10–12 ORIGINAL, simple, flat SVG spot illustrations you draw yourself (no copied art): household with scrap bags, kabadiwala shop with a scale, weighing scale, auto-rickshaw pickup, yard with bales, recycler machine, factory, Saathi worker with gloves, phone with an SMS code, escrow shield with a rupee, solar roof, handshake. Brand greens (see src/app/globals.css tokens) and warm neutrals, ~240px, decorative (aria-hidden) unless given a title. Use them on the help pages; export them from an index for other areas.
- The app shell already links to /help/{role}.
TESTS: content integrity (every guide and FAQ key exists in en.json; every role has guides and FAQs), the search filter, training progress.` },
  { key: 'docs', task: `
AREA: documentation for the founders and their partners — the README, an A-to-Z testing guide, a feature inventory, and a script that captures screenshots.
OWN: README.md, docs/testing/** (new), docs/product/features.md (new), scripts/screenshots.mts (new), package.json (add ONE script: "screenshots": "jiti scripts/screenshots.mts"), docs/screenshots/.gitkeep, tests for any pure helpers.
MESSAGES: none.
BUILD:
- README.md, rewritten for partners and investors (keep the developer setup accurate: read the current README, AGENTS.md, docs/): what Luma.Green is (the chain and its roles); features by role (households, kabadiwalas, Saathis, yards, recyclers, manufacturers, admin) and the public pages (prices, standards, solar, help, join); a "See it" gallery of screenshots (Markdown images of docs/screenshots/*.png in a phone/desktop table — list exactly the files the script produces); the demo logins table (phone, role, what to try; code 123456; dev deployment only; admin on request); running it locally (pnpm install, .env.local, npx convex dev, npx convex run demo:seed and demo:reset, pnpm dev); tech stack; a docs map; status (prototype: what's real and what's sample data).
- docs/testing/README.md: the A-to-Z test plan. For every flow, numbered steps and the expected result, with the role and URL: sign in with a demo login; a household books a pickup (/sell) and follows it (/t/priyademo1 is a ready-made one); the kabadiwala accepts, starts the trip, weighs and pays, changes prices, lists stock for yards; a yard buys, pays into escrow and confirms delivery; a recycler dispatches and buys; a manufacturer orders recycled flakes, confirms delivery, checks compliance and EPR; a Saathi takes and finishes a job; a new applicant onboards (each role); the admin reviews, approves, asks for changes, rejects, edits prices and answers support; public pages (prices, standards, solar calculator + lead, help centre + contact); languages (Kannada, Hindi, Urdu right-to-left); resetting the demo data.
- docs/product/features.md: the feature inventory — built (with URLs), sample data, next (from docs/delivery/roadmap.md).
- scripts/screenshots.mts: a Playwright script (import { chromium } from "@playwright/test", already a dev dependency) that takes BASE_URL (default http://localhost:3100), signs in through /login with each demo phone (type the number, submit, then type 123456 — the code input is an input-otp field that auto-submits on the 6th digit; if the first-time language picker appears, choose English), and saves the key screens at phone (390×844) and desktop (1440×900) to docs/screenshots/<name>-phone.png and -desktop.png: home, prices, sell, tracking (/t/priyademo1), join, kabadiwala home, requests, weigh and pay (first request), rate card, yard market, trades, recycler home, manufacturer compliance, Saathi home, help, solar, standards. Skip the admin (it needs an authenticator app). Wait for network idle and a short settle; light colour scheme; hide the Next.js dev indicator (add a style tag: nextjs-portal { display: none !important; }). Log and continue when a page fails. Do not run it — the lead runs it after merging.` },
]

phase('Build')
const results = await parallel(TASKS.map((t) => () =>
  agent(`${COMMON}\n\nYOUR AREA (${t.key}):\n${t.task}`, {
    label: `build:${t.key}`,
    phase: 'Build',
    isolation: 'worktree',
    schema: RESULT,
  })
))
return TASKS.map((t, index) => ({ area: t.key, result: results[index] }))
