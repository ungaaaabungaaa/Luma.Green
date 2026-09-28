/// <reference types="vite/client" />
// @vitest-environment edge-runtime
import { convexTest } from "convex-test";
import { afterEach, describe, expect, it, vi } from "vitest";

import { api } from "./_generated/api";
import schema from "./schema";

// Every function module, without tests or type declarations. (Vite's glob
// doesn't support the `!(*.*.*)` pattern from the convex-test docs.)
const modules = Object.fromEntries(
  Object.entries(import.meta.glob("./**/*.*s")).filter(
    ([path]) => !path.endsWith(".test.ts") && !path.endsWith(".d.ts"),
  ),
);

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("signInOptions", () => {
  it("offers phone sign-in only when codes can be delivered", async () => {
    const t = convexTest(schema, modules);

    vi.stubEnv("AUTH_DEV_MODE", "");
    vi.stubEnv("MSG91_AUTH_KEY", "");
    const off = await t.query(api.identity.signInOptions, {});
    expect(off.phone).toBe(false);

    vi.stubEnv("AUTH_DEV_MODE", "true");
    const devMode = await t.query(api.identity.signInOptions, {});
    expect(devMode.phone).toBe(true);
  });

  it("opens admin setup once, while ADMIN_EMAIL is set and no admin exists", async () => {
    const t = convexTest(schema, modules);

    vi.stubEnv("ADMIN_EMAIL", "");
    const unset = await t.query(api.identity.signInOptions, {});
    expect(unset.adminSetup).toBe(false);

    vi.stubEnv("ADMIN_EMAIL", "admin@luma.test");
    const open = await t.query(api.identity.signInOptions, {});
    expect(open.adminSetup).toBe(true);

    await t.run(async (ctx) => {
      const now = Date.now();
      const profileId = await ctx.db.insert("profiles", {
        authUserId: "user_1",
        kind: "admin",
        locale: "en",
        createdAt: now,
        updatedAt: now,
      });
      await ctx.db.insert("adminProfiles", {
        profileId,
        name: "Asha Rao",
        email: "admin@luma.test",
        phone: "+919876543210",
        dateOfBirth: "1990-01-15",
        aadhaarLast4: "1234",
        createdAt: now,
        updatedAt: now,
      });
    });
    const done = await t.query(api.identity.signInOptions, {});
    expect(done.adminSetup).toBe(false);
  });
});

describe("signed out", () => {
  it("has no identity", async () => {
    const t = convexTest(schema, modules);
    expect(await t.query(api.identity.me, {})).toBeNull();
  });

  it("can't create a profile, save the admin record or read the console", async () => {
    const t = convexTest(schema, modules);
    vi.stubEnv("ADMIN_EMAIL", "admin@luma.test");

    await expect(
      t.mutation(api.identity.ensureProfile, { locale: "kn" }),
    ).rejects.toThrow(/NOT_SIGNED_IN/);
    await expect(
      t.mutation(api.identity.saveAdminProfile, {
        name: "Mallory",
        phone: "+919876543210",
        dateOfBirth: "1990-01-15",
        aadhaarLast4: "1234",
      }),
    ).rejects.toThrow(/NOT_SIGNED_IN/);
    await expect(t.query(api.admin.overview, {})).rejects.toThrow(
      /NOT_SIGNED_IN/,
    );

    const rows = await t.run(async (ctx) => ({
      profiles: await ctx.db.query("profiles").collect(),
      adminProfiles: await ctx.db.query("adminProfiles").collect(),
    }));
    expect(rows).toEqual({ profiles: [], adminProfiles: [] });
  });
});
