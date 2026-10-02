// @vitest-environment edge-runtime
import { convexTest } from "convex-test";
import { afterEach, expect, it, vi } from "vitest";

import { api, components } from "./_generated/api";
import { convexModules, registerAuth, signIn } from "./lib/auth.testing";
import schema from "./schema";

const modules = convexModules(import.meta.glob("./**/*.*s"));
const message = {
  name: "Test Person",
  phone: "+919876500001",
  role: "household" as const,
  topic: "pickup" as const,
  message: "Please help with my pickup.",
};

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

function setup() {
  const t = convexTest(schema, modules);
  registerAuth(t);
  return t;
}

it("limits normalized phone submissions to three per rolling hour without writing a rejected message", async () => {
  vi.useFakeTimers();
  const t = setup();
  for (const phone of [message.phone, "98765 00001", "09876500001"]) {
    await t.mutation(api.support.send, { ...message, phone });
  }
  const before = await t.run(async (ctx) => ({
    requests: await ctx.db.query("supportRequests").collect(),
    audit: await ctx.db.query("auditLog").collect(),
  }));
  await expect(t.mutation(api.support.send, message)).rejects.toThrow(
    /SUPPORT_RATE_LIMITED/,
  );
  const after = await t.run(async (ctx) => ({
    requests: await ctx.db.query("supportRequests").collect(),
    audit: await ctx.db.query("auditLog").collect(),
  }));
  expect(after).toEqual(before);
  expect(after.requests).toHaveLength(3);
  expect(after.audit).toHaveLength(3);
  expect(after.audit.every((row) => row.action === "support.created")).toBe(
    true,
  );
  expect(JSON.stringify(after.audit)).not.toContain(message.phone);
  expect(JSON.stringify(after.audit)).not.toContain(message.message);

  await expect(
    t.mutation(api.support.send, { ...message, phone: "+919876500002" }),
  ).resolves.toBeNull();
  vi.advanceTimersByTime(60 * 60 * 1000 - 1);
  await expect(t.mutation(api.support.send, message)).rejects.toThrow(
    /SUPPORT_RATE_LIMITED/,
  );
  vi.advanceTimersByTime(1);
  await expect(t.mutation(api.support.send, message)).resolves.toBeNull();
});

it("requires an admin with two-factor auth to read or answer support and audits one answer only", async () => {
  const t = setup();
  vi.stubEnv("ADMIN_EMAIL", "admin@luma.test");
  await t.mutation(api.support.send, message);
  const request = await t.run((ctx) => ctx.db.query("supportRequests").first());
  if (!request) throw new Error("Missing support request");
  await expect(t.query(api.support.list, {})).rejects.toThrow(/NOT_SIGNED_IN/);
  await expect(
    t.mutation(api.support.markAnswered, { id: request._id }),
  ).rejects.toThrow(/NOT_SIGNED_IN/);
  const member = await signIn(t, { email: "member@luma.test" });
  await expect(member.query(api.support.list, {})).rejects.toThrow(/NOT_ADMIN/);
  await expect(
    member.mutation(api.support.markAnswered, { id: request._id }),
  ).rejects.toThrow(/NOT_ADMIN/);
  const admin = await signIn(t, {
    email: "admin@luma.test",
    twoFactorEnabled: false,
  });
  await expect(admin.query(api.support.list, {})).rejects.toThrow(
    /TWO_FACTOR_REQUIRED/,
  );
  await expect(
    admin.mutation(api.support.markAnswered, { id: request._id }),
  ).rejects.toThrow(/TWO_FACTOR_REQUIRED/);
  await t.run((ctx) =>
    ctx.runMutation(components.betterAuth.adapter.updateOne, {
      input: {
        model: "user",
        where: [{ field: "email", value: "admin@luma.test" }],
        update: { twoFactorEnabled: true },
      },
    }),
  );
  const profileId = await admin.mutation(api.identity.ensureProfile, {
    locale: "en",
  });
  await admin.mutation(api.support.markAnswered, { id: request._id });
  await admin.mutation(api.support.markAnswered, { id: request._id });
  expect(await admin.query(api.support.list, {})).toMatchObject([
    { status: "answered" },
  ]);
  const audit = await t.run((ctx) =>
    ctx.db
      .query("auditLog")
      .withIndex("by_entity", (q) =>
        q.eq("entityTable", "supportRequests").eq("entityId", request._id),
      )
      .collect(),
  );
  expect(audit.map((row) => row.action)).toEqual([
    "support.created",
    "support.answered",
  ]);
  expect(audit[1].actorProfileId).toBe(profileId);
  expect(audit[1].metadata).toBeUndefined();
});
