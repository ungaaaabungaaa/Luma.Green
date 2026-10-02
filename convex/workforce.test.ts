/// <reference types="vite/client" />
// @vitest-environment edge-runtime
import type { FunctionReturnType } from "convex/server";
import { convexTest } from "convex-test";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { api, internal } from "./_generated/api";
import {
  convexModules,
  registerAuth,
  seedDemo,
  signInAs,
} from "./lib/auth.testing";
import schema from "./schema";

const modules = convexModules(import.meta.glob("./**/*.*s"));
const INPUT = {
  kind: "home_pickups" as const,
  title: "Collect sorted paper",
  area: "Yeshwanthpur",
  date: "2026-10-02",
  window: "evening" as const,
  payPaise: 45_001,
};
beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-02T06:30:00Z"));
  vi.stubEnv("AUTH_DEV_MODE", "true");
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});
async function world() {
  const t = convexTest(schema, modules);
  registerAuth(t);
  await seedDemo(t);
  vi.setSystemTime(new Date("2026-10-02T06:30:11Z"));
  return t;
}

describe("business workforce", () => {
  it("posts exact pay to the existing Saathi board and audits the post", async () => {
    const t = await world();
    const employer = await signInAs(t, "+919000000101");
    const worker = await signInAs(t, "+919000000105");
    const jobId = await employer.mutation(api.workforce.post, INPUT);
    const offered = await worker.query(api.saathi.board, {});
    expect(offered.open.find((job) => job.id === jobId)).toMatchObject({
      title: INPUT.title,
      payPaise: 45_001,
    });
    await worker.mutation(api.saathi.take, { jobId });
    await worker.mutation(api.saathi.finish, { jobId });
    const board = await employer.query(api.workforce.board, {});
    expect(board.jobs.find((job) => job.id === jobId)?.status).toBe("done");
    const logs = await t.run(async (ctx) =>
      ctx.db
        .query("auditLog")
        .withIndex("by_entity", (q) =>
          q.eq("entityTable", "jobs").eq("entityId", jobId),
        )
        .collect(),
    );
    const actions = logs.map((row) => row.action);
    expect(actions).toEqual(["job.posted", "job.taken", "job.done"]);
  });
  it("closes only the caller's unassigned job and removes the offer", async () => {
    const t = await world();
    const employer = await signInAs(t, "+919000000101");
    const other = await signInAs(t, "+919000000102");
    const worker = await signInAs(t, "+919000000105");
    const jobId = await employer.mutation(api.workforce.post, INPUT);
    await expect(
      other.mutation(api.workforce.cancel, { jobId }),
    ).rejects.toThrow(/JOB_NOT_FOUND/);
    await employer.mutation(api.workforce.cancel, { jobId });
    await employer.mutation(api.workforce.cancel, { jobId });
    const workerBoard = await worker.query(api.saathi.board, {});
    expect(workerBoard.open.some((job) => job.id === jobId)).toBe(false);
    await expect(worker.mutation(api.saathi.take, { jobId })).rejects.toThrow(
      /JOB_NOT_FOUND/,
    );
    const audit = await t.run(async (ctx) =>
      ctx.db
        .query("auditLog")
        .withIndex("by_entity", (q) =>
          q.eq("entityTable", "jobs").eq("entityId", jobId),
        )
        .collect(),
    );
    expect(audit.filter((row) => row.action === "job.cancelled")).toHaveLength(
      1,
    );
  });
  it("cannot cancel a job after a worker has taken it", async () => {
    const t = await world();
    const employer = await signInAs(t, "+919000000101");
    const worker = await signInAs(t, "+919000000105");
    const jobId = await employer.mutation(api.workforce.post, INPUT);
    await worker.mutation(api.saathi.take, { jobId });
    await expect(
      employer.mutation(api.workforce.cancel, { jobId }),
    ).rejects.toThrow(/JOB_ALREADY_ASSIGNED/);
  });
  it.each([
    { payPaise: 1.5 },
    { payPaise: 0 },
    { date: "2026-02-30" },
    { date: "2027-01-02" },
    { title: "x" },
  ])("rejects invalid work terms %j", async (invalid) => {
    const employer = await signInAs(await world(), "+919000000101");
    await expect(
      employer.mutation(api.workforce.post, { ...INPUT, ...invalid }),
    ).rejects.toThrow(/INVALID_JOB/);
  });
  it("denies signed-out and Saathi posting and scopes the business list", async () => {
    const t = await world();
    await expect(t.query(api.workforce.board, {})).rejects.toThrow(
      /NOT_SIGNED_IN/,
    );
    const worker = await signInAs(t, "+919000000105");
    await expect(worker.mutation(api.workforce.post, INPUT)).rejects.toThrow(
      /NO_BUSINESS/,
    );
    const employer = await signInAs(t, "+919000000101");
    const other = await signInAs(t, "+919000000102");
    const jobId = await employer.mutation(api.workforce.post, INPUT);
    const otherBoard = await other.query(api.workforce.board, {});
    expect(otherBoard.jobs.some((job) => job.id === jobId)).toBe(false);
    await expect(employer.mutation(api.workforce.post, INPUT)).rejects.toThrow(
      /TRY_LATER/,
    );
  });
});

it("does not let cancelled, expired or other-city offers hide a new local job", async () => {
  const t = await world();
  const employer = await signInAs(t, "+919000000101");
  const worker = await signInAs(t, "+919000000105");
  await t.run(async (ctx) => {
    const org = await ctx.db
      .query("orgs")
      .withIndex("by_slug", (q) => q.eq("slug", "ramesh-kabadi-store"))
      .unique();
    if (!org) throw new Error("Missing business");
    for (let index = 0; index < 510; index += 1) {
      await ctx.db.insert("jobs", {
        ...INPUT,
        orgId: org._id,
        city: "Bengaluru",
        status: "open",
        createdAt: Date.now() - 20_000,
        cancelledAt: Date.now() - 10_000,
      });
      await ctx.db.insert("jobs", {
        ...INPUT,
        orgId: org._id,
        city: "Bengaluru",
        status: "open",
        createdAt: Date.now() - 20_000,
        date: "2026-10-01",
      });
      await ctx.db.insert("jobs", {
        ...INPUT,
        orgId: org._id,
        city: "Delhi",
        status: "open",
        createdAt: Date.now() - 20_000,
      });
    }
  });
  const jobId = await employer.mutation(api.workforce.post, INPUT);
  const board = await worker.query(api.saathi.board, {});
  expect(board.open.some((job) => job.id === jobId)).toBe(true);
});

it("backfills existing job cities in audited bounded pages without changing team jobs", async () => {
  const t = await world();
  const legacyIds = await t.run(async (ctx) => {
    const org = await ctx.db
      .query("orgs")
      .withIndex("by_slug", (q) => q.eq("slug", "ramesh-kabadi-store"))
      .unique();
    if (!org) throw new Error("Missing business");
    const ids = [];
    for (let index = 0; index < 105; index += 1) {
      ids.push(
        await ctx.db.insert("jobs", {
          ...INPUT,
          orgId: org._id,
          status: "open",
          createdAt: Date.now(),
        }),
      );
    }
    await ctx.db.insert("jobs", {
      ...INPUT,
      status: "open",
      title: "Team job",
      createdAt: Date.now(),
    });
    return ids;
  });
  let cursor: string | null = null;
  let updated = 0;
  let isDone = false;
  while (!isDone) {
    const result: FunctionReturnType<
      typeof internal.workforce.backfillJobCities
    > = await t.mutation(internal.workforce.backfillJobCities, {
      cursor,
    });
    expect(result.updated).toBeLessThanOrEqual(100);
    expect(result.unresolved).toBe(0);
    updated += result.updated;
    cursor = result.cursor;
    isDone = result.isDone;
  }
  expect(updated).toBe(105);
  await t.run(async (ctx) => {
    for (const id of legacyIds) {
      const job = await ctx.db.get("jobs", id);
      expect(job?.city).toBe("Bengaluru");
    }
    const jobs = await ctx.db.query("jobs").collect();
    expect(jobs.find((job) => job.title === "Team job")?.city).toBeUndefined();
    const logs = await ctx.db.query("auditLog").collect();
    expect(
      logs.filter((row) => row.action === "job.cityBackfilled"),
    ).toHaveLength(105);
  });
  const repeated = await t.mutation(internal.workforce.backfillJobCities, {
    cursor: null,
  });
  expect(repeated.updated).toBe(0);
});
