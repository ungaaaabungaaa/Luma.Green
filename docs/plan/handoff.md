# Handoff to the cloud session

Written 30 September 2026 (evening IST) by the Claude Code session that ran on the founder's Mac, just before that local clone was deleted. Everything that session produced is on GitHub: branch `feat/pilot` (this file, the research, the tooling) and the `worktree-wf_*` branches (unfinished feature areas). The cloud session owns `feat/pilot-qzkl7t` and merges from `feat/pilot`; the local session never touched that branch.

Read this file first, then [plan.md](./plan.md), then `docs/plan/research/handoff/` (verbatim agent outputs, workflow scripts and scratch tools).

## a. The founder's last five messages, verbatim

**1. 29 Sep 2026, 22:14 UTC (30 Sep 03:44 IST)**

> in terms of % how much work is completed? and let me know if any blockers

**2. 29 Sep 2026, 22:17 UTC**

> No, the limits are reset weekly. You can go full throttle.

**3. 29 Sep 2026, ~22:20 UTC**

> Limits are restored now. You have one week's worth of usage. You can go full throttle. Don't hold back.

**4. 29 Sep 2026, 22:30 UTC**

> in terms of % how much work is completed? and how much is left can we pause all the agents for a bit so my daily session limits resets

**5. 30 Sep 2026, 13:59 UTC (19:29 IST)** — a pasted block followed by a typed line. This is the last message the local session received; it ends without a full stop, so it is the one that appears cut off.

> We are moving this work to a cloud session, which can only see what is pushed to GitHub. Before the limit resets, finish and hand off everything. Do not start new research or new agents. Push to branch `feat/pilot` only; do not touch `feat/pilot-qzkl7t` (the cloud session owns it and will merge from `feat/pilot`).
>
> 1. Stop and collect the agents. For every agent or workflow that is still running or finished since the last commit, save its output verbatim into the repo under docs/plan/research/handoff/<agent-or-cluster-name>.md (or .json if that is what it produced). Nothing stays only in a scratchpad, /tmp, or a worktree.
>
> 2. Worktrees. For every git worktree: commit its changes on its own branch with a proper Conventional Commits message, push it, and list them in the handoff file (branch name, what it contains, whether it is finished, whether it should be merged into feat/pilot or dropped). Then `git worktree prune`. Do not delete any branch.
>
> 3. Write docs/plan/handoff.md with, in this order:
>    a. My last five messages in this chat, verbatim, including the one that was cut off mid-sentence when the session moved to the cloud.
>    b. The exact workflow you were running for the research: how the 18 briefs became the 24 question clusters, how the answers in docs/plan/research/answers/\*.json were produced, what "verified" means (the two checkpoint commits 1c2433a and 9c43ffd differ substantially, so explain which version is the verification pass and what the reconciliation step was supposed to do), and the prompt template each agent got.
>    c. A table of all 24 clusters: status (not started / answered / verified / merged into the plan doc), which agent owned it, where its output is.
>    d. The exact next steps you would have taken, in order, including filling the pending block at the end of "Risks and open questions" in the Luma.Green Platform Plan doc (https://claude.ai/artifact/Cj53WmgvqfF4Uqnug2pf9F), and re-exporting it to docs/plan.md.
>    e. Every decision I made in this chat that is not yet written in docs/ (product, architecture, pricing, pilot, legal), each as one line with the date.
>    f. Anything that exists only on this Mac and matters: scripts you wrote outside the repo, the daily backup setup, which .env variables are set (names only, never values), Convex deployment names, the state of DLT / MSG91 / Vercel / domain setup.
>    g. Anything you know is broken, half-done or untested right now.
>
> 4. Run `pnpm check` and `pnpm format:check`, fix what fails, commit everything on feat/pilot with a message like `docs(docs): hand off the research workflow and agent outputs to the cloud`, and push with `git push -u origin feat/pilot`. Confirm the pushed commit hash and that `git status` is clean in the main checkout and in every worktree.
>
> also, delete the entire repo from the local folder, including all the worktrees and everything. I have very limited storage on my MacBook because we are moving everything to the cloud. If you need to add any additional information and things that are needed for the cloud session, please add the information here

Earlier messages that still govern the work (28–29 Sep): the founder's product description, the "go full throttle with up to 20 worktrees" instruction, and the standing rules in section e.

## b. The research workflow, exactly

Three Workflow runs, in sequence. The scripts are verbatim in `docs/plan/research/handoff/workflows/` and every run's journal (each agent's start, result or failure) is in `docs/plan/research/handoff/journals/`.

### Run 1 — 18 briefs (`luma-green-platform-research-wf_c721bcd8-b08.js`, 29 Sep)

Eighteen web-research agents, one per topic: business, carbon, competitors-b2b, competitors-b2c, design, epr, industry-integration, legal, logistics, market, materials, payments-and-finance, personas, pricing, public-systems, solar, support-training, trust-safety. Each returned a structured object `{topic, headline, findings, recommendations, artifactMarkdown, risks, openQuestions, sources}`; the raw objects are in `docs/plan/research/handoff/briefs-raw/<topic>.json`, and their `artifactMarkdown` became the 18 briefs in `docs/plan/research/*.md`. A synthesiser agent then wrote the platform plan (`briefs-raw/_plan.json`: lead, overview, personas, sections, modules, roadmap, prototype scope, help centre, material catalogue, **15 risks**, open questions, sources) and a critic agent judged it (`briefs-raw/_critique.json`: verdict, gaps, unsupported claims). The plan text was pasted into the Claude Docs document "Luma.Green Platform Plan" and later exported to [plan.md](./plan.md).

### From 18 briefs to 24 clusters

`briefs-raw/_questions.json` is the flat list of **167 open questions**: every `openQuestions` entry from the 18 briefs, tagged with its topic, plus the 15 items in `docs/product/open-questions.md`. I grouped those 167 questions by hand into 24 clusters of related questions, each written as one to three composite questions that fold several originals together (for example the cluster `scrap-tax` merges the TCS-rate, "definition of scrap" and GST-rate/HSN questions from the payments, legal and materials briefs). The clusters, their titles and their exact question text are the `CLUSTERS` array in `luma-green-answer-open-questions-wf_08eff266-1e1.js`. The 15 risks became one cluster, `risk-guards`, which asks whether each risk's guard in the plan is enough.

### Run 2 — answers (`luma-green-answer-open-questions-wf_08eff266-1e1.js`, run `wf_08eff266-1e1`)

A three-stage pipeline per cluster, with no barrier between clusters:

1. **Research.** One agent per cluster. Prompt = `CONTEXT` (below) + the cluster title + the numbered questions + "Return the structured result with one entry per question, in order." Output schema `ANSWER_SCHEMA`: `{cluster, answers: [{question, answer (3–10 sentences with figures and dates), status: answered | partly | needs-pilot-or-counsel, decision (recommended default), whoToAsk, sources: [{title, url, date}]}]}`. **These objects are exactly what `docs/plan/research/answers/<cluster>.research.json` contains.** 22 of 24 clusters finished this stage.
2. **Verify.** One sceptic agent per cluster, fed the research output. Prompt = `CONTEXT` + "You are the sceptic … open its cited sources and check that they exist, say what the answer claims, and are current as of 29 September 2026; look for a newer development … check arithmetic; flag any figure that has no source. Default to holds=false when a key claim is unsupported. Where it does not hold, write the corrected answer with the sources you opened." Output schema `VERDICT_SCHEMA`: `{verdicts: [{question, holds, problems, correction, extraSources}]}`. The result was to be saved as `<cluster>.verify.json`. **No cluster finished this stage.** Every verify agent was killed by a usage limit (three attempts for the first six clusters, one or two for the rest); the started agent IDs are in the table in section c and in the journal.
3. **Synthesise.** One agent, given all clusters' answers plus verdicts, writes the Markdown for the "Answers to the open questions" section: a lead paragraph, one `### <cluster title>` section per cluster with the answer to each question, a **Decision:** line and a **Confirm with:** line, inline `[name](url)` citations on every figure, and a closing "### Still open" list with who settles each item and by when. This is the **reconciliation step**: where a verdict says `holds=false` it uses the sceptic's correction instead of the researcher's answer; where it holds, the answer tightened. Started twice, failed twice (usage limits), so no synthesis exists.

**What "verified" means and why 1c2433a and 9c43ffd differ.** Neither commit contains a verification pass; both hold stage-1 research output only. Commit `1c2433a` ("research briefs, verified answers so far") saved the first 12 clusters that had finished stage 1 — the word "verified" in that message is wrong, and the amended message on `9c43ffd` says "not yet verified". `9c43ffd` re-extracted every stage-1 result from the run journal: 22 clusters, serialised with a one-space indent instead of two (which is why every one of the 12 earlier files shows as rewritten), and for two clusters — `data-it-rules` and `identity` — the pipeline had re-run the research agent after a kill, so the later agent's answer replaced the earlier one (same questions and statuses, rewritten text, more sources: 10→13 and 17→21 for data-it-rules, 13→14 and 13→18 for identity). The earlier versions are kept verbatim in `docs/plan/research/handoff/answers-v1/`. For those two clusters, prefer the later file or merge the source lists; nothing has been reconciled yet.

### The `CONTEXT` block every agent in run 2 received

> Luma.Green is an Indian recycling-chain platform starting a Bengaluru pilot on 13 October 2026: households sell scrap to kabadiwalas (local scrap shops), who sell to yards, then recyclers, then manufacturers; Saathis are gig workers who do pickups and sorting; one admin verifies every business. The pilot records cash and UPI payments but moves no money; business escrow is simulated for now. The founders need answers they can act on, in plain English, with sources they can open.
>
> Today is 29 September 2026. Use web search and open the pages you cite (a search snippet is not a source). Prefer official pages: gazettes, CPCB/KSPCB/BESCOM/KERC/RBI/CBIC/GSTN portals, ministry press releases, company pricing pages, dated news. Give the date of each source. If something cannot be settled from public pages (it depends on the pilot, a lawyer or a phone call), say so and give the best available default plus who to ask. Never invent figures: a missing number is a one-line open item.

The full per-stage prompts, schemas and the 24 clusters' question text are in the script itself; do not paraphrase them when resuming, reuse the script.

### How to resume run 2

`Workflow({scriptPath: "docs/plan/research/handoff/workflows/luma-green-answer-open-questions-wf_08eff266-1e1.js", resumeFromRunId: "wf_08eff266-1e1"})` replays the 22 cached research results (the journal for that run must be at the session's `subagents/workflows/wf_08eff266-1e1/journal.jsonl`; a copy is in `handoff/journals/`). In a fresh session without that journal, run the script fresh: 24 research agents, 24 sceptics, one synthesiser — about 50 agents, each opening 10–25 pages. Change `TODAY` in the script to the real date first.

## c. The 24 clusters

Status key: **not started** (no research output), **answered** (stage-1 research output saved, unverified), **verified** (sceptic verdict saved), **merged** (in the plan doc). Agent IDs are the workflow agent IDs in `handoff/journals/wf_08eff266-1e1.journal.jsonl` (transcripts were on the Mac only). Output paths are relative to `docs/plan/research/`.

| #   | Cluster              | Title                                              | Status      | Research agent(s)                                  | Verify agents (all killed before finishing)             | Output                                                                         |
| --- | -------------------- | -------------------------------------------------- | ----------- | -------------------------------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------ |
| 1   | ecommerce-operator   | Is Luma.Green an e-commerce operator?              | answered    | a6d6f3f79eb54628e                                  | a4bdd7c9b6f84cdb6, a5151d86369d36099, aac88b82361f5914a | `answers/ecommerce-operator.research.json`                                     |
| 2   | scrap-tax            | Tax on scrap: TCS, GST rates, HSN, metal-scrap TDS | answered    | a0d6b78c040985201                                  | a1b134350b37958d8, ab449749309079b65, aa7e510cbd15ecf03 | `answers/scrap-tax.research.json`                                              |
| 3   | gig-workers          | Saathis and gig-worker law                         | answered    | ad580abe46de16fe2                                  | a0ad1f568b2498b9d, aae62883d9326dbee, afcd2bb4e35a53fe9 | `answers/gig-workers.research.json`                                            |
| 4   | swm-2026             | Solid Waste Management Rules 2026 and Bengaluru    | answered    | ad62ce860884619c8                                  | a640bdeaa812688f2, a49d664472c1284a9, ae37ab77846f68ee3 | `answers/swm-2026.research.json`                                               |
| 5   | dwcc-partners        | Dry-waste centres, NAMASTE and NGO partners        | answered    | a41cd10c988f31018                                  | a3e1e3355d59ea5c0, ae044ade5d4a50a17, a0b608e7bb5dc8376 | `answers/dwcc-partners.research.json`                                          |
| 6   | epr-portals          | EPR exchange, portals and evidence                 | answered    | aa17b413ce198dce0                                  | ad15d1e69925150e1, ac27cb0cc199c4424, a23bbe0f9e9f7d8fc | `answers/epr-portals.research.json`                                            |
| 7   | credits              | Carbon and plastic credits                         | answered    | a40f1111a3bd0052e                                  | af54b012a0c22d1c0, a9dc7ed1464aead83                    | `answers/credits.research.json`                                                |
| 8   | escrow-payments      | Escrow, payment partners and lending               | answered    | aa529cc0706ce34d6                                  | a5200d93463d3dbb3, a1df1e2d0a9cba90d                    | `answers/escrow-payments.research.json`                                        |
| 9   | kabadiwala-economics | Kabadiwala economics in Bengaluru                  | answered    | aae1d2b51345add11                                  | a6f11034a51dd13cd, ac278707a348e63e1                    | `answers/kabadiwala-economics.research.json`                                   |
| 10  | competitors          | Competitor facts still unknown                     | answered    | ad04043a2f74f45ab                                  | a8a22edc8a3dcc594, afc4a29f251e88c33                    | `answers/competitors.research.json`                                            |
| 11  | reference-prices     | Reference prices and price policy                  | answered    | ab8a39aeb57759ef5                                  | a5012904263a7cf21                                       | `answers/reference-prices.research.json`                                       |
| 12  | metrology-police     | Weighing scales, consents and police rules         | answered    | a12b6bd0310bade85                                  | ace9b9482d3b94c68                                       | `answers/metrology-police.research.json`                                       |
| 13  | data-it-rules        | Data protection, IT rules and accessibility        | answered ×2 | ad36445a1db7cc3a3, ac80d012512d04170               | a0b88ee22abcee696, a24e33588dc866545                    | `answers/data-it-rules.research.json` (later); `handoff/answers-v1/` (earlier) |
| 14  | identity             | Verifying people without storing Aadhaar           | answered ×2 | af901f8b4b747250a, ab916d2dd790c7877               | aaae0eebe2bccae6a, ac7f06d0465dddc37                    | `answers/identity.research.json` (later); `handoff/answers-v1/` (earlier)      |
| 15  | eway-gst-ops         | E-way bills, GST filing and MSME payment rules     | answered    | a25e06c7635339796, a573a8409f3b45c6b               | a42edb41313afb0e9, abde83f3e93557c30                    | `answers/eway-gst-ops.research.json` (later of the two)                        |
| 16  | logistics-facts      | Logistics facts for Bengaluru                      | answered    | ad58ef42a7c5b7cee                                  | a063c9b78aa8477ff                                       | `answers/logistics-facts.research.json`                                        |
| 17  | materials            | Material codes, names and factors                  | answered    | ae3cb799573602176                                  | —                                                       | `answers/materials.research.json`                                              |
| 18  | solar-facts          | Rooftop solar facts for Karnataka                  | not started | — (two attempts killed)                            | —                                                       | —                                                                              |
| 19  | support-ops          | Support line, voice and messaging                  | answered    | a7bd68d3c6e01e4a5, a88b7be2b81a45f0b               | a6822ffa4244ba3b0                                       | `answers/support-ops.research.json` (later of the two)                         |
| 20  | factory-integration  | How yards, recyclers and mills work today          | answered    | a13582418d8e90f97                                  | —                                                       | `answers/factory-integration.research.json`                                    |
| 21  | design-facts         | Languages, digits, pictures and offline behaviour  | answered    | a543ac5b4a9d90f3f                                  | —                                                       | `answers/design-facts.research.json`                                           |
| 22  | investor-figures     | Investor figures and product policy defaults       | answered    | aa6ee6fb41162aa67                                  | —                                                       | `answers/investor-figures.research.json`                                       |
| 23  | city-systems         | City dashboards and national programmes            | not started | — (two attempts killed)                            | —                                                       | —                                                                              |
| 24  | risk-guards          | Checks on the plan's 15 named risks                | answered    | a1f7a96e67334288e                                  | —                                                       | `answers/risk-guards.research.json`                                            |
|     | synthesise           | "Answers to the open questions" section            | not started | a4255552fa8cf5ec0, aea19bb07dcbd8647 (both killed) |                                                         | —                                                                              |

Nothing is merged into the plan doc yet; its "Answers to the open questions" block is still the empty pending block.

## d. Next steps, in the order I would have taken them

1. **Finish the research.** Resume run 2 (section b): research `solar-facts` and `city-systems`, verify all 24, synthesise. Save `<cluster>.verify.json` next to each `.research.json` and the synthesis as `docs/plan/research/answers/synthesis.md`.
2. **Fill the plan doc.** The Claude Docs document is https://claude.ai/artifact/Cj53WmgvqfF4Uqnug2pf9F (docs project `5ef44161-5fa9-4566-b7fe-c713bd2cc27e`, main tab `30a18c9e-c587`, prose node `d059180d-ca58`, at revision 32 after the founder's own edits — re-read before writing). At the end of "Risks and open questions" sits a pending block with id `mnds9xrwhp4.38272`; replace it (docs `update` on the node, `replace` of that block id) with `## Answers to the open questions` followed by the synthesis Markdown. Writes are capped at 32 KB each, so split a long section into several `insert`s after the heading. The doc also has a Sources tab (file `205d2466-cea4`, node `b5a12c93-6449`) with the 339 links; append the new sources there and to `docs/plan/sources.md`.
3. **Re-export to `docs/plan.md`.** Use the docs `export` (markdown, comes back base64; it exceeded the tool output cap before, so write it to a file and decode). `docs/plan.md` is that export with two hand replacements: the overview widget `32a07b9e-57c5` and the roadmap widget `4aaa2b16-06d4` become the Mermaid diagrams already in the file, and the widget placeholders are removed. Then update `docs/plan/sources.md` and the README's plan link if the section anchors changed. Send the founder a fresh Word export (the docs `export` to docx; the previous file, delivered 29 Sep, is `docs/plan/research/handoff/luma-green-platform-plan-2026-09-29.docx`, with a Sources appendix added at the XML level).
4. **Finish the 20 feature areas.** `handoff/workflows/luma-green-pilot-build-wf_82dbdc7d-e45.js` is the build script: `COMMON` rules (ownership matrix so 20 agents never touch the same file, foundation conventions, checks, commit trailer), 20 `TASKS`, a `WIP` map that tells each agent which `worktree-wf_*` branch to `git merge` first, and `args.half` (1 = areas 1–10, 2 = areas 11–20) because the per-workflow concurrency cap on the Mac was 8. On a machine with a higher cap run it once without `args`. Worktrees must start from the foundation (`1c2433a` or later on `feat/pilot`), not `main`; the Workflow tool cut them from local `main`, hence the fast-forward monitor described in the memory notes. Agents must never run `npx convex dev/deploy/run/import/export` (one shared dev deployment); only `npx convex codegen --typecheck disable`.
5. **Merge.** `handoff/tools/merge-pilot.sh` merges the branches into `feat/pilot` one at a time: `messages/*.json` go through the JSON three-way driver (`.gitattributes` is committed; register the driver once per clone with `git config merge.json3.driver "python3 scripts/i18n/json3merge.py %O %A %B"`), `convex/_generated/*` takes ours, then `npx convex codegen --typecheck disable`. Expect hand merges in `convex/schema.ts` (only if an agent edited it outside its table module), `convex/demo.ts`, `src/components/app/nav.ts` and `messages/en.json`. Wire the cross-area integrations each agent lists in its result's `integrations` field.
6. **Seed and test.** `npx convex dev --once` (schema changes since `3d1e720` are not on the dev deployment yet), `npx convex run demo:reset` (internal action; seeds the world through the `convex/demo/<area>.ts` hooks), `pnpm dev --port 3100`, then browser-test every new route as the demo people (phones `+91 90000 00101`–`130`, code `123456`, dev only) at 375 px and desktop. The admin console needs the founder's authenticator; its tests cover it.
7. **Translate.** `scripts/i18n/README.md`: diff `messages/en.json` against `main`, chunk, one agent per locale and chunk with `validate.mjs`, `merge_locale.py`, then `src/i18n/messages.test.ts`. The `soon.*` placeholder keys are English in all 12 files and must be translated or removed with the placeholder screens.
8. **Ship.** Update `README.md`, `docs/product/features.md`, `docs/testing/` (A-to-Z test plan), `pnpm screenshots`; `pnpm check`, `pnpm build`, `pnpm e2e`; open the PR from `feat/pilot` (body draft in the style of PR #24), squash-merge by hand when green (`gh pr merge --squash`; auto-merge is disabled), delete the `worktree-wf_*` branches only after the merge, and revisit Dependabot's Sentry 11 bump (PR #22, closed because it failed typecheck and build).
9. **Then** the post-merge review: `handoff/workflows/luma-green-prototype-review-wf_204e21d7-2ae.js` (six reviewers by dimension, a sceptic per finding) produced nothing before it was stopped; run it fresh against the merged branch.

## e. Decisions from the chat not yet in `docs/`

Dates are the founder's message dates (IST). Product decisions from 28–29 Sep that already sit in `docs/product/*` and the ADRs are not repeated.

- 28 Sep 2026 — Plan everything in `docs/` before any code; Claude has full freedom over architecture, future feature work, data migration and backups.
- 28 Sep 2026 — Real users within 2–3 weeks (≈ 13–20 Oct 2026), then optimise from data; testers are the founder plus two people.
- 28 Sep 2026 — Later modules to keep in the plan: carbon trading and credits, rooftop solar applications, documentation and legal services, a machinery data bank; a WhatsApp channel (photo → LLM estimate → booking) is to be planned separately; live LLM translation is on hold.
- 28 Sep 2026 — Convex on the free plan, one dev and one prod deployment; PostHog and similar only once the partner commits; the "Ponytail" skill was skipped (not in the catalogue).
- 29 Sep 2026 — UI kit stays shadcn/ui; latest Tailwind; white theme only, no dark mode; mobile first, households and kabadiwalas phone-only.
- 29 Sep 2026 — Admin sign-in is password plus authenticator (TOTP); the five details (name, email, Aadhaar, date of birth, phone) are the admin profile, Aadhaar last four digits only; one admin, team members later.
- 29 Sep 2026 — Publishing: "Straight to luma.green" — merge each PR to `main` as soon as all checks pass, no staging step; squash-merge by hand because auto-merge is off; keep `docs/` in step with what is built.
- 29 Sep 2026 — Saathi pay (by the kabadiwala or the manufacturer) is out of scope for now.
- 29 Sep 2026 — The platform plan is the repo's main description (README opens with it; GitHub description set).
- 29 Sep 2026 — Local development must feel real: seed about 30 people across every role and one admin, every material at every level, every language; demo GSTINs fail the checksum and every name is invented.
- 29 Sep 2026 — All risks and open questions in the plan are to be answered with research tools, not left to the founders.
- 29 Sep 2026 — Up to 20 worktrees and 20–25 agents at a time; close every open PR; report progress as a percentage with blockers; delete each worktree as soon as its branch is merged (the Mac's disk is small).
- 29 Sep 2026 — A Word file of the plan for the partner, who submits it around 30 Sep and expects heavy changes; a Sources appendix with clickable links was added.
- 29 Sep 2026 — Dependabot PR #22 (Sentry 11) closed on purpose: it fails typecheck and build; revisit later.
- 29 Sep 2026 — Checkpoint-commit and push before usage limits hit; "the limits are reset weekly", so run at full throttle otherwise.
- 30 Sep 2026 — Pause all agents when asked so the daily session limit resets; then move the whole build to a cloud session and delete the local clone.
- Standing rules (28–29 Sep) — never store full Aadhaar; secrets stay out of chat, email and the repo; never a production deploy key in `.env.local`; test keys never reach production and live keys never reach local; the founder does the Vercel and Convex production switch-on and no one changes Vercel settings or secrets for them; the founder's email is for identification only; install skills only from the official catalogue.

## f. What existed only on the Mac

All of it is now in `docs/plan/research/handoff/` unless noted.

- **Workflow scripts** (`handoff/workflows/`): platform research (18 briefs), answer-open-questions (24 clusters), pilot build (20 areas, with the `WIP` map and `args.half`), prototype build (8 areas, merged as PR #24), prototype review, and the two translation workflows (1,821 strings into 11 locales; a 46-string delta).
- **Run journals** (`handoff/journals/`): every agent start, result and failure for those runs, including the full research results and the prototype build's structured results.
- **Raw research** (`handoff/briefs-raw/`): the 18 briefs' structured outputs, the synthesised plan object, the critique, the 167 questions and the 339 sources.
- **Prototype build results** (`handoff/prototype-build/`): the eight area agents' structured reports for PR #24 (routes, functions, tables, checks, unfinished items).
- **Scratch tools** (`handoff/tools/`): `merge-pilot.sh` (branch merge loop), `worktree.env.local` (the non-secret Convex URLs each worktree needs as `.env.local`), `gstin.mjs` (GSTIN checksum, for making demo GSTINs that fail it), `check-keys.mjs` and `unused-keys.py` (message-key audits), `icu-check.mjs` and `merge.mjs` (translation validation and merge, superseded by `scripts/i18n/`), `contrast.mjs` and `oklch.mjs` (colour checks), `render-illustrations.mjs` (illustration preview page), `prices.mts` (recomputes the seeded figures the test plan quotes), `totp.py` (RFC 6238 code generator that takes the secret as an argument, for the dev admin test account).
- **Git configuration that lived in `.git/`**: the JSON three-way merge driver (`merge.json3.driver`) and the `messages/*.json merge=json3` attribute. The attribute is now committed as `.gitattributes`; the driver must be registered per clone (command in section d, step 5).
- **The delivered Word file**: `handoff/luma-green-platform-plan-2026-09-29.docx`.
- **`.env.local` variable names** (values backed up to `~/Luma.Green.env.local.backup` on the Mac, outside the repo; never in chat or git): `CONVEX_DEPLOYMENT`, `NEXT_PUBLIC_CONVEX_URL`, `NEXT_PUBLIC_CONVEX_SITE_URL`, `VERCEL_OIDC_TOKEN`, `DEV_ADMIN_EMAIL`, `DEV_ADMIN_PASSWORD`, `DEV_ADMIN_TOTP_KEY`. The three Convex values are not secret and are in `handoff/tools/worktree.env.local`. The `DEV_ADMIN_*` values are the admin test account on the shared dev deployment; the cloud session needs them from the founder (or creates a new dev admin through `/admin/setup` after clearing the dev `adminProfiles` row).
- **Convex dev deployment env vars** (names): `BETTER_AUTH_SECRET`, `SITE_URL`, `EXTRA_TRUSTED_ORIGINS`, `AUTH_DEV_MODE=true` (sign-in codes are logged, not sent), `ADMIN_EMAIL`.
- **Convex deployments**: dev `glorious-rooster-470` (eu-west-1; team `syed-abdul-muqeeth`, project `luma-green`), shared by every agent and seeded by `demo:reset`; **no production deployment exists yet** — the founder generates the production deploy key and adds it to Vercel per `docs/operations/environments.md`.
- **Vercel**: project `luma_green` (scope `thehelds-projects`), production at `lumagreen.vercel.app`; environment variables are placeholders; the production build does not yet run `convex deploy`, so features stay switched off there (`docs/operations/services.md`).
- **Domain**: `luma.green` does not resolve; not added to Vercel; DNS not set.
- **DLT / MSG91**: the founder is registering the principal entity, sender ID and templates on DLT; no MSG91 key exists anywhere; production shows "Phone sign-in opens soon" until it does; dev uses `AUTH_DEV_MODE` and the demo phones with code `123456`.
- **Daily backups**: designed in `docs/operations/backups.md` (script plus launchd plist) but **not installed** on the Mac — no `~/LumaGreenBackups`, no `green.luma.backup` launch agent. The script assumes a clone at `$HOME/Developer/Luma.Green`, which no longer exists; re-point `REPO` when it is set up, and it only matters once production has data.
- **Other artifacts**: the Claude Docs plan (link in section d), the clickable prototype canvas https://claude.ai/artifact/4hiq2r5tm5kWDBqTGEPD8C (17 artboards, docs-first phase), and the Claude Code memory notes for this project on the Mac (a resume checkpoint and the founder's working preferences; their content is repeated here).
- **`.claude/launch.json`** (now committed): the desktop app's dev-server entry, `pnpm dev --port 3100`.

## g. Broken, half-done or untested right now

- **All 20 feature areas are unfinished.** Seven have substantial work (section 2's table below); none passes `pnpm check`; every WIP commit was made with `--no-verify`, and several branches commit a regenerated `convex/_generated/api.d.ts` that must be regenerated after merging.
- **Research**: 22 of 24 clusters answered, none verified, two not researched, no synthesis; the plan doc's pending block is empty and `docs/plan.md` ends "Risks and open questions" without answers.
- **The foundation** (`890145f`) adds about 40 placeholder screens (`SoonPage`, keys `soon.*`, English in all 12 locales), nav entries pointing at them, empty `convex/tables/<area>.ts` modules, empty `convex/demo/<area>.ts` seed hooks, and cron stubs (`priceEngine.daily`, `notifications.scan`, `rulebook.reminders`) that return null. Users of the dev deployment see "coming soon" pages until the areas land.
- **Dev deployment**: the schema and function changes since `3d1e720` (materials fields, membership roles, the area table spread, crons) have been codegen'd but not pushed with `npx convex dev --once`; run that before testing anything on `feat/pilot`.
- **Untranslated strings**: the `soon.*` keys and every new key on the WIP branches (`messages/en.json` in the rulebook and exports branches).
- **Admin console** was never clicked through in a browser (needs the founder's authenticator); covered by 122 unit tests only.
- **Review of `main`**: not done; the review workflow produced nothing.
- **CI on `feat/pilot`**: GitHub Actions has not run on the branch (it runs on PRs and `main`); the handoff commit was checked locally with `pnpm check` and `pnpm format:check` (results in the commit message).
- **Local `main` was force-pointed** at the foundation so worktrees would start there; that pointer died with the clone. Remote `main` is still `3d1e720` (PR #24).
- **Dependabot**: PR #22 (Sentry 11) closed unmerged; a newer `vite` bump (PR #21) is merged.
- **Known product gaps carried from PR #24**: real payments (escrow is simulated, ADR 0009), SMS (waiting for DLT), the AI photo estimate (no key), voice.

## 2. Worktrees and branches (section 2 of the founder's list)

Every worktree's changes were committed on its own branch (message `wip(<branch>): checkpoint before the pause`, or `wip: checkpoint (relaunching as two workflows)` for three of them) and pushed; `git status` was clean in all 16 before the clone was deleted. All are cut from the foundation `1c2433a` on `feat/pilot`. Line counts are `git diff --shortstat 1c2433a..<branch>`.

| Branch                       | Area         | Contains                                                                                                                                                                                                               | Finished? | Merge or drop                                  |
| ---------------------------- | ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ---------------------------------------------- |
| `worktree-wf_76930181-5f6-1` | world        | Only `convex/count.tmp.test.ts`, a 23-line scratch test the agent left                                                                                                                                                 | No        | **Drop**; restart the area                     |
| `worktree-wf_76930181-5f6-2` | lots         | `convex/lots.ts`, `convex/tables/lots.ts` (+ regenerated api.d.ts), 2,046 lines                                                                                                                                        | No        | **Merge** as the starting point                |
| `worktree-wf_76930181-5f6-3` | floor        | `convex/floor.ts`, `convex/lib/quality.ts` + test, `convex/demo/floor.ts`, `convex/tables/floor.ts`, 3,071 lines                                                                                                       | No        | **Merge**                                      |
| `worktree-wf_76930181-5f6-4` | rulebook     | `convex/rulebook.ts` + test, `convex/lib/rules.ts`, `convex/demo/rulebook.ts`, `convex/tables/rulebook.ts`, `src/components/admin/rules/*` (compliance calendar, deadlines), `messages/en.json`, 22 files, 5,310 lines | No        | **Merge**                                      |
| `worktree-wf_76930181-5f6-5` | priceEngine  | `convex/priceEngine.ts`, `convex/lib/priceMath.ts` + test, `convex/adminPrices.ts` edits, `convex/tables/priceEngine.ts`, 2,995 lines                                                                                  | No        | **Merge**                                      |
| `worktree-wf_76930181-5f6-6` | logistics    | `convex/logistics.ts` + test, `convex/lib/routing.ts` + test, `convex/demo/logistics.ts`, `convex/tables/logistics.ts`, `src/components/logistics/*`, 15 files, 4,994 lines                                            | No        | **Merge**                                      |
| `worktree-wf_76930181-5f6-7` | payments     | `convex/payments.ts` + test, `convex/lib/tax.ts` + test, `convex/demo/payments.ts`, `convex/tables/payments.ts`, 3,748 lines                                                                                           | No        | **Merge**                                      |
| `worktree-wf_76930181-5f6-8` | exports      | `convex/exports.ts` + test, `convex/demo/exports.ts`, `convex/tables/exports.ts`, `src/components/exports/*`, `src/lib/csv.ts` + test, `messages/en.json`, 13 files, 3,511 lines                                       | No        | **Merge**                                      |
| `worktree-wf_b677105e-b13-1` | grievance    | `convex/tables/grievance.ts` only, 140 lines                                                                                                                                                                           | No        | Merge (it is just the table module) or restart |
| `worktree-wf_b677105e-b13-2` | hazard       | Nothing beyond the foundation                                                                                                                                                                                          | No        | **Drop** (never pushed; no commits)            |
| `worktree-wf_b677105e-b13-3` | credits      | `convex/lib/emissionFactors.ts`, `convex/tables/credits.ts`, 312 lines                                                                                                                                                 | No        | **Merge**                                      |
| `worktree-wf_b677105e-b13-4` | solar        | Nothing beyond the foundation                                                                                                                                                                                          | No        | **Drop** (never pushed; no commits)            |
| `worktree-wf_b677105e-b13-5` | support      | `convex/support.ts`, `convex/demo/support.ts`, `convex/tables/support.ts`, `src/components/help/training-keys.ts`, 643 lines                                                                                           | No        | **Merge**                                      |
| `worktree-wf_b677105e-b13-6` | kabadi       | Nothing beyond the foundation                                                                                                                                                                                          | No        | **Drop** (never pushed; no commits)            |
| `worktree-wf_b677105e-b13-7` | marketExtras | Nothing beyond the foundation                                                                                                                                                                                          | No        | **Drop** (never pushed; no commits)            |
| `worktree-wf_b677105e-b13-8` | adminExtras  | `convex/tables/adminExtras.ts` only, 45 lines                                                                                                                                                                          | No        | Merge or restart                               |

Areas with no branch at all: institutions, city, notifications, onboarding (they were queued behind the eight-agent cap and never started).

**Older checkpoint branches on origin, all superseded** (each newer branch above merged the older one in, so they hold nothing unique): `worktree-wf_82dbdc7d-e45-{2..8}`, `worktree-wf_b79cc761-87e-{2..8}`, `worktree-wf_8c6c962b-ee4-{2..8}` — the same seven areas (lots, floor, rulebook, priceEngine, logistics, payments, exports) at earlier stages. Keep or delete after the merge; never merge them directly.

**Local-only branches that died with the clone**: `worktree-wf_82dbdc7d-e45-1` (at the foundation `890145f`), `worktree-wf_8c6c962b-ee4-1`, `worktree-wf_b79cc761-87e-1`, `-13`, `-14`, and `worktree-wf_b677105e-b13-2`, `-4`, `-6`, `-7` (all at `1c2433a`). None had a commit of its own, so nothing was lost; they were never on origin. The founder asked for no branch to be deleted and for the clone to be deleted; the second wins for these empty pointers.

The 16 worktree directories were removed with `git worktree remove --force` after each was confirmed clean and pushed (they were also making `eslint .` and `tsc` scan sixteen copies of the repo, which is why `.claude/worktrees/` is now ignored in `.gitignore`, `eslint.config.mjs` and `tsconfig.json`), then `git worktree prune`. No branch was deleted.

## 3. How this handoff was made

Agents had already been stopped (all four workflows and both monitors) at the founder's "pause" message; no new agents were started for the handoff. Outputs were collected from the run journals and the session scratchpad, the config files were adjusted so the verbatim folder is excluded from Prettier, ESLint and `tsc` (`.prettierignore`, `eslint.config.mjs`, `tsconfig.json`), `.claude/worktrees/` was added to `.gitignore`, `.gitattributes` was added for the message-catalogue merge driver, and `pnpm format:check` and `pnpm check` were run before the commit.
