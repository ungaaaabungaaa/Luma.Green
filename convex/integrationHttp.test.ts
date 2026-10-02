/// <reference types="vite/client" />
// @vitest-environment edge-runtime
import { convexTest } from "convex-test";
import { afterEach, describe, expect, it, vi } from "vitest";

import { api, internal } from "./_generated/api";
import {
  convexModules,
  registerAuth,
  seedDemo,
  signInAs,
} from "./lib/auth.testing";
import { integrationScopes } from "./lib/integrations";
import schema from "./schema";

const modules = convexModules(import.meta.glob("./**/*.*s"));
async function world() {
  vi.stubEnv("AUTH_DEV_MODE", "true");
  const t = convexTest(schema, modules);
  registerAuth(t);
  await seedDemo(t);
  const owner = await signInAs(t, "+919000000104");
  const key = await owner.action(api.integrations.createKey, {
    label: "ERP",
    scopes: [...integrationScopes],
    expiresInDays: 30,
  });
  return { t, owner, key, headers: { Authorization: `Bearer ${key.token}` } };
}
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("REST over the real Convex HTTP router", () => {
  it("exports factory stock through its key and immediately refuses a revoked key", async () => {
    const { t, owner, key, headers } = await world();
    const response = await t.fetch("/api/v1/inventory?limit=1", { headers });
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(response.headers.get("X-RateLimit-Remaining")).toBe("59");
    expect(response.headers.get("X-Request-Id")).toBeTruthy();
    const body: unknown = await response.json();
    expect(body).toMatchObject({
      data: [expect.objectContaining({ grams: expect.any(Number) })],
      pagination: { isDone: false, nextCursor: expect.any(String) },
    });
    const text = JSON.stringify(body);
    expect(text).not.toMatch(/phone|address|gstin|keyHash|issuerProfileId/);
    await owner.mutation(api.integrations.revokeKey, { keyId: key.keyId });
    const revoked = await t.fetch("/api/v1/inventory", { headers });
    expect(revoked.status).toBe(401);
    expect(revoked.headers.get("WWW-Authenticate")).toContain("Bearer");
  });
  it("does not accept browser login or query credentials as machine access", async () => {
    const { t, owner, key } = await world();
    expect(await owner.fetch("/api/v1/organization")).toMatchObject({
      status: 401,
    });
    expect(
      await t.fetch(`/api/v1/organization?api_key=${key.token}`),
    ).toMatchObject({ status: 400 });
    expect(
      await t.fetch("/api/v1/organization", { method: "POST" }),
    ).toMatchObject({ status: 405 });
    expect(await t.fetch("/api/v1/unknown")).toMatchObject({ status: 404 });
    const publicContract = await t.fetch("/api/v1/openapi.json");
    expect(publicContract.status).toBe(200);
  });
  it("enforces the scope at the HTTP boundary", async () => {
    const { t, owner } = await world();
    const key = await owner.action(api.integrations.createKey, {
      label: "Catalogue",
      scopes: ["materials:read"],
      expiresInDays: 1,
    });
    const headers = { Authorization: `Bearer ${key.token}` };
    expect(
      await t.fetch("/api/v1/materials?limit=2", { headers }),
    ).toMatchObject({ status: 200 });
    const denied = await t.fetch("/api/v1/trades", { headers });
    expect(denied.status).toBe(403);
    expect(await denied.json()).toEqual({
      error: { code: "INSUFFICIENT_SCOPE" },
    });
  });
  it("does not fetch news while unconfigured or for an unauthenticated caller", async () => {
    const { t, headers } = await world();
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    const response = await t.fetch("/api/v1/news", { headers });
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      error: { code: "NEWS_UNAVAILABLE" },
    });
    expect(await t.fetch("/api/v1/news")).toMatchObject({ status: 401 });
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("returns attributed material news without sending the business or API key to the provider", async () => {
    const { t, headers, key } = await world();
    vi.stubEnv("INDUSTRY_NEWS_ENABLED", "true");
    vi.stubEnv("INDUSTRY_NEWS_API_KEY", "provider-key");
    vi.stubEnv("INDUSTRY_NEWS_DAILY_LIMIT", "1");
    const fetcher = vi.fn().mockResolvedValue(
      Response.json({
        status: "ok",
        articles: [
          {
            title: "Paper mill expands recycling",
            url: "https://publisher.example/paper",
            source: { name: "Publisher" },
            publishedAt: "2026-10-01T10:00:00Z",
            content: "Do not export full content",
            author: "Private author",
            urlToImage: "https://publisher.example/image",
          },
        ],
      }),
    );
    vi.stubGlobal("fetch", fetcher);
    const response = await t.fetch("/api/v1/news?limit=2", { headers });
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      data: [
        {
          title: "Paper mill expands recycling",
          url: "https://publisher.example/paper",
          source: "Publisher",
          publishedAt: "2026-10-01T10:00:00Z",
        },
      ],
      meta: { provider: "newsapi", language: "en" },
    });
    const callUrl = String(fetcher.mock.calls[0]?.[0]);
    expect(callUrl).toContain("newsapi.org/v2/everything");
    expect(callUrl).not.toContain(key.token);
    expect(callUrl).not.toContain("provider-key");
    expect(fetcher.mock.calls[0]?.[1]).toMatchObject({
      headers: { "X-Api-Key": "provider-key", Accept: "application/json" },
      redirect: "error",
    });
    expect(await t.fetch("/api/v1/news", { headers })).toMatchObject({
      status: 503,
    });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it("counts failed news attempts against the shared daily quota", async () => {
    const { t, headers } = await world();
    vi.stubEnv("INDUSTRY_NEWS_ENABLED", "true");
    vi.stubEnv("INDUSTRY_NEWS_API_KEY", "provider-key");
    vi.stubEnv("INDUSTRY_NEWS_DAILY_LIMIT", "1");
    const fetcher = vi
      .fn()
      .mockResolvedValue(new Response("provider secret", { status: 500 }));
    vi.stubGlobal("fetch", fetcher);
    for (let index = 0; index < 2; index++) {
      const response = await t.fetch("/api/v1/news", { headers });
      expect(response.status).toBe(503);
      expect(await response.text()).not.toContain("provider secret");
    }
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(
      await t.mutation(internal.industryNews.reserveQuota, { dailyLimit: 0 }),
    ).toBe(false);
  });
});
