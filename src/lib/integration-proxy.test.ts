// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";

import { proxyIntegrationRequest } from "./integration-proxy";

const token = `lg_live_${"a".repeat(64)}`;
const request = (path: string, init?: RequestInit) =>
  new Request(`https://luma.example/api/v1/${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    ...init,
  });

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("industry API gateway", () => {
  it("serves the public contract without configuration or authentication", async () => {
    const response = await proxyIntegrationRequest(
      request("openapi.json", { headers: {} }),
      undefined,
    );
    expect(response.status).toBe(200);
    const body: unknown = await response.json();
    expect(body).toMatchObject({
      openapi: "3.1.2",
      servers: [{ url: "/api/v1" }],
      paths: { "/news": { get: { "x-required-scope": "news:read" } } },
    });
  });
  it("fails closed without configured backend and never sends the key elsewhere", async () => {
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    expect(
      await proxyIntegrationRequest(request("inventory"), undefined),
    ).toMatchObject({ status: 503 });
    expect(
      await proxyIntegrationRequest(
        request("inventory", { headers: { Cookie: "session=valid" } }),
        "https://data.convex.site",
      ),
    ).toMatchObject({ status: 401 });
    expect(fetcher).not.toHaveBeenCalled();
  });
  it.each([
    "inventory?orgId=another",
    "inventory?limit=1&limit=2",
    "materials?limit=101",
    "materials?limit=0",
    "trades?side=both",
    "organization?cursor=x",
    "news?limit=21",
    "news?cursor=x",
    "inventory?cursor=",
    "inventory?limit=1.5",
    "inventory?limit=1e2",
    "inventory?api_key=bad",
    "openapi.json?secret=x",
  ])(
    "rejects invalid or ambiguous request %s before forwarding",
    async (path) => {
      const fetcher = vi.fn();
      vi.stubGlobal("fetch", fetcher);
      expect(
        await proxyIntegrationRequest(
          request(path),
          "https://data.convex.site",
        ),
      ).toMatchObject({ status: 400 });
      expect(fetcher).not.toHaveBeenCalled();
    },
  );
  it("rejects extra path segments and methods before forwarding", async () => {
    expect(
      await proxyIntegrationRequest(request("inventory/foreign"), undefined),
    ).toMatchObject({ status: 404 });
    for (const method of ["POST", "DELETE", "HEAD", "OPTIONS"]) {
      const response = await proxyIntegrationRequest(
        request("inventory", { method }),
        undefined,
      );
      expect(response.status).toBe(405);
      expect(response.headers.get("Allow")).toBe("GET");
    }
  });
  it("forwards only the machine credential and approved path, without cookies or redirects", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response('{"data":[]}', {
        headers: {
          "Content-Type": "application/json",
          "Set-Cookie": "bad=1",
          "Access-Control-Allow-Origin": "*",
          "Cache-Control": "public",
          "X-RateLimit-Remaining": "59",
        },
      }),
    );
    vi.stubGlobal("fetch", fetcher);
    const response = await proxyIntegrationRequest(
      request("inventory?limit=3", {
        headers: {
          Authorization: `Bearer ${token}`,
          Cookie: "private=secret",
          "X-Forwarded-Host": "evil.example",
        },
      }),
      "https://data.convex.site",
    );
    expect(String(fetcher.mock.calls[0]?.[0])).toBe(
      "https://data.convex.site/api/v1/inventory?limit=3",
    );
    expect(fetcher.mock.calls[0]?.[1]).toMatchObject({
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      cache: "no-store",
      credentials: "omit",
      redirect: "error",
    });
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(response.headers.get("Set-Cookie")).toBeNull();
    expect(response.headers.get("Access-Control-Allow-Origin")).toBeNull();
    expect(response.headers.get("X-RateLimit-Remaining")).toBe("59");
    expect(await response.json()).toEqual({ data: [] });
  });
  it("sanitizes provider failures and preserves rate-limit guidance", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(new Response("internal secret", { status: 500 })),
    );
    const unavailable = await proxyIntegrationRequest(
      request("inventory"),
      "https://data.convex.site",
    );
    expect(unavailable.status).toBe(503);
    expect(await unavailable.text()).not.toContain("internal secret");
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          Response.json(
            { error: { code: "RATE_LIMITED" } },
            { status: 429, headers: { "Retry-After": "30" } },
          ),
        ),
    );
    const limited = await proxyIntegrationRequest(
      request("inventory"),
      "https://data.convex.site",
    );
    expect(limited.status).toBe(429);
    expect(limited.headers.get("Retry-After")).toBe("30");
  });
  it("normalizes JSON server errors and strips extra fields from known errors", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          Response.json(
            { message: "internal provider payload", token },
            { status: 500 },
          ),
        ),
    );
    const failure = await proxyIntegrationRequest(
      request("inventory"),
      "https://data.convex.site",
    );
    expect(failure.status).toBe(500);
    expect(await failure.json()).toEqual({ error: { code: "INTERNAL_ERROR" } });
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          Response.json(
            { error: { code: "ACCESS_DENIED", secret: token }, debug: token },
            { status: 403 },
          ),
        ),
    );
    const denied = await proxyIntegrationRequest(
      request("inventory"),
      "https://data.convex.site",
    );
    expect(denied.status).toBe(403);
    expect(await denied.json()).toEqual({ error: { code: "ACCESS_DENIED" } });
  });
  it("does not put credentials or thrown upstream payloads into logs", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error(token)));
    const log = vi.spyOn(console, "error").mockImplementation(() => {
      /* Keep the expected failure out of test output. */
    });
    const response = await proxyIntegrationRequest(
      request("inventory"),
      "https://data.convex.site",
    );
    expect(response.status).toBe(503);
    expect(JSON.stringify(log.mock.calls)).not.toContain(token);
    expect(await response.text()).not.toContain(token);
  });
});
