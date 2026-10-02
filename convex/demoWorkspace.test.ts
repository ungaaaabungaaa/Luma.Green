/// <reference types="vite/client" />
// @vitest-environment edge-runtime
import { convexTest } from "convex-test";
import { afterEach, describe, expect, it, vi } from "vitest";

import { api, internal } from "./_generated/api";
import { convexModules, registerAuth, signIn } from "./lib/auth.testing";
import schema from "./schema";

const modules = convexModules(import.meta.glob("./**/*.*s"));
afterEach(() => vi.unstubAllEnvs());
describe("isolated demo data", () => {
  it("installs the same manifest idempotently without operational writes or development auth", async () => {
    vi.stubEnv("AUTH_DEV_MODE", "false");
    const t = convexTest(schema, modules);
    const first = await t.action(internal.demoWorkspace.seed, {});
    expect(first.changed).toBe(true);
    expect(first.checksum).toMatch(/^[a-f0-9]{64}$/u);
    expect(await t.action(internal.demoWorkspace.seed, {})).toEqual({
      ...first,
      changed: false,
    });
    await t.run(async (ctx) => {
      expect(await ctx.db.query("demoWorkspaces").collect()).toHaveLength(1);
      expect(await ctx.db.query("auditLog").collect()).toHaveLength(1);
      for (const table of [
        "orgs",
        "profiles",
        "bookings",
        "trades",
        "jobs",
        "supportRequests",
        "conversations",
        "conversationMessages",
        "materialDemands",
        "publicDataSnapshots",
      ] as const) {
        expect(await ctx.db.query(table).first()).toBeNull();
      }
    });
  });
  it("shows the dataset only to an admin with two-factor access", async () => {
    vi.stubEnv("ADMIN_EMAIL", "admin@example.invalid");
    const t = convexTest(schema, modules);
    registerAuth(t);
    await t.action(internal.demoWorkspace.seed, {});
    await expect(t.query(api.demoWorkspace.preview, {})).rejects.toThrow(
      "NOT_SIGNED_IN",
    );
    const member = await signIn(t, { email: "member@example.invalid" });
    await expect(member.query(api.demoWorkspace.preview, {})).rejects.toThrow(
      "NOT_ADMIN",
    );
    vi.stubEnv("ADMIN_EMAIL", "admin-no-factor@example.invalid");
    const noFactor = await signIn(t, {
      email: "admin-no-factor@example.invalid",
    });
    await expect(noFactor.query(api.demoWorkspace.preview, {})).rejects.toThrow(
      "TWO_FACTOR_REQUIRED",
    );
    vi.stubEnv("ADMIN_EMAIL", "admin@example.invalid");
    const admin = await signIn(t, {
      email: "admin@example.invalid",
      twoFactorEnabled: true,
    });
    const preview = await admin.query(api.demoWorkspace.preview, {});
    expect(preview?.counts.businesses).toBe(48);
    expect(preview?.label).toContain("DEMO");
    expect(preview).not.toHaveProperty("payload");
  });
  it("rejects an arbitrary payload", async () => {
    const t = convexTest(schema, modules);
    await expect(
      t.mutation(internal.demoWorkspace.save, {
        payload: "{}",
        checksum: "a".repeat(64),
      }),
    ).rejects.toThrow("INVALID_DEMO_DATA");
  });
});
