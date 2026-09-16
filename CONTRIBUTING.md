# Contributing

Read [AGENTS.md](./AGENTS.md) first. It holds the rules; this file holds the
mechanics.

## Setup

```bash
git clone https://github.com/ungaaaabungaaa/Luma.Green.git
cd Luma.Green
nvm use            # Node 24, per .nvmrc
pnpm install        # also installs the git hooks
cp .env.example .env.local
pnpm dev
```

## Workflow

1. Branch: `feat/…`, `fix/…`, `chore/…`, `docs/…`, `refactor/…`.
2. Write the change **and its tests** together.
3. `pnpm check` and `pnpm build` before pushing.
4. Open a PR, fill in the template, attach screenshots for visible changes.
5. Get CodeRabbit's pass and a human approval; keep every check green.
6. Squash-merge with a Conventional Commit title.

## Commit messages

```
type(scope): imperative summary

Why this change, not what the diff already shows.
```

Types: `feat fix chore docs refactor test perf ci build revert`.
Scopes: `app ui i18n convex auth inventory trade carbon seo ci deps docs test mobile infra`.

commitlint rejects anything else at commit time.

## The short version of the rules

- Every user-facing string lives in `messages/en.json` and all 11 other files.
- Links come from `@/i18n/navigation`, never `next/link`.
- Colours come from design tokens, never a hex literal.
- Money is integer paise; mass is integer grams. Never floats.
- Every change ships with a test.
- `.env` values never enter the repo.

## Getting help

Open a discussion or an issue before starting anything large — a schema change,
a new dependency, or a new top-level route. Cheaper to align first than to
rewrite a 600-line PR.
