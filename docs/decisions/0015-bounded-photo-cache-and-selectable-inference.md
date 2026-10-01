# 0015. Bounded photo cache and selectable inference

- **Status:** Decided
- **Date:** 1 Oct 2026
- **Deciders:** founder's cost requirements, implemented by Codex
- **Supersedes:** [0011](0011-ai-estimates-priced-by-our-tables.md)

## Context

Margins are small. The founder requires a self-hosted model option and less repeated
database and provider work. The first record assumed OpenRouter, an AI SDK and
per-pickup model accuracy measurement. The implemented flow uses bounded HTTP
requests and does not retain the original model output against a booking.

## Decision

Keep prices in application tables. Models return catalogue material codes and
integer gram ranges only. Use one configured OpenRouter or authenticated HTTPS
OpenAI-compatible endpoint, with no automatic provider fallback. Preserve the
eight-second deadline, output validation, global cap and manual entry.

Cache up to three successful results in form memory for five minutes. Hash the
prepared image, prompt version and catalogue for the key. Clear on account change
and unmount. Never persist images or model replies. Keep quota checks exact over
24 hours and coalesce cleanup into hourly buckets. Details and activation gates
are in [AI estimation](../architecture/ai-estimation.md) and
[low-cost operation](../operations/low-cost-operation.md).

## Consequences

Repeated photos avoid calls. Self-hosting avoids per-call provider fees but adds
hardware, electricity and maintenance costs; it is not assumed to be cheapest.
The five-minute cache can outlive a server model configuration change. Refreshing
the form clears it. Model accuracy needs a separate consented evaluation; booking
estimates alone do not identify the original model or its accuracy.

## Alternatives considered

- Persistent shared image/result cache: adds sensitive retention, ownership and cleanup work.
- Paid fallback for a slow local model: makes operating cost harder to bound.
- Router as the default inference host: no tested hardware or latency evidence.
