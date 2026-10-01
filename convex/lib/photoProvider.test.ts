import { afterEach, expect, it, vi } from "vitest";

import { requestPhotoEstimate } from "./photoProvider";

const config = { apiKey: "test-key", model: "operator/chosen-model" };
const catalogue = [{ code: "PAPER-NEWS", name: "Newspaper" }];
const result = {
  items: [
    {
      materialCode: "PAPER-NEWS",
      gramsLow: 500,
      gramsHigh: 1000,
      confidence: 0.8,
    },
  ],
  retake: "none",
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

it("sends one structured vision request using the configured model without retries", async () => {
  const fetcher = vi.fn().mockResolvedValue(
    Response.json({
      choices: [{ message: { content: JSON.stringify(result) } }],
    }),
  );
  vi.stubGlobal("fetch", fetcher);
  expect(await requestPhotoEstimate(config, "test-image", catalogue)).toEqual(
    result,
  );
  expect(fetcher).toHaveBeenCalledTimes(1);
  const options = fetcher.mock.calls[0][1] as RequestInit;
  if (typeof options.body !== "string") throw new Error("Expected JSON body");
  const body: unknown = JSON.parse(options.body);
  expect(body).toMatchObject({
    model: config.model,
    provider: {
      allow_fallbacks: false,
      require_parameters: true,
      data_collection: "deny",
      zdr: true,
    },
    response_format: { type: "json_schema", json_schema: { strict: true } },
  });
});

it.each([
  "not-json",
  JSON.stringify({
    items: [{ ...result.items[0], materialCode: "UNKNOWN" }],
    retake: "none",
  }),
  JSON.stringify({ ...result, price: 99 }),
])("fails closed on malformed model output", async (content) => {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValue(
        Response.json({ choices: [{ message: { content } }] }),
      ),
  );
  await expect(
    requestPhotoEstimate(config, "image", catalogue),
  ).rejects.toThrow();
});

it("rejects oversized bodies and provider errors without retry", async () => {
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(new Response("x".repeat(32_001)))
    .mockResolvedValueOnce(
      new Response("private provider error", { status: 429 }),
    );
  vi.stubGlobal("fetch", fetcher);
  await expect(
    requestPhotoEstimate(config, "image", catalogue),
  ).rejects.toThrow("PHOTO_RESPONSE_TOO_LARGE");
  await expect(
    requestPhotoEstimate(config, "image", catalogue),
  ).rejects.toThrow("PHOTO_PROVIDER_FAILED");
  expect(fetcher).toHaveBeenCalledTimes(2);
});

it("aborts at eight seconds and does not retry", async () => {
  vi.useFakeTimers();
  const fetcher = vi.fn(
    (_url: string, options: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        options.signal?.addEventListener("abort", () => {
          reject(new Error("aborted"));
        });
      }),
  );
  vi.stubGlobal("fetch", fetcher);
  const pending = requestPhotoEstimate(config, "image", catalogue);
  const assertion = expect(pending).rejects.toThrow("aborted");
  await vi.advanceTimersByTimeAsync(8000);
  await assertion;
  expect(fetcher).toHaveBeenCalledTimes(1);
});
