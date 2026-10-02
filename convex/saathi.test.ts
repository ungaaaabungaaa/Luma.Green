/// <reference types="vite/client" />
// @vitest-environment edge-runtime
import { convexTest } from "convex-test";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import {
  convexModules,
  registerAuth,
  seedDemo,
  signIn,
  signInAs,
} from "./lib/auth.testing";
import { shiftDate } from "./lib/dates";
import { bySchedule, earningsOf } from "./saathi";
import schema from "./schema";

const modules = convexModules(import.meta.glob("./**/*.*s"));

/** Noon in Bengaluru on 29 Sep 2026 — the demo world is seeded around it. */
const NOW = new Date("2026-09-29T06:30:00Z");
const TODAY = "2026-09-29";

const LAKSHMI = "+919000000105"; // the demo Saathi, based in Yeshwanthpur
const RAMESH = "+919000000101"; // a kabadiwala
const IRFAN = "+919000000107"; // an applicant, not yet approved

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

async function demoWorld() {
  vi.stubEnv("AUTH_DEV_MODE", "true");
  const t = convexTest(schema, modules);
  registerAuth(t);
  await seedDemo(t);
  return t;
}

type Test = Awaited<ReturnType<typeof demoWorld>>;

async function jobId(t: Test, title: string): Promise<Id<"jobs">> {
  const jobs = await t.run(async (ctx) => ctx.db.query("jobs").collect());
  const job = jobs.find((row) => row.title === title);
  if (!job) throw new Error(`No job "${title}"`);
  return job._id;
}

/** An open job posted by the demo kabadiwala, on any day and time. */
async function postJob(
  t: Test,
  date: string,
  window: "morning" | "afternoon" | "evening",
): Promise<Id<"jobs">> {
  return t.run(async (ctx) => {
    const shop = await ctx.db
      .query("orgs")
      .withIndex("by_slug", (q) => q.eq("slug", "ramesh-kabadi-store"))
      .unique();
    return ctx.db.insert("jobs", {
      orgId: shop?._id,
      kind: "home_pickups",
      title: `Extra pickups, ${date} ${window}`,
      area: "Yeshwanthpur",
      date,
      window,
      payPaise: 30_000,
      status: "open",
      createdAt: Date.now(),
    });
  });
}

/** A second approved Saathi, in Peenya. */
async function otherSaathi(t: Test) {
  const ravi = await signIn(t, {
    email: "919000000199@phone.luma.green",
    phoneNumber: "+919000000199",
  });
  const profileId = await ravi.mutation(api.identity.ensureProfile, {
    locale: "en",
  });
  await t.run(async (ctx) => {
    await ctx.db.insert("saathiProfiles", {
      profileId,
      name: "Ravi",
      city: "Bengaluru",
      area: "Peenya",
      radiusKm: 5,
      workTypes: ["yard_sorting"],
      vehicle: "cycle",
      times: ["morning"],
      days: ["mon", "tue"],
      status: "active",
      createdAt: Date.now(),
    });
  });
  return ravi;
}

describe("the Saathi's board", () => {
  it("lists open jobs across the city, their own area first", async () => {
    const t = await demoWorld();
    const lakshmi = await signInAs(t, LAKSHMI);
    const board = await lakshmi.query(api.saathi.board, {});

    expect(board.today).toBe(TODAY);
    expect(board.open.map((job) => [job.area, job.inMyArea])).toEqual([
      ["Yeshwanthpur", true],
      ["Peenya", false],
      ["Malleshwaram", false],
      ["Bommasandra", false],
    ]);
    expect(board.open[0]).toMatchObject({
      title: "Home pickups, 6 houses",
      date: TODAY,
      window: "evening",
      payPaise: 45_000,
      status: "open",
      postedBy: { name: "Ramesh Kabadi Store", kind: "kabadiwala" },
    });
    expect(board.open[3]?.postedBy).toEqual({
      name: "GreenLoop Polymers",
      kind: "recycler",
    });
  });

  it("shows the jobs they've taken, the ones they've finished and their pay", async () => {
    const t = await demoWorld();
    const lakshmi = await signInAs(t, LAKSHMI);
    const board = await lakshmi.query(api.saathi.board, {});

    expect(board.mine).toHaveLength(1);
    expect(board.mine[0]).toMatchObject({
      title: "Home pickups, 4 houses",
      area: "Mathikere",
      date: TODAY,
      status: "assigned",
    });
    expect(board.done.map((job) => [job.title, job.date])).toEqual([
      ["Sorting shift: cartons", shiftDate(TODAY, -2)],
      ["Home pickups, 5 houses", shiftDate(TODAY, -4)],
    ]);
    expect(board.earnings).toEqual({
      totalPaise: 110_000,
      jobsDone: 2,
      weekPaise: 110_000,
      weekJobs: 2,
    });
  });

  it("drops open jobs whose day has passed", async () => {
    const t = await demoWorld();
    await postJob(t, shiftDate(TODAY, -1), "morning");
    const lakshmi = await signInAs(t, LAKSHMI);
    const board = await lakshmi.query(api.saathi.board, {});
    expect(board.open).toHaveLength(4);
  });

  it("is only for Saathis", async () => {
    const t = await demoWorld();
    await expect(t.query(api.saathi.board, {})).rejects.toThrow(
      /NOT_SIGNED_IN/,
    );
    const ramesh = await signInAs(t, RAMESH);
    await expect(ramesh.query(api.saathi.board, {})).rejects.toThrow(
      /NOT_A_SAATHI/,
    );
    const irfan = await signInAs(t, IRFAN);
    await expect(irfan.query(api.saathi.board, {})).rejects.toThrow(
      /NOT_A_SAATHI/,
    );
  });
});

describe("taking a job", () => {
  it("makes an open job theirs alone, on the record", async () => {
    const t = await demoWorld();
    const lakshmi = await signInAs(t, LAKSHMI);
    const ravi = await otherSaathi(t);
    const id = await jobId(t, "Home pickups, 6 houses");

    await lakshmi.mutation(api.saathi.take, { jobId: id });
    const board = await lakshmi.query(api.saathi.board, {});
    expect(board.mine.map((job) => job.id)).toContain(id);
    expect(board.open.map((job) => job.id)).not.toContain(id);

    await expect(ravi.mutation(api.saathi.take, { jobId: id })).rejects.toThrow(
      /JOB_TAKEN/,
    );
    await expect(
      lakshmi.mutation(api.saathi.take, { jobId: id }),
    ).rejects.toThrow(/JOB_TAKEN/);

    const log = await t.run(async (ctx) =>
      ctx.db
        .query("auditLog")
        .withIndex("by_entity", (q) =>
          q.eq("entityTable", "jobs").eq("entityId", id),
        )
        .collect(),
    );
    expect(log.map((row) => row.action)).toEqual(["job.taken"]);
    expect(log[0]?.orgId).toBeDefined();
  });

  it("won't take a job whose day has passed", async () => {
    const t = await demoWorld();
    const lakshmi = await signInAs(t, LAKSHMI);
    const id = await postJob(t, shiftDate(TODAY, -1), "evening");
    await expect(
      lakshmi.mutation(api.saathi.take, { jobId: id }),
    ).rejects.toThrow(/JOB_EXPIRED/);
  });

  it("finds an older assigned job after five hundred newer completed jobs", async () => {
    const t = await demoWorld();
    const lakshmi = await signInAs(t, LAKSHMI);
    const assignedId = await jobId(t, "Home pickups, 4 houses");
    await t.run(async (ctx) => {
      const assigned = await ctx.db.get("jobs", assignedId);
      if (!assigned) throw new Error("Missing assigned job");
      const { _id, _creationTime, ...job } = assigned;
      for (let index = 0; index < 500; index += 1) {
        await ctx.db.insert("jobs", { ...job, status: "done" });
      }
    });
    const id = await postJob(t, TODAY, "morning");
    await expect(
      lakshmi.mutation(api.saathi.take, { jobId: id }),
    ).rejects.toThrow(/SLOT_BUSY/);
    const job = await t.run((ctx) => ctx.db.get("jobs", id));
    expect(job?.status).toBe("open");
    expect(job?.saathiProfileId).toBeUndefined();
  });

  it("won't book two jobs at the same time", async () => {
    const t = await demoWorld();
    const lakshmi = await signInAs(t, LAKSHMI);
    // She already has this morning's pickups in Mathikere.
    const id = await postJob(t, TODAY, "morning");
    await expect(
      lakshmi.mutation(api.saathi.take, { jobId: id }),
    ).rejects.toThrow(/SLOT_BUSY/);
  });

  it("is only for Saathis", async () => {
    const t = await demoWorld();
    const id = await jobId(t, "Home pickups, 6 houses");
    await expect(t.mutation(api.saathi.take, { jobId: id })).rejects.toThrow(
      /NOT_SIGNED_IN/,
    );
    const ramesh = await signInAs(t, RAMESH);
    await expect(
      ramesh.mutation(api.saathi.take, { jobId: id }),
    ).rejects.toThrow(/NOT_A_SAATHI/);
  });
});

describe("finishing a job", () => {
  it("marks today's job done and counts the pay", async () => {
    const t = await demoWorld();
    const lakshmi = await signInAs(t, LAKSHMI);
    const id = await jobId(t, "Home pickups, 4 houses");

    await lakshmi.mutation(api.saathi.finish, { jobId: id });
    const board = await lakshmi.query(api.saathi.board, {});
    expect(board.mine).toEqual([]);
    expect(board.done[0]).toMatchObject({ id, status: "done" });
    expect(board.earnings).toEqual({
      totalPaise: 145_000,
      jobsDone: 3,
      weekPaise: 145_000,
      weekJobs: 3,
    });

    const actions = await t.run(async (ctx) =>
      ctx.db
        .query("auditLog")
        .withIndex("by_entity", (q) =>
          q.eq("entityTable", "jobs").eq("entityId", id),
        )
        .collect(),
    );
    expect(actions.map((row) => row.action)).toEqual(["job.done"]);
  });

  it("only lets the Saathi who took it finish it", async () => {
    const t = await demoWorld();
    const lakshmi = await signInAs(t, LAKSHMI);
    const ravi = await otherSaathi(t);

    const hers = await jobId(t, "Home pickups, 4 houses");
    await expect(
      ravi.mutation(api.saathi.finish, { jobId: hers }),
    ).rejects.toThrow(/NOT_YOUR_JOB/);

    const open = await jobId(t, "Home pickups, 6 houses");
    await expect(
      lakshmi.mutation(api.saathi.finish, { jobId: open }),
    ).rejects.toThrow(/NOT_YOUR_JOB/);
  });

  it("can't finish a job twice, or before its day", async () => {
    const t = await demoWorld();
    const lakshmi = await signInAs(t, LAKSHMI);

    const done = await jobId(t, "Sorting shift: cartons");
    await expect(
      lakshmi.mutation(api.saathi.finish, { jobId: done }),
    ).rejects.toThrow(/ALREADY_DONE/);

    const tomorrow = await jobId(t, "Sorting shift: paper and PET");
    await lakshmi.mutation(api.saathi.take, { jobId: tomorrow });
    await expect(
      lakshmi.mutation(api.saathi.finish, { jobId: tomorrow }),
    ).rejects.toThrow(/TOO_EARLY/);
  });

  it("is only for Saathis", async () => {
    const t = await demoWorld();
    const id = await jobId(t, "Home pickups, 4 houses");
    await expect(t.mutation(api.saathi.finish, { jobId: id })).rejects.toThrow(
      /NOT_SIGNED_IN/,
    );
    const ramesh = await signInAs(t, RAMESH);
    await expect(
      ramesh.mutation(api.saathi.finish, { jobId: id }),
    ).rejects.toThrow(/NOT_A_SAATHI/);
  });
});

describe("earnings", () => {
  it("counts every finished job, and the last 7 days as this week", () => {
    const job = (daysAgo: number, payPaise: number) => ({
      date: shiftDate(TODAY, -daysAgo),
      payPaise,
    });
    expect(
      earningsOf([job(0, 100), job(6, 200), job(7, 400), job(30, 800)], TODAY),
    ).toEqual({ totalPaise: 1500, jobsDone: 4, weekPaise: 300, weekJobs: 2 });
    expect(earningsOf([], TODAY)).toEqual({
      totalPaise: 0,
      jobsDone: 0,
      weekPaise: 0,
      weekJobs: 0,
    });
  });

  it("orders jobs by day, then morning to evening", () => {
    const jobs = [
      { date: "2026-09-30", window: "morning" as const },
      { date: "2026-09-29", window: "evening" as const },
      { date: "2026-09-29", window: "morning" as const },
    ];
    expect(jobs.toSorted(bySchedule)).toEqual([
      { date: "2026-09-29", window: "morning" },
      { date: "2026-09-29", window: "evening" },
      { date: "2026-09-30", window: "morning" },
    ]);
  });
});
