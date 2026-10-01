/// <reference types="vite/client" />
// @vitest-environment edge-runtime
import { convexTest } from "convex-test";
import { afterEach, expect, it, vi } from "vitest";

import { api, internal } from "./_generated/api";
import { convexModules, registerAuth, signIn } from "./lib/auth.testing";
import { PHOTO_DAY_MS } from "./lib/photoEstimates";
import schema from "./schema";

const modules = convexModules(import.meta.glob("./**/*.*s"));
const image =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=";
const deviceId = "11111111-1111-4111-8111-111111111111";
function world() {
  const t = convexTest(schema, modules);
  registerAuth(t);
  return t;
}
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

it("returns unavailable without both config values and never requests the provider", async () => {
  vi.stubEnv("OPENROUTER_API_KEY", "");
  vi.stubEnv("OPENROUTER_MODEL", "");
  const fetcher = vi.fn();
  vi.stubGlobal("fetch", fetcher);
  const t = world();
  expect(await t.query(api.photoEstimates.available, {})).toBe(false);
  expect(
    await t.action(api.photoEstimates.estimate, { image, deviceId }),
  ).toEqual({ status: "unavailable" });
  vi.stubEnv("OPENROUTER_API_KEY", "test");
  expect(
    await t.action(api.photoEstimates.estimate, { image, deviceId }),
  ).toEqual({ status: "unavailable" });
  expect(fetcher).not.toHaveBeenCalled();
});

it("rejects malformed images before quota or provider work", async () => {
  vi.stubEnv("OPENROUTER_API_KEY", "test");
  vi.stubEnv("OPENROUTER_MODEL", "chosen/model");
  const fetcher = vi.fn();
  vi.stubGlobal("fetch", fetcher);
  const t = world();
  expect(
    await t.action(api.photoEstimates.estimate, {
      image: "not-an-image",
      deviceId,
    }),
  ).toEqual({ status: "invalid" });
  expect(
    await t.run((ctx) => ctx.db.query("photoEstimateQuota").collect()),
  ).toEqual([]);
  expect(fetcher).not.toHaveBeenCalled();
});

it("takes active scrap only and returns a validated result without storing a photo", async () => {
  vi.useFakeTimers();
  vi.stubEnv("OPENROUTER_API_KEY", "test");
  vi.stubEnv("OPENROUTER_MODEL", "chosen/model");
  const t = world();
  await t.run(async (ctx) => {
    for (const [code, active, stage] of [
      ["PAPER-NEWS", true, "scrap"],
      ["OLD", false, "scrap"],
      ["RECYCLED", true, "recycled"],
    ] as const) {
      await ctx.db.insert("materials", {
        code,
        active,
        stage,
        family: "paper",
        names: { en: code },
        co2eFactor: 1,
        sortOrder: 1,
      });
    }
  });
  expect(await t.query(internal.photoEstimates.catalogue, {})).toEqual([
    { code: "PAPER-NEWS", name: "PAPER-NEWS" },
  ]);
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
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
      Response.json({
        choices: [{ message: { content: JSON.stringify(result) } }],
      }),
    ),
  );
  expect(
    await t.action(api.photoEstimates.estimate, { image, deviceId }),
  ).toEqual({ status: "ok", result });
  const rows = await t.run((ctx) =>
    ctx.db.query("photoEstimateQuota").collect(),
  );
  expect(rows[0].reservations).toHaveLength(1);
  expect(JSON.stringify(rows)).not.toContain(deviceId);
  expect(JSON.stringify(rows)).not.toContain(image);
  await t.finishAllScheduledFunctions(vi.runAllTimers);
});

it("reserves atomically, caps rotatable devices globally, and expires hashes", async () => {
  vi.useFakeTimers();
  const t = world();
  const isFirst = await t.mutation(internal.photoEstimates.reserve, {
    deviceHash: "a".repeat(64),
    dailyLimit: 1,
  });
  const isSecond = await t.mutation(internal.photoEstimates.reserve, {
    deviceHash: "b".repeat(64),
    dailyLimit: 1,
  });
  expect(isFirst).toBe(true);
  expect(isSecond).toBe(false);
  await vi.advanceTimersByTimeAsync(PHOTO_DAY_MS + 3_600_000);
  await t.finishInProgressScheduledFunctions();
  expect(
    await t.run((ctx) => ctx.db.query("photoEstimateQuota").collect()),
  ).toEqual([]);
});

it("keeps failures inside the global spend quota", async () => {
  vi.useFakeTimers();
  vi.stubEnv("OPENROUTER_API_KEY", "test");
  vi.stubEnv("OPENROUTER_MODEL", "chosen/model");
  vi.stubEnv("PHOTO_ESTIMATE_DAILY_LIMIT", "1");
  const t = world();
  await t.run((ctx) =>
    ctx.db.insert("materials", {
      code: "PAPER-NEWS",
      active: true,
      stage: "scrap",
      family: "paper",
      names: { en: "Paper" },
      co2eFactor: 1,
      sortOrder: 1,
    }),
  );
  const fetcher = vi
    .fn()
    .mockRejectedValue(new Error("private provider failure"));
  vi.stubGlobal("fetch", fetcher);
  expect(
    await t.action(api.photoEstimates.estimate, { image, deviceId }),
  ).toEqual({ status: "failed" });
  expect(
    await t.action(api.photoEstimates.estimate, { image, deviceId }),
  ).toEqual({ status: "limited" });
  expect(fetcher).toHaveBeenCalledTimes(1);
  await t.finishAllScheduledFunctions(vi.runAllTimers);
});

it("enforces a verified phone cap even when browser device IDs change", async () => {
  vi.useFakeTimers();
  vi.stubEnv("OPENROUTER_API_KEY", "test");
  vi.stubEnv("OPENROUTER_MODEL", "chosen/model");
  const t = world();
  await t.run((ctx) =>
    ctx.db.insert("materials", {
      code: "PAPER-NEWS",
      active: true,
      stage: "scrap",
      family: "paper",
      names: { en: "Paper" },
      co2eFactor: 1,
      sortOrder: 1,
    }),
  );
  const as = await signIn(t, {
    email: "photo@test.luma.green",
    phoneNumber: "+919876543210",
  });
  const fetcher = vi.fn().mockRejectedValue(new Error("provider failure"));
  vi.stubGlobal("fetch", fetcher);
  for (let index = 0; index < 5; index += 1) {
    expect(
      await as.action(api.photoEstimates.estimate, {
        image,
        deviceId: `${String(index).repeat(8)}-1111-4111-8111-111111111111`,
      }),
    ).toEqual({ status: "failed" });
  }
  expect(
    await as.action(api.photoEstimates.estimate, {
      image,
      deviceId: "99999999-1111-4111-8111-111111111111",
    }),
  ).toEqual({ status: "limited" });
  expect(fetcher).toHaveBeenCalledTimes(5);
  const rows = await t.run((ctx) =>
    ctx.db.query("photoEstimateQuota").collect(),
  );
  expect(
    rows[0].reservations.every((entry) => entry.phoneHash?.length === 64),
  ).toBe(true);
  expect(JSON.stringify(rows)).not.toContain("9876543210");
  await t.finishAllScheduledFunctions(vi.runAllTimers);
});

it("exposes only an availability boolean when valid provider configuration exists", async () => {
  vi.stubEnv("OPENROUTER_API_KEY", "private-test-key");
  vi.stubEnv("OPENROUTER_MODEL", "chosen/model");
  const t = world();
  expect(await t.query(api.photoEstimates.available, {})).toBe(true);
  vi.stubEnv("PHOTO_ESTIMATE_DAILY_LIMIT", "1001");
  expect(await t.query(api.photoEstimates.available, {})).toBe(false);
});

it("coalesces cleanup jobs while enforcing the exact rolling day and retaining later reservations", async () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-01T00:10:00Z"));
  const t = world();
  const reserve = (deviceHash: string) =>
    t.mutation(internal.photoEstimates.reserve, {
      deviceHash: deviceHash.repeat(64),
      dailyLimit: 2,
    });
  expect(await reserve("a")).toBe(true);
  await vi.advanceTimersByTimeAsync(30 * 60_000);
  expect(await reserve("b")).toBe(true);
  const pending = await t.run((ctx) =>
    ctx.db.system.query("_scheduled_functions").collect(),
  );
  expect(pending).toHaveLength(1);
  // A legacy cleanup invocation before the owned job must not start another chain.
  await t.mutation(internal.photoEstimates.expire, {});
  expect(
    await t.run((ctx) => ctx.db.system.query("_scheduled_functions").collect()),
  ).toHaveLength(1);
  await vi.advanceTimersByTimeAsync(PHOTO_DAY_MS - 30 * 60_000 - 1);
  expect(await reserve("c")).toBe(false);
  await vi.advanceTimersByTimeAsync(1);
  expect(await reserve("c")).toBe(true);
  // First expiry is 01:00; b has expired, c must remain with one successor job.
  await vi.advanceTimersByTimeAsync(50 * 60_000);
  await t.finishInProgressScheduledFunctions();
  const row = await t.run((ctx) => ctx.db.query("photoEstimateQuota").unique());
  expect(row?.reservations).toEqual([
    { at: Date.parse("2026-10-02T00:10:00Z"), deviceHash: "c".repeat(64) },
  ]);
  expect(row?.cleanupScheduledAt).toBe(Date.parse("2026-10-03T01:00:00Z"));
  await t.finishAllScheduledFunctions(vi.runAllTimers);
  expect(
    await t.run((ctx) => ctx.db.query("photoEstimateQuota").collect()),
  ).toEqual([]);
});
