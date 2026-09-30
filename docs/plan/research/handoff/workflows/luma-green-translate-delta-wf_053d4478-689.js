export const meta = {
  name: 'luma-green-translate-delta',
  description: 'Translate 46 recently rewritten English strings (how it works, who it is for, contact, principles, trade receipts) into the 11 other locales, validated for ICU placeholders',
  phases: [{ title: 'Translate', detail: 'one agent per locale; writes out/<locale>.delta.json and runs the validator' }],
}

const S = '/private/tmp/claude-501/-Users-syedabdulmuqeeth-Developer-Luma-Green/51228076-21f3-492f-baee-2e45f75c41c5/scratchpad/i18n'
const REPO = '/Users/syedabdulmuqeeth/Developer/Luma.Green'

const LOCALES = [
  { code: 'hi', name: 'Hindi' },
  { code: 'bn', name: 'Bengali' },
  { code: 'mr', name: 'Marathi' },
  { code: 'ta', name: 'Tamil' },
  { code: 'te', name: 'Telugu' },
  { code: 'kn', name: 'Kannada' },
  { code: 'ml', name: 'Malayalam' },
  { code: 'gu', name: 'Gujarati' },
  { code: 'pa', name: 'Punjabi (Gurmukhi script)' },
  { code: 'ur', name: 'Urdu (Perso-Arabic script, right to left)' },
  { code: 'ar', name: 'Arabic (Modern Standard Arabic, right to left)' },
]

const RESULT = {
  type: 'object',
  properties: {
    locale: { type: 'string' },
    outputFile: { type: 'string' },
    validatorPassed: { type: 'boolean' },
    validatorLastLine: { type: 'string' },
    notes: { type: 'string' },
  },
  required: ['locale', 'outputFile', 'validatorPassed', 'validatorLastLine', 'notes'],
}

const prompt = (loc) => `
Translate 46 short strings of Luma.Green's web app from English into ${loc.name} (locale code "${loc.code}").

Luma.Green is an Indian recycling-chain platform: households sell scrap to kabadiwalas (local scrap shops), who sell to yards, then recyclers, then manufacturers; Saathis are gig workers who do pickups and sorting. Readers include scrap-shop owners and households who read little: plain, everyday spoken words, short sentences.

INPUT: ${S}/src/delta.json (nested JSON; only the values are English). These strings are the "How it works" page (sell, trade, record), the "Who it's for" page, the contact page, a few principles, and the trade-receipt wording on the compliance screen. Note: a "trade receipt" is NOT a GST tax invoice; translate "receipt" as receipt, never as invoice.
TERMINOLOGY: read ${REPO}/messages/${loc.code}.json and reuse its words for kabadiwala, Saathi, yard, recycler, manufacturer, household, pickup, escrow, receipt, stock, verified and so on.
OUTPUT: write ${S}/out/${loc.code}.delta.json with the same nested structure and keys, every value translated (UTF-8, 2-space indent). Write only that file; don't edit the repository.

Keep exactly as in English: "Luma.Green", UPI, GST, EPR, kg, the ₹ sign. Keep every ICU {placeholder} name exactly (for example {number} in "View receipt {number}").

Check with: node ${S}/validate.mjs ${S}/src/delta.json ${S}/out/${loc.code}.delta.json — fix every problem until it prints OK. Return the structured result.
`

phase('Translate')
const results = await parallel(LOCALES.map((loc) => () =>
  agent(prompt(loc), { label: `delta:${loc.code}`, phase: 'Translate', schema: RESULT })
))
return LOCALES.map((loc, i) => ({ locale: loc.code, result: results[i] }))
