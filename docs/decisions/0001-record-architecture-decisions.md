# 0001. Record architecture decisions

- **Status:** Decided
- **Date:** 29 Sep 2026
- **Deciders:** founder, Claude

## Context

The platform has to run for years with a small team, and the founder expects
the core to change slowly once it's right. Decisions made in chat are lost; a
new developer or agent needs to know _why_ things are the way they are.

## Decision

Keep an Architecture Decision Record for every decision that would be expensive
to reverse, in `docs/decisions/`, numbered, one screen each, using
[0000-template.md](./0000-template.md). Decided records are never rewritten; a
new record supersedes an old one.

## Consequences

- AGENTS.md and the skills stay the rules; ADRs hold the reasons.
- A pull request that changes an architectural rule adds or supersedes an ADR.

## Alternatives considered

- **Decisions only in chat or PR descriptions** — unsearchable and scattered.
- **A single long design document** — goes stale and hides what changed when.
