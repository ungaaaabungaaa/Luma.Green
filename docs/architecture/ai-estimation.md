# AI photo estimate

> **Status:** implemented locally, 1 Oct 2026. Provider activation and measured accuracy remain launch gates.
> [ADR 0015](../decisions/0015-bounded-photo-cache-and-selectable-inference.md).

A household can choose one scrap photo on the basket step. They review the
materials, estimated weight ranges and confidence before they apply the result.
Applying a result replaces the basket. The household can then edit or remove
items with the normal basket controls and continue to shop selection and booking.
The manual basket works if AI is unavailable, rate limited, slow, or wrong.
A public availability query returns only a boolean. The photo card stays hidden
when configuration is missing or invalid, while this query loads, or if it fails.
A local error boundary contains optional query failures. A synchronous request
guard prevents rapid duplicate clicks from starting two paid calls.

## Pipeline

1. The browser accepts a JPEG or PNG up to 12 MiB, decodes it, and re-encodes
   it as JPEG. The longest edge is at most 1600 pixels. JPEG quality is reduced
   locally if needed. The complete data URL is at most 450,000 ASCII characters.
   Local compression is not a provider call. Re-encoding removes EXIF metadata.
2. Only pressing **Estimate this photo** sends the image to the public Convex
   action. It validates the encoded size, format, signature and dimensions.
   The action is public because the basket comes before phone verification.
3. The server loads active scrap materials through the catalogue index and
   reserves quota atomically. A single Chat Completions request uses
   the operator's configured vision model and a strict JSON schema. Material
   codes are an enum of the current active scrap catalogue. Prompt version:
   `scrap-grams-v1`. The operator selects OpenRouter or a fixed authenticated HTTPS
   self-hosted endpoint. No endpoint URL or credentials come from the browser.
4. A request can return at most 12 distinct materials. Each weight is an integer
   from 100 to 200,000 grams; the upper bound cannot be below the lower bound.
   Confidence must be between 0 and 1. Unknown materials, extra fields, prices,
   malformed output and contradictory retake results are rejected.
5. The provider deadline is eight seconds, including reading the response body.
   The response body is limited to 32,000 bytes and its JSON content to 16,000
   characters. No automatic retries or provider fallbacks are enabled.
6. The preview uses fallback prices from the application price table. Model
   output never sets a price. The applied weight is the midpoint rounded to the nearest 100 grams
   of the range, converted at the existing basket's kilogram input boundary.
   The user can change it before booking. Shop rates still govern the next step.

Official contracts checked on 1 Oct 2026:
[image inputs](https://openrouter.ai/docs/guides/overview/multimodal/image-understanding),
[structured outputs](https://openrouter.ai/docs/guides/features/structured-outputs),
and [provider routing](https://openrouter.ai/docs/guides/routing/provider-selection).

## Privacy: deliberate change from the first design

The first design proposed Convex file storage and 90-day retention. This
implementation sends one bounded data URL through an action instead. Luma.Green
creates no image file, storage URL, public image endpoint, estimate record or
estimate lookup token. It does not log the image, model output or provider error
body. Browser image state is cleared after a response or manual reset; file
bytes are not written to local or session storage. Up to three successful replies
remain in form memory for five minutes, keyed by a SHA-256 hash of the image,
catalogue and prompt. Concurrent identical requests share one call. Failures are
not cached. Unmounting or changing account clears this cache. Prices stay live
and are not part of the cached reply. The rotatable device ID is
stored in local storage, separately from images.

OpenRouter requests require `data_collection: "deny"` and `zdr: true` provider routing.
The self-hosted gateway must disable request-body logging and photo retention.
The operator must verify the account's logging settings and model endpoint's
retention policy before activation. The UI states that an AI provider receives
the image, and asks users to exclude faces, documents and number plates.

Only the user-reviewed basket is saved by the normal booking flow. There is no
estimate-ID claim or cross-user estimate lookup to secure. This smaller design
avoids retaining sensitive media and unneeded ownership records. It also means
that original model ranges, model identity and prompt version are not saved
against a booking. Basket-versus-receipt statistics measure submitted estimates;
they **cannot** be called model accuracy statistics. A future accuracy study
needs a separate consent, retention and secure attribution design.

## Cost and abuse controls

The internal `photoEstimateQuota` table contains one indexed row, with at most
1000 reservations. Each reservation has a timestamp and keyed hashes of the
device ID and, when authenticated, the verified phone. Old hashes are removed
on subsequent reservations and by hourly scheduled cleanup after expiry. Quota
checks use the exact rolling 24-hour window; inactive hashes are removed within
25 hours under normal scheduler operation. One pending cleanup chain replaces a
new scheduled job per request. They are
operational rate counters, not material-ledger events.

- Five attempts per device in a rolling 24-hour window.
- Five attempts per verified phone in the same window, when signed in.
- A global rolling 24-hour request cap: `PHOTO_ESTIMATE_DAILY_LIMIT`, default
  100, minimum 1, maximum 1000. Invalid configuration disables AI.
- All checks and the reservation happen in one mutation, before network work.
  Provider errors and timeouts consume quota; a failure cannot trigger paid retries.
- Device IDs can be rotated. They are an abuse signal, not a trusted identity.
  The global cap limits paid calls even when IDs rotate. An attacker can exhaust
  that quota and make AI unavailable; the manual flow remains available.
- Request counts do not give a currency spend guarantee. For OpenRouter, set a
  hard spend limit on the API key before activation. Self-hosted mode never falls
  back to a paid provider.

## Activation checklist

For the self-hosted route, follow the exact environment and gateway checklist in
[low-cost operation](../operations/low-cost-operation.md). No OpenRouter account
is needed for that route. The checks below cover the OpenRouter route.

- [ ] Deploy the additive `photoEstimateQuota` schema and functions.
- [ ] Set a hard monthly spending limit on a dedicated OpenRouter key.
- [ ] Select a model with image input, strict structured-output support and a
      compatible zero-retention endpoint. There is no built-in default model.
- [ ] Set `OPENROUTER_API_KEY` and `OPENROUTER_MODEL` on the Convex deployment.
      Set `PHOTO_ESTIMATE_DAILY_LIMIT` to the approved request budget.
- [ ] Check provider logging/retention settings and disclose external processing.
- [ ] Test a real phone photo, retake, missing provider access, timeout and manual
      fallback in English and Arabic. Use a test key within an approved spend budget.
- [ ] Evaluate the chosen model and prompt against consented, weighed scrap
      photos before making accuracy claims. Compare material precision/recall,
      weight error, latency and cost. Repeat when the model or prompt changes.

Local automated checks cover validation, active catalogue gating, missing config,
rate caps, quota retention on failure, cleanup, bounded output, timeout, review
before application, and manual fallback. They use provider mocks; no live model
call or deployed end-to-end proof is implied.
