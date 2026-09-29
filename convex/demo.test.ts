/// <reference types="vite/client" />
// @vitest-environment edge-runtime
import { convexTest } from "convex-test";
import { afterEach, describe, expect, it, vi } from "vitest";

import { api } from "./_generated/api";
import {
  convexModules,
  registerAuth,
  seedDemo,
  signInAs,
} from "./lib/auth.testing";
import schema from "./schema";

const modules = convexModules(import.meta.glob("./**/*.*s"));

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("the demo world", () => {
  it("seeds only where demo mode is on", async () => {
    const t = convexTest(schema, modules);
    registerAuth(t);
    await expect(seedDemo(t)).rejects.toThrow(/DEMO_ONLY_ON_DEV/);
  });

  it("gives every demo login the right workspace", async () => {
    vi.stubEnv("AUTH_DEV_MODE", "true");
    const t = convexTest(schema, modules);
    registerAuth(t);
    await seedDemo(t);

    const shop = await signInAs(t, "+919000000101");
    expect(await shop.query(api.workspace.mine, {})).toMatchObject({
      kind: "org",
      org: { kind: "kabadiwala", name: "Ramesh Kabadi Store" },
    });
    const saathi = await signInAs(t, "+919000000105");
    expect(await saathi.query(api.workspace.mine, {})).toMatchObject({
      kind: "saathi",
    });
    const applicant = await signInAs(t, "+919000000107");
    expect(await applicant.query(api.workspace.mine, {})).toEqual({
      kind: "none",
      application: { kind: "yard", status: "submitted" },
    });
  });

  it("publishes a price board with a month of history", async () => {
    vi.stubEnv("AUTH_DEV_MODE", "true");
    const t = convexTest(schema, modules);
    registerAuth(t);
    await seedDemo(t);
    const board = await t.query(api.catalogue.priceBoard, {
      city: "Bengaluru",
    });
    const newspaper = board.rows.find((row) => row.code === "PAPER-NEWS");
    expect(newspaper?.series).toHaveLength(30);
    expect(newspaper?.todayPaise).toBeGreaterThan(0);
  });
});
