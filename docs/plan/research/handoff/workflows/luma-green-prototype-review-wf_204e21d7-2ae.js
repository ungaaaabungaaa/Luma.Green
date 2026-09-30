export const meta = {
  name: 'luma-green-prototype-review',
  description: 'Adversarial review of the merged Luma.Green prototype (main): 6 reviewers by dimension, every finding verified by a sceptic, ranked fix list for after the pilot merge',
  phases: [
    { title: 'Review', detail: 'six reviewers, one dimension each, read main only' },
    { title: 'Verify', detail: 'a sceptic tries to refute each finding' },
  ],
}

const REPO = '/Users/syedabdulmuqeeth/Developer/Luma.Green'
const CONTEXT = `
You are reviewing Luma.Green, an Indian recycling-chain platform: Next.js 16 App Router + next-intl (12 locales) + Convex + Better Auth + shadcn/ui + Tailwind v4. Read AGENTS.md and docs/plan.md in ${REPO} first. Review the code as it is on the branch main in ${REPO} (git show main:<path>, or read the working tree files under src/, convex/, messages/, e2e/ which match main except for a few placeholder screens and empty convex/tables and convex/demo modules that you should ignore). Do NOT edit any file and do NOT run pnpm dev, build, e2e, or any npx convex command; you may run pnpm exec vitest run <file> on existing tests and node one-liners. Twenty other agents are building new features in worktrees; your job is a findings list, not fixes.

A finding is real only if you can point at the file and line and describe concrete inputs or state that produce wrong behaviour, a leak, a crash, an unusable screen, or a rule broken. Rank by severity: critical (data leak, money or weight wrong, sign-in bypass, crash on a main flow), high (a main flow fails for some users or locales), medium, low. Skip style nits.`

const DIMENSIONS = [
  { key: 'privacy-access', prompt: 'Access control and privacy: every Convex query/mutation/action in convex/*.ts and convex/http.ts. Can a signed-out or wrong-role caller read or change someone else\'s bookings, trades, applications, files, profiles, phones or addresses? Are household phones and addresses hidden until a shop accepts? Does the tracking token leak the phone? Is the admin check complete (email + two-factor)? Are storage files reachable without a token?' },
  { key: 'money-weight', prompt: 'Money and weight arithmetic: paise and grams everywhere (convex/lib/chain.ts, shop.ts, market.ts, households.ts, insights.ts, catalogue.ts, format.ts). Rounding, floats leaking in, totals that don\'t match line sums, receipts vs stock moves, escrow status transitions, listing grams after trades, CO2e factors, lakh formatting, ₹ display in every locale.' },
  { key: 'i18n-rtl', prompt: 'Internationalisation: every user-facing string through next-intl, keys present in all 12 messages/*.json, ICU plurals correct per locale, RTL layout for ur and ar (logical properties: ps/pe/start/end, mirrored icons, chart direction), dates/times in Asia/Kolkata, the language switcher keeping the path, hreflang and sitemap for every public route, hard-coded English in components.' },
  { key: 'a11y-mobile', prompt: 'Accessibility and phones: 375 px layouts without horizontal overflow, 44 px targets on field screens, one h1 per page, labels on every input, focus rings, aria on custom controls (radios, tabs, dialogs, steppers), colour contrast on the brand greens, keyboard operation of dialogs and the OTP input, loading/empty/error states on every data screen.' },
  { key: 'react-next', prompt: 'React and Next.js correctness: server vs client component boundaries, useSearchParams without Suspense, hydration mismatches (dates, random), useEffect redirect races (see the useSignedInQuery pattern), stale closures, missing keys, unbounded re-renders from Convex subscriptions, error boundaries, metadata generation, static params for locales, middleware/proxy locale routing edge cases (/en vs /).' },
  { key: 'convex-data', prompt: 'Convex data model and functions: missing indexes causing full scans (.collect() without withIndex on large tables), validators that don\'t match handlers, mutations that can double-apply (idempotency), seed data invariants (demo.ts) vs tests, cron/scheduler assumptions, http routes CORS, argument validation (negative grams, huge numbers, empty arrays), audit log coverage of every state change.' },
]

const FINDINGS = {
  type: 'object',
  properties: {
    findings: { type: 'array', items: { type: 'object', properties: {
      title: { type: 'string' }, severity: { type: 'string', enum: ['critical', 'high', 'medium', 'low'] },
      file: { type: 'string' }, line: { type: 'number' },
      description: { type: 'string' }, failureScenario: { type: 'string', description: 'concrete inputs or state -> wrong outcome' },
      suggestedFix: { type: 'string' },
    }, required: ['title', 'severity', 'file', 'line', 'description', 'failureScenario', 'suggestedFix'] } },
  },
  required: ['findings'],
}
const VERDICT = { type: 'object', properties: { real: { type: 'boolean' }, severity: { type: 'string', enum: ['critical', 'high', 'medium', 'low'] }, reasoning: { type: 'string' }, correctedFix: { type: 'string' } }, required: ['real', 'severity', 'reasoning', 'correctedFix'] }

phase('Review')
const results = await pipeline(
  DIMENSIONS,
  (d) => agent(`${CONTEXT}\n\nDIMENSION: ${d.prompt}\n\nBe thorough: walk every relevant file, not a sample. Return every real finding, most severe first; an empty list is fine if the code is sound.`, { label: `review:${d.key}`, phase: 'Review', schema: FINDINGS }),
  (review, d) => review ? parallel(review.findings.map((f) => () =>
    agent(`${CONTEXT}\n\nYou are the sceptic. A reviewer claims this finding in the "${d.key}" dimension. Open the file, trace the code path, and try to REFUTE it: is the scenario reachable, does the code really behave that way, is it already handled elsewhere (a validator, a layout, a hook, a test)? Default to real=false when uncertain. If it is real, confirm or correct the severity and the fix.\n\nFINDING:\n${JSON.stringify(f, null, 1)}`, { label: `verify:${d.key}:${f.file.split('/').pop()}`, phase: 'Verify', schema: VERDICT })
      .then((v) => ({ ...f, dimension: d.key, verdict: v })))) : [],
)

const all = results.flat().filter(Boolean)
const confirmed = all.filter((f) => f.verdict && f.verdict.real)
const order = { critical: 0, high: 1, medium: 2, low: 3 }
confirmed.sort((a, b) => order[a.verdict.severity] - order[b.verdict.severity])
log(`${confirmed.length} confirmed of ${all.length} findings`)
return { confirmed, refuted: all.filter((f) => !f.verdict || !f.verdict.real).map((f) => ({ title: f.title, file: f.file, reason: f.verdict ? f.verdict.reasoning : 'no verdict' })) }
