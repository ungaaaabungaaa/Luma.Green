# Low-cost operation

Code and source review: 1 Oct 2026. See the [local measurements](../delivery/cost-optimization.md).

## What the app now avoids

| Work                               | Cost control                                                                           | Lifetime and invalidation                                                                                           |
| ---------------------------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Onboarding JPEG/PNG uploads        | Resize in the browser before upload; use the smaller encoded or metadata-stripped file | Preparation is local. No server image transform is required. Private files retain normal access checks.             |
| Sell and listing price suggestions | Read compact quotes, without 30-day chart history or translated names                  | Convex reactive query cache; database changes invalidate results                                                    |
| Repeated draft saves               | Compare validated sections and skip unchanged writes                                   | Authorize every request before comparison                                                                           |
| Repeated photo estimates           | Coalesce matching requests; retain up to three successful replies in form memory       | Five minutes; clear on unmount or account change; key includes image hash, prompt and catalogue; never cache prices |
| AI quota cleanup                   | One pending cleanup chain, with hourly expiry buckets                                  | Quotas use exact rolling 24-hour checks; inactive hashes expire within 25 hours                                     |
| Public home illustration           | Content-hashed static WebP import, served directly without paid image transforms       | Image edits change the URL; immutable browser/CDN caching                                                           |

Repeated preparation of the same File and preset uses a weak-key memory cache;
failed preparation is removed so a retry can run. No file or upload URL is cached
on disk by this helper.

PDF, video and existing WebP uploads keep their bytes and embedded metadata. JPEG/PNG preparation
removes private metadata; a lossless JPEG fallback retains only the orientation
field needed to display it correctly. The PNG fallback also retains orientation.
Preparation does not upscale or increase upload size.
Identity images use a 2400-pixel edge and higher JPEG quality; photos use 1600 pixels.
If the lossless source is smaller, its original dimensions can remain. The source
pixel cap is 40 million. Real identity scans still need a human legibility check.

Convex already [caches query results and updates them when data changes](https://docs.convex.dev/functions/query-functions).
Redis would add another service and invalidation path here. Keep authorization,
stock, balances and transaction writes authoritative. Do not put private documents,
OTP responses or signed upload URLs in a shared CDN cache.

Sharp is a library, not a database cache. Its [operation cache](https://sharp.pixelplumbing.com/api-utility/#cache)
holds libvips work in one process. This pass instead caches the public image output
through [Next's static image handling](https://nextjs.org/docs/app/api-reference/components/image#minimumcachettl).
Next uses Sharp internally. Keep `.next/cache/images` on persistent storage when
self-hosting if cache reuse across restarts is required. A hosting provider can use
its own image cache and billing; the local disk limit does not configure that service.

## Choose the AI cost level

1. **Manual entry:** leave AI keys blank. The complete manual basket works with
   no inference calls or model server.
2. **Existing local server:** run an evaluated vision model through an authenticated
   HTTPS gateway. No inference-service account is required. Electricity, hardware,
   storage, network and maintenance still cost money.
3. **OpenRouter:** retain the existing adapter when it is cheaper at the measured
   request volume. Set a hard account/key spending limit. The app never switches
   from self-hosted mode to this paid path automatically.

Do not buy a GPU or use a router for inference based on parameter count alone.
Benchmark the exact model, quantization and hardware with the application's image
size and JSON schema. The current end-to-end provider deadline is eight seconds,
including a cold start and network time. Keep manual entry available if it fails.
A server that is already on may have a lower incremental cost than dedicated hardware.
This is a deployment choice to measure, not a confirmed router capability.

Compare monthly incremental electricity, machine cost spread over its expected
life, hosting/network, backup and maintenance with paid request cost at the expected
volume. Record successful estimates, errors, latency and bytes per completed booking.
Do not use model requests alone as proof of a currency budget.

## Self-hosted AI setup checklist

- [ ] Select and evaluate a vision model with structured JSON output. For example,
      [Qwen3-VL-2B-Instruct](https://huggingface.co/Qwen/Qwen3-VL-2B-Instruct) is an
      Apache-2.0 candidate, not an app-tested or accuracy-approved default. Pin the
      chosen model revision and verify the license of the actual weights and runtime.
- [ ] Install a compatible runtime such as Ollama on the chosen server. Ollama's
      [OpenAI-compatible API](https://docs.ollama.com/api/openai-compatibility)
      accepts image messages and structured output. No model is downloaded by this repo.
- [ ] Put `/v1/chat/completions` behind TLS and bearer-key authentication. Limit
      request size and concurrency. Disable body logging and retain no photos.
      Ollama's local compatibility API ignores the API key; exposing it directly
      does not meet this requirement. Keep its direct port private.
- [ ] Give the gateway a public DNS name reachable from the Convex deployment.
      Convex cloud cannot reach your computer's `localhost` or a private router address.
      Arrange DNS/TLS and network access through your chosen host or gateway provider.
- [ ] Set the following **on Convex**, not only in the web host or `.env.local`:

```dotenv
PHOTO_ESTIMATE_PROVIDER=self-hosted
PHOTO_ESTIMATE_ENDPOINT=https://ai.example.com/v1/chat/completions
PHOTO_ESTIMATE_API_KEY=<gateway-bearer-secret>
PHOTO_ESTIMATE_MODEL=<exact-installed-vision-model>
PHOTO_ESTIMATE_DAILY_LIMIT=100
```

- [ ] Deploy the functions and additive `photoEstimateQuota.cleanupScheduledAt`
      schema field. Existing rows do not need a manual migration.
- [ ] Test a real scrap photo, an unreadable photo, invalid credentials, timeout,
      quota exhaustion and manual fallback. Measure cold and warm response times.
- [ ] Check model accuracy against consented, weighed scrap examples before launch.
      A successful JSON response does not prove useful weight estimates.

No new signup is needed for compression or caches. A self-hosted runtime needs no
OpenRouter account. Core hosting/database, SMS and native signing accounts remain
in the [launch checklist](launch-checklist.md) and [app release checklist](app-releases.md).

## Licenses and hosting boundaries

- [Sharp](https://github.com/lovell/sharp/blob/main/LICENSE) is Apache-2.0;
  [libvips](https://github.com/libvips/libvips/blob/master/LICENSE), which it uses,
  is LGPL-2.1. Preserve the applicable license notices when distributing binaries.
- [Ollama](https://github.com/ollama/ollama/blob/main/LICENSE) is MIT. Model weights
  have their own license; the runtime's license does not cover every model it can run.
- The current [Convex backend](https://docs.convex.dev/self-hosting) uses
  FSL-Apache-2.0, with conversion to Apache-2.0 after two years. It is not uniformly
  Apache-2.0 today. Self-hosting also transfers database backup, recovery and uptime
  work to the operator. This pass retains Convex and does not migrate the database.
- The requested [GSAP](https://gsap.com/community/standard-license/) uses its
  Standard License, not MIT or Apache. Free use and an open-source license are
  different properties. It was retained for the requested animation work.

This is a focused check of the affected stack, not a complete transitive license
audit. Software licenses do not remove SMS, storage, bandwidth or signing costs.

## Launch measurement

Use a staging data set with the expected catalogue and file types. Measure database
reads/writes, query response bytes, file bytes, image transforms and provider calls
before and after the pass. Use the actual host's usage dashboard for a representative
traffic period. Keep a per-completed-booking budget, with storage retention and SMS
included. Revisit caching only when those measurements identify another large cost.
