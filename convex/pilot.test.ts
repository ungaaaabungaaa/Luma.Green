/// <reference types="vite/client" />
// @vitest-environment edge-runtime
import { convexTest } from "convex-test";
import { afterEach, describe, expect, it, vi } from "vitest";

import { api } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";
import { convexModules, registerAuth, signIn } from "./lib/auth.testing";
import { PILOT_SAMPLE_LIMIT } from "./pilot";
import schema from "./schema";

const modules = convexModules(import.meta.glob("./**/*.*s"));
const FROM = Date.parse("2026-10-13T00:00:00+05:30");
const TO = Date.parse("2026-10-21T00:00:00+05:30");
const PERIOD = { from: FROM, to: TO };
const EMAIL = "admin@luma.test";

afterEach(() => vi.unstubAllEnvs());

async function world(isTwoFactorEnabled = true) {
  vi.stubEnv("ADMIN_EMAIL", EMAIL);
  const t = convexTest(schema, modules);
  registerAuth(t);
  const admin = await signIn(t, {
    email: EMAIL,
    twoFactorEnabled: isTwoFactorEnabled,
  });
  const ids = await t.run(async (ctx) => {
    const profileId = await ctx.db.insert("profiles", {
      authUserId: "test-household",
      kind: "member",
      locale: "en",
      createdAt: FROM,
      updatedAt: FROM,
    });
    const orgId = await ctx.db.insert("orgs", {
      kind: "kabadiwala",
      name: "Test shop",
      slug: "test-shop",
      status: "active",
      city: "Bengaluru",
      area: "Mathikere",
      address: "Mathikere, Bengaluru",
      phones: [],
      weeklyOff: [],
      families: ["paper"],
      offersPickup: true,
      createdAt: FROM,
      updatedAt: FROM,
    });
    return { profileId, orgId };
  });
  return { t, admin, ...ids };
}

type World = Awaited<ReturnType<typeof world>>;

async function booking(w: World, changes: Partial<Doc<"bookings">> = {}) {
  return w.t.run(async (ctx) =>
    ctx.db.insert("bookings", {
      token: "private-token",
      householdProfileId: w.profileId,
      phone: "+919999999999",
      name: "Private household",
      mode: "pickup",
      items: [{ materialCode: "PAPER-NEWS", estKg: 1.001 }],
      estimatePaise: 1000,
      orgId: w.orgId,
      slotDate: "2026-10-14",
      slotWindow: "morning",
      address: "Secret exact address",
      status: "requested",
      timeline: [{ status: "requested", at: FROM }],
      createdAt: FROM,
      updatedAt: FROM,
      ...changes,
    }),
  );
}

async function application(
  w: World,
  changes: Partial<Doc<"applications">> = {},
) {
  return w.t.run(async (ctx) =>
    ctx.db.insert("applications", {
      profileId: w.profileId,
      kind: "kabadiwala",
      status: "submitted",
      version: 1,
      locale: "en",
      ageConfirmedAt: FROM,
      privacyAcceptedAt: FROM,
      submittedAt: FROM,
      createdAt: FROM,
      updatedAt: FROM,
      ...changes,
    }),
  );
}

describe("admin pilot report", () => {
  it("requires a signed-in admin with two-factor enabled", async () => {
    const w = await world();
    await expect(w.t.query(api.pilot.summary, PERIOD)).rejects.toThrow(
      /NOT_SIGNED_IN/,
    );
    const member = await signIn(w.t, {
      email: "member@test.invalid",
      phoneNumber: "+919999999999",
    });
    await expect(member.query(api.pilot.summary, PERIOD)).rejects.toThrow(
      /NOT_ADMIN/,
    );
    const noFactor = await world(false);
    await expect(
      noFactor.admin.query(api.pilot.summary, PERIOD),
    ).rejects.toThrow(/TWO_FACTOR_REQUIRED/);
  });

  it("counts the requested period and keeps empty averages unavailable", async () => {
    const w = await world();
    await booking(w, { createdAt: FROM - 1 });
    await booking(w, { createdAt: TO });
    await application(w, { submittedAt: undefined, status: "draft" });
    await application(w, { submittedAt: TO });
    const summary = await w.admin.query(api.pilot.summary, PERIOD);
    expect(summary.bookings.count).toBe(0);
    expect(summary.bookings.averageAcceptMs).toBeNull();
    expect(summary.applications.count).toBe(0);
    expect(summary.applications.averageDecisionMs).toBeNull();
  });

  it("reports actual receipts, integer grams and all outcomes without personal data", async () => {
    const w = await world();
    await booking(w, {
      status: "completed",
      estimatePaise: 1000,
      timeline: [
        { status: "requested", at: FROM },
        { status: "accepted", at: FROM + 60_000 },
        { status: "completed", at: FROM + 120_000 },
      ],
      receipt: {
        lines: [
          {
            materialCode: "PAPER-NEWS",
            grams: 1501,
            paisePerKg: 1000,
            paise: 1501,
          },
          {
            materialCode: "PLASTIC-PET",
            grams: 500,
            paisePerKg: 2000,
            paise: 1000,
          },
        ],
        totalPaise: 2501,
        method: "cash",
        paidAt: FROM + 120_000,
      },
      dispatch: {
        attempt: 2,
        offeredAt: FROM,
        attemptedOrgIds: [w.orgId],
        approximateLocation: true,
      },
    });
    await booking(w, {
      status: "accepted",
      timeline: [
        { status: "requested", at: FROM },
        { status: "accepted", at: FROM + 180_000 },
      ],
    });
    await booking(w, { status: "completed" }); // Legacy completion without a receipt.
    for (const status of [
      "requested",
      "on_the_way",
      "cancelled",
      "declined",
    ] as const)
      await booking(w, { status });
    await application(w);
    await application(w, { status: "approved", decidedAt: FROM + 3_600_000 });
    await application(w, { status: "rejected", decidedAt: FROM + 7_200_000 });
    await application(w, { decidedAt: FROM - 1 }); // Stale decision from a prior round.
    const summary = await w.admin.query(api.pilot.summary, PERIOD);
    expect(summary.bookings).toMatchObject({
      count: 7,
      acceptedCount: 2,
      averageAcceptMs: 120_000,
      reassignedCount: 1,
      completedWithReceipt: 1,
      paidPaise: 2501,
      estimatedPaise: 1000,
      weighedGrams: 2001,
      outcomes: {
        requested: 1,
        accepted: 1,
        on_the_way: 1,
        completed: 2,
        declined: 1,
        cancelled: 1,
      },
      materials: [
        { code: "PAPER-NEWS", estimatedGrams: 1001, weighedGrams: 1501 },
        { code: "PLASTIC-PET", estimatedGrams: 0, weighedGrams: 500 },
      ],
    });
    expect(summary.applications).toEqual({
      count: 4,
      decidedCount: 2,
      awaitingDecisionCount: 2,
      averageDecisionMs: 5_400_000,
    });
    const serialized = JSON.stringify(summary);
    for (const secret of [
      "Private household",
      "9999999999",
      "Secret exact address",
      "private-token",
    ])
      expect(serialized).not.toContain(secret);
  });

  it("marks capped results as partial, so counts cannot be mistaken for totals", async () => {
    const w = await world();
    for (let index = 0; index <= PILOT_SAMPLE_LIMIT; index += 1) {
      await booking(w);
      await application(w);
    }
    const summary = await w.admin.query(api.pilot.summary, PERIOD);
    expect(summary.bookings.count).toBe(PILOT_SAMPLE_LIMIT);
    expect(summary.bookingsTruncated).toBe(true);
    expect(summary.applications.count).toBe(PILOT_SAMPLE_LIMIT);
    expect(summary.applicationsTruncated).toBe(true);
  });

  it("rejects invalid or unbounded reporting periods", async () => {
    const w = await world();
    for (const period of [
      { from: TO, to: FROM },
      { from: FROM, to: FROM },
      { from: -1, to: TO },
      { from: 1.5, to: 5 },
      { from: FROM, to: FROM + 32 * 86_400_000 },
    ])
      await expect(w.admin.query(api.pilot.summary, period)).rejects.toThrow(
        /INVALID_PERIOD/,
      );
  });
});
