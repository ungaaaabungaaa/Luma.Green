/// <reference types="vite/client" />
// @vitest-environment edge-runtime
import { convexTest } from "convex-test";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

import { api, internal } from "./_generated/api";
import { convexModules } from "./lib/auth.testing";
import { HOUR_MS } from "./lib/publicData";
import schema from "./schema";

const modules = convexModules(import.meta.glob("./**/*.*s"));
const now = Date.parse("2026-10-02T10:00:00Z");
const location = {
  city: "bengaluru" as const,
  provider: "met_norway" as const,
};
const data = {
  kind: "weather" as const,
  forecastAt: now,
  tempC: 26,
  humidityPercent: 70,
  windMetersPerSecond: 3,
  precipitationMm: 0,
};

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(now);
  vi.stubEnv("PUBLIC_DATA_ENABLED", "true");
  vi.stubEnv(
    "MET_NORWAY_USER_AGENT",
    "Luma.Green/1.0 https://luma.green/contact",
  );
  vi.stubEnv("DATA_GOV_IN_API_KEY", "");
  vi.stubEnv("DATA_GOV_IN_AIR_RESOURCE_ID", "");
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

it("is cache-only for public visitors and starts with honest unavailable status", async () => {
  const t = convexTest(schema, modules);
  const result = await t.query(api.publicData.forCity, { city: "bengaluru" });
  expect(result.weather).toEqual({
    status: "unavailable",
    fetchedAt: null,
    sourceUpdatedAt: null,
    data: null,
  });
  expect(result.air.status).toBe("disabled");
});

it("reserves each source once per hour and hides internal leases from visitors", async () => {
  const t = convexTest(schema, modules);
  expect(await t.mutation(internal.publicData.claim, location)).toEqual({
    attemptedAt: now,
    lastModified: null,
  });
  expect(await t.mutation(internal.publicData.claim, location)).toBeNull();
  const result = await t.query(api.publicData.forCity, { city: "bengaluru" });
  expect(result.weather).not.toHaveProperty("nextAttemptAt");
});

it("retains last valid data and original times when the next refresh fails", async () => {
  const t = convexTest(schema, modules);
  await t.mutation(internal.publicData.claim, location);
  await t.mutation(internal.publicData.complete, {
    ...location,
    attemptedAt: now,
    outcome: "success",
    nextAttemptAt: now + HOUR_MS,
    data,
    sourceUpdatedAt: now - HOUR_MS,
  });
  vi.setSystemTime(now + HOUR_MS);
  await t.mutation(internal.publicData.claim, location);
  await t.mutation(internal.publicData.complete, {
    ...location,
    attemptedAt: now + HOUR_MS,
    outcome: "failed",
    nextAttemptAt: now + 2 * HOUR_MS,
  });
  const result = await t.query(api.publicData.forCity, { city: "bengaluru" });
  expect(result.weather.fetchedAt).toBe(now);
  expect(result.weather.sourceUpdatedAt).toBe(now - HOUR_MS);
  expect(result.weather.data).toEqual(data);
  const audit = await t.run(async (ctx) => ctx.db.query("auditLog").collect());
  expect(audit.map((entry) => entry.action)).toEqual([
    "public_data.refreshed",
    "public_data.failed",
  ]);
});

it("a 304 never moves the provider issue time and old responses cannot overwrite a new lease", async () => {
  const t = convexTest(schema, modules);
  await t.mutation(internal.publicData.claim, location);
  await t.mutation(internal.publicData.complete, {
    ...location,
    attemptedAt: now,
    outcome: "success",
    nextAttemptAt: now + HOUR_MS,
    data,
    sourceUpdatedAt: now - HOUR_MS,
  });
  vi.setSystemTime(now + HOUR_MS);
  await t.mutation(internal.publicData.claim, location);
  await t.mutation(internal.publicData.complete, {
    ...location,
    attemptedAt: now,
    outcome: "success",
    nextAttemptAt: now + HOUR_MS,
    data: { ...data, tempC: 99 },
    sourceUpdatedAt: now,
  });
  await t.mutation(internal.publicData.complete, {
    ...location,
    attemptedAt: now + HOUR_MS,
    outcome: "not_modified",
    nextAttemptAt: now + 2 * HOUR_MS,
  });
  const result = await t.query(api.publicData.forCity, { city: "bengaluru" });
  expect(result.weather.sourceUpdatedAt).toBe(now - HOUR_MS);
  expect(result.weather.data?.tempC).toBe(26);
});

it("does no fetch or database write when disabled", async () => {
  vi.stubEnv("PUBLIC_DATA_ENABLED", "false");
  const fetcher = vi.fn();
  vi.stubGlobal("fetch", fetcher);
  const t = convexTest(schema, modules);
  await t.action(internal.publicData.refreshCity, { city: "bengaluru" });
  expect(fetcher).not.toHaveBeenCalled();
  expect(
    await t.run(async (ctx) => ctx.db.query("publicDataSnapshots").collect()),
  ).toEqual([]);
});

it("failed provider requests are bounded and never expose keys or provider bodies", async () => {
  const fetcher = vi
    .fn()
    .mockResolvedValue(new Response("secret provider body", { status: 500 }));
  vi.stubGlobal("fetch", fetcher);
  const t = convexTest(schema, modules);
  await t.action(internal.publicData.refreshCity, { city: "bengaluru" });
  await t.action(internal.publicData.refreshCity, { city: "bengaluru" });
  expect(fetcher).toHaveBeenCalledTimes(1);
  const rows = await t.run(async (ctx) =>
    ctx.db.query("publicDataSnapshots").collect(),
  );
  expect(rows[0]?.lastResult).toBe("failed");
  expect(JSON.stringify(rows)).not.toContain("secret provider body");
  expect(rows[0]?.fetchedAt).toBeUndefined();
});
