# AI photo estimate

> **Status:** decided approach, 29 Sep 2026 —
> [ADR 0011](../decisions/0011-ai-estimates-priced-by-our-tables.md). Built with
> the household flow, after onboarding.

A household photographs their scrap; we say what's in it and roughly how much it
weighs; our price tables turn that into rupees.

## Pipeline

```
Phone ──upload──► Convex file storage ──► estimate action (Convex)
                                              │
                                  vision model via OpenRouter
                                  (structured output, our catalogue only)
                                              │
                          validate ─► store estimate ─► price with our tables ─► screen
```

1. The browser asks Convex for a short-lived upload URL and sends the photo
   (resized in the browser to ~1600 px, JPEG).
2. A Convex **action** calls a vision model through OpenRouter using the AI SDK
   (`ai` and `@openrouter/ai-sdk-provider`, both already installed). Provider
   and model are configuration, not code — switching costs nothing.
3. The model must answer in a fixed schema, choosing only from our material
   catalogue:

   ```ts
   {
     items: { material: MaterialCode; kgLow: number; kgHigh: number; confidence: number }[];
     notRecyclable: string[];   // e.g. food waste, thermocol
     retake?: "too_dark" | "too_far" | "not_scrap";
   }
   ```

4. The result is validated (Zod), clamped to sane ranges, and saved on the
   booking with the model name and prompt version.
5. **Rupees are never from the model.** Price = kilogram range × the fallback
   table, then × the chosen kabadiwala's rates ([pricing](../product/pricing.md)).

## Choosing the model

By measurement, not by name:

- Build a **golden set** of 100 labelled scrap photos from Bengaluru homes —
  materials present and weighed kilograms.
- Score each candidate on material recall and precision, weight error, cost per
  photo and latency on a 4G connection.
- Pick the cheapest model that clears the bar; re-run the set on every prompt
  or model change.
- A **self-hosted** model is reconsidered only if monthly API spend makes a GPU
  cheaper; not for the pilot.

## Cost and abuse controls

- OpenRouter key with a **hard monthly spend limit**, set in the OpenRouter
  dashboard before the key reaches production.
- Per-device and per-phone rate limits (Convex rate-limiter component), and at
  most 4 photos per estimate.
- If the model call fails or times out (8 s), the household picks materials by
  hand — the flow never dead-ends on AI.

## Measuring accuracy in the pilot

Every completed pickup has the estimate and the weighed kilograms side by side.
The admin's pilot numbers show the average weight error per material, which
tells us where the prompt or the model needs work.

## Privacy

- Photos are private files; nobody but the system and the admin can open them.
- Deleted after 90 days unless the household agreed to help train the model
  (open question in [household.md](../product/household.md)).
- No faces, documents or number plates are needed; the upload screen says so.
