/// <reference types="vite/client" />
// @vitest-environment edge-runtime
import { convexTest } from "convex-test";
import { it, vi } from "vitest";

import { convexModules, registerAuth, seedDemo } from "./lib/auth.testing";
import schema from "./schema";

it("counts", async () => {
  vi.stubEnv("AUTH_DEV_MODE", "true");
  const t = convexTest(schema, convexModules(import.meta.glob("./**/*.*s")));
  registerAuth(t);
  await seedDemo(t);
  let total = 0; const counts: Record<string, number> = {};
  await t.run(async (ctx) => {
    for (const table of Object.keys(schema.tables)) {
      const n = (await ctx.db.query(table as never).collect()).length;
      if (n) counts[table] = n;
      total += n;
    }
  });
  throw new Error(JSON.stringify({ total, counts }));
});
