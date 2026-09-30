export const meta = {
  name: 'luma-green-translate',
  description: 'Translate the prototype\'s 1,821 new English strings into 11 Indian and RTL locales: 22 agents, one per locale and chunk, each validated for ICU placeholders',
  phases: [{ title: 'Translate', detail: 'one agent per locale × chunk; writes a JSON file in the scratchpad and runs the validator' }],
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
  { code: 'ur', name: 'Urdu (Nastaliq/Perso-Arabic script, right to left)' },
  { code: 'ar', name: 'Arabic (Modern Standard Arabic, right to left)' },
]

const CHUNKS = [
  { key: 'help', what: 'the help centre: guides, FAQs, tutorials and training for every role (677 strings)' },
  { key: 'app', what: 'the app screens (kabadiwala, market, household selling and tracking, Saathi, impact, compliance) and the public pages (home, prices, standards, solar, nav, footer) (1,144 strings)' },
]

const RESULT = {
  type: 'object',
  properties: {
    locale: { type: 'string' },
    chunk: { type: 'string' },
    outputFile: { type: 'string' },
    keyCount: { type: 'number' },
    validatorPassed: { type: 'boolean' },
    validatorLastLine: { type: 'string' },
    glossary: { type: 'array', items: { type: 'object', properties: { english: { type: 'string' }, translation: { type: 'string' } }, required: ['english', 'translation'] } },
    notes: { type: 'string' },
  },
  required: ['locale', 'chunk', 'outputFile', 'keyCount', 'validatorPassed', 'validatorLastLine', 'glossary', 'notes'],
}

const prompt = (loc, chunk) => `
Translate part of Luma.Green's web app from English into ${loc.name} (locale code "${loc.code}").

Luma.Green is an Indian recycling-chain platform: households sell scrap to kabadiwalas (local scrap shops), who sell to yards, then recyclers, then manufacturers; Saathis are gig workers who do pickups and sorting; an admin verifies businesses. Many readers are scrap-shop owners, workers and households who read little and use a basic Android phone. Clarity beats elegance.

INPUT (read it whole): ${S}/src/${chunk.key}.json — ${chunk.what}. Nested JSON; only the VALUES are English text.
TERMINOLOGY: read ${REPO}/messages/${loc.code}.json (the existing, reviewed ${loc.name} translation of the rest of the app) and reuse its words for recurring terms: kabadiwala, Saathi, yard, recycler, manufacturer, household, pickup, drop-off, scrap, sign in, SMS code, business, application, verification, price, rate, stock, trade, escrow, receipt, help, and so on. Match its register and its digit style.
OUTPUT: write ${S}/out/${loc.code}.${chunk.key}.json — the same nested structure, the same keys in the same order, every value translated. UTF-8, 2-space indentation. Write only that file: do not edit anything in the repository.

HOW TO TRANSLATE
- Plain, everyday spoken ${loc.name}: short sentences, common words people actually say. Avoid stiff, bookish or bureaucratic vocabulary. Widely used English loanwords are fine where that is how people talk (app, UPI, GST, OTP, online, kg).
- Keep exactly as in English: the brand "Luma.Green"; material codes like PAPER-NEWS or PLASTIC-PET; abbreviations UPI, GST, GSTIN, EPR, CPCB, KSPCB, PCB, CO2e, PDF, CSV, SMS, OTP, PM Surya Ghar; URLs, email addresses, phone numbers; the ₹ sign and number formats as they appear; "kg", "kW", "m²".
- ICU MessageFormat must survive untouched: keep every {placeholder} name exactly; in {count, plural, =0 {…} one {…} other {…}} and {x, select, …} keep the argument name, keyword and option names, translate only the text inside the branches, and keep the # sign. You may add plural categories ${loc.name} needs (for example zero, two, few, many), but "other" must stay. Keep rich-text tags such as <link>…</link> or <strong>…</strong> with the same names, translating only the text inside. Keep apostrophes safe: in ICU a single quote before { or } escapes it — do not introduce stray ' before braces.
- UI labels (buttons, tabs, headings) stay short. Don't add or drop information. Don't translate keys.
- ${loc.code === 'ur' || loc.code === 'ar' ? 'Right-to-left script: write the words naturally in the script; leave Latin brand names, codes and numbers as they are (the browser handles direction).' : 'Use the standard script for the language.'}

CHECK, THEN FIX UNTIL CLEAN
Run: node ${S}/validate.mjs ${S}/src/${chunk.key}.json ${S}/out/${loc.code}.${chunk.key}.json
It checks the key set, empty values, ICU syntax, placeholders, plural/select structure, tags and the brand name. Fix every problem it lists and run it again until it prints "OK". Then re-read your file once for meaning and tone and fix anything unnatural (re-run the validator after edits).

Return the structured result: the glossary of the 10–20 recurring terms you used (English → ${loc.name}), and notes on anything a native reviewer should double-check.
`

phase('Translate')
const items = []
for (const loc of LOCALES) for (const chunk of CHUNKS) items.push({ loc, chunk })
const results = await parallel(items.map((it) => () =>
  agent(prompt(it.loc, it.chunk), { label: `translate:${it.loc.code}:${it.chunk.key}`, phase: 'Translate', schema: RESULT })
))
return items.map((it, i) => ({ locale: it.loc.code, chunk: it.chunk.key, result: results[i] }))
