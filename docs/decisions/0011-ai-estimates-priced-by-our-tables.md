# 0011. AI estimates materials; our tables set prices

- **Status:** Superseded by [0015](0015-bounded-photo-cache-and-selectable-inference.md)
- **Date:** 29 Sep 2026
- **Deciders:** founder, Claude

## Context

Households photograph their scrap and want to know what it's worth. The founder
wants the cheapest option — self-hosted or OpenRouter. The AI SDK and the
OpenRouter provider are already dependencies.

## Decision

- A Convex action sends photos to a vision model through **OpenRouter**, via
  the AI SDK. The model returns only materials from our catalogue and a
  kilogram range for each, in a fixed schema.
- **Prices always come from our tables**, never from the model.
- The model is chosen and re-checked against a labelled set of Bengaluru photos.
- Hard spend limit on the OpenRouter key; per-device rate limits; a manual
  fallback when the call fails.
- Details: [architecture/ai-estimation.md](../architecture/ai-estimation.md).

## Consequences

- Estimates are explainable and auditable; the model can be swapped by
  configuration.
- Accuracy is measured on every pickup (estimate against weighed).

## Alternatives considered

- **Self-hosted model** — a GPU costs more than API calls at pilot volume.
- **Let the model quote prices** — unauditable and drifts from real rates.
