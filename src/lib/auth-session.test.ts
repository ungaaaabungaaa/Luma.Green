import { afterEach, expect, it, vi } from "vitest";

import { AuthServiceUnavailable, hasAuthSession } from "./auth-session";

const site = "http://127.0.0.1:3211";
afterEach(() => vi.unstubAllGlobals());

it("checks each request with its own credentials and no cache", async () => {
  const fetcher = vi
    .fn<typeof fetch>()
    .mockImplementation(() =>
      Promise.resolve(Response.json({ token: "fixture-jwt" })),
    );
  vi.stubGlobal("fetch", fetcher);
  const headers = new Headers({
    cookie: "session=fixture-cookie",
    authorization: "Bearer fixture-token",
    "x-forwarded-for": "192.0.2.241",
    "content-length": "999",
    "transfer-encoding": "chunked",
    "x-unrelated-private-data": "must-not-forward",
  });
  await expect(hasAuthSession(site, headers)).resolves.toBe(true);
  await expect(hasAuthSession(site, new Headers())).resolves.toBe(true);
  expect(fetcher).toHaveBeenCalledTimes(2);
  const [url, options] = fetcher.mock.calls[0] ?? [];
  expect(url).toEqual(new URL("/api/auth/convex/token", site));
  expect(options).toMatchObject({ cache: "no-store", redirect: "error" });
  const forwarded = new Headers(options?.headers);
  expect(forwarded.get("cookie")).toBe("session=fixture-cookie");
  expect(forwarded.get("authorization")).toBe("Bearer fixture-token");
  expect(forwarded.get("x-forwarded-for")).toBe("192.0.2.241");
  expect(forwarded.get("host")).toBe("127.0.0.1:3211");
  expect(forwarded.has("content-length")).toBe(false);
  expect(forwarded.has("transfer-encoding")).toBe(false);
  expect(forwarded.has("x-unrelated-private-data")).toBe(false);
  expect(headers.get("content-length")).toBe("999");
  expect(new Headers(fetcher.mock.calls[1]?.[1]?.headers).has("cookie")).toBe(
    false,
  );
});

it.each([401, 403])(
  "treats explicit authentication rejection %s as signed out",
  async (status) => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(null, { status })),
    );
    await expect(hasAuthSession(site, new Headers())).resolves.toBe(false);
  },
);

it.each([400, 404, 429, 500, 502, 503])(
  "keeps status %s unavailable instead of claiming sign-out",
  async (status) => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(
        Response.json({ secret: "must-not-escape" }, { status }),
      );
    vi.stubGlobal("fetch", fetcher);
    await expect(hasAuthSession(site, new Headers())).rejects.toMatchObject({
      name: "AuthServiceUnavailable",
      message: "AUTH_SERVICE_UNAVAILABLE",
    });
    expect(fetcher).toHaveBeenCalledOnce();
  },
);

it.each([{}, { token: "" }, { token: null }, { token: 12 }])(
  "rejects a successful response without a usable token: %j",
  async (body) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json(body)));
    await expect(hasAuthSession(site, new Headers())).rejects.toThrow(
      AuthServiceUnavailable,
    );
  },
);

it("does not expose malformed response bodies or network details", async () => {
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(new Response("private-response", { status: 200 }))
    .mockRejectedValueOnce(new Error("private-network-details"));
  vi.stubGlobal("fetch", fetcher);
  for (let index = 0; index < 2; index++) {
    await expect(hasAuthSession(site, new Headers())).rejects.toThrow(
      "AUTH_SERVICE_UNAVAILABLE",
    );
  }
});
