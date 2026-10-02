import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

import { buildManifest, linePaise, orgRef } from "./build";
import {
  canonicalJson,
  coverageReport,
  manifestHash,
  validateManifest,
} from "./validate";

function required<T>(value: T | undefined): T {
  assert.notEqual(value, undefined);
  if (value === undefined) throw new Error("Missing test scenario");
  return value;
}
async function rejectsExample(
  name: string,
  make: () => unknown,
  error: RegExp,
) {
  await test(name, () => {
    assert.match(validateManifest(make()).join("\n"), error);
  });
}
await test("fixed inputs produce identical content and a reproducible SHA-256", () => {
  const one = buildManifest();
  const two = buildManifest();
  assert.deepEqual(validateManifest(one), []);
  assert.equal(canonicalJson(one), canonicalJson(two));
  assert.equal(manifestHash(one), manifestHash(two));
  assert.equal(manifestHash({ b: 2, a: 1 }), manifestHash({ a: 1, b: 2 }));
});
await test("reviewed JSON and coverage report match the generator", async () => {
  const manifest = buildManifest();
  const saved: unknown = JSON.parse(
    await readFile(new URL("manifest.json", import.meta.url), "utf8"),
  );
  const report: unknown = JSON.parse(
    await readFile(new URL("coverage.json", import.meta.url), "utf8"),
  );
  assert.equal(manifestHash(saved), manifestHash(manifest));
  assert.deepEqual(report, coverageReport(manifest));
});
await test("one gram and half-paisa boundaries use exact integer rounding", () => {
  assert.equal(linePaise(1, 100), 0);
  assert.equal(linePaise(499, 1), 0);
  assert.equal(linePaise(500, 1), 1);
  assert.equal(linePaise(1001, 100), 100);
  assert.equal(linePaise(5750, 1100), 6325);
});
await test("all role-family pairs exist and unsupported textiles remain plans", () => {
  const manifest = buildManifest();
  assert.equal(manifest.businesses.length, 48);
  assert.equal(manifest.users.length, 82);
  assert.equal(manifest.materials.length, 26);
  assert.equal(manifest.prices.length, 26 * 30);
  assert.equal(
    manifest.businesses.filter((org) => org.readiness === "pending-schema")
      .length,
    8,
  );
  assert.equal(
    manifest.balances.some((row) => row.materialCode === "OTHER-CLOTHES"),
    false,
  );
  assert.equal(
    manifest.trades.some((row) => row.materialCode === "OTHER-CLOTHES"),
    false,
  );
  assert.equal(coverageReport(manifest).imported, false);
  assert.equal(coverageReport(manifest).productionReady, false);
});
await rejectsExample(
  "missing business owners cannot pass",
  () => {
    const data = buildManifest();
    required(data.businesses[0]).ownerId = "demo:missing";
    return data;
  },
  /Missing owner/u,
);
await rejectsExample(
  "duplicate logical records cannot pass",
  () => {
    const data = buildManifest();
    data.users.push(required(data.users[0]));
    return data;
  },
  /Duplicate logical ID/u,
);
await rejectsExample(
  "unknown materials cannot pass",
  () => {
    const data = buildManifest();
    required(data.materials[0]).code = "UNKNOWN";
    return data;
  },
  /Catalogue code coverage mismatch/u,
);
await rejectsExample(
  "missing price days cannot pass",
  () => {
    const data = buildManifest();
    data.prices.pop();
    return data;
  },
  /Expected 30 fixed price points/u,
);
await rejectsExample(
  "prices below a sample floor cannot pass",
  () => {
    const data = buildManifest();
    required(data.prices[0]).paisePerKg = 1;
    return data;
  },
  /Invalid sample price/u,
);
await rejectsExample(
  "a buyer cannot skip a stage in the recycling chain",
  () => {
    const data = buildManifest();
    required(data.trades[0]).buyerId = orgRef("manufacturer", "paper");
    return data;
  },
  /Invalid chain handoff/u,
);
await rejectsExample(
  "negative stock cannot pass",
  () => {
    const data = buildManifest();
    required(data.balances[0]).grams = -1;
    return data;
  },
  /balances\.0\.grams/u,
);
await rejectsExample(
  "fractional mass cannot pass",
  () => {
    const data = buildManifest();
    required(data.trades[0]).grams = 1.5;
    return data;
  },
  /trades\.0\.grams/u,
);
await rejectsExample(
  "unsafe integer amounts cannot pass",
  () => {
    const data = buildManifest();
    required(data.trades[0]).totalPaise = Number.MAX_SAFE_INTEGER + 1;
    return data;
  },
  /trades\.0\.totalPaise/u,
);
await rejectsExample(
  "trade money must equal its line calculation",
  () => {
    const data = buildManifest();
    required(data.trades[0]).totalPaise += 1;
    return data;
  },
  /Trade total mismatch/u,
);
await rejectsExample(
  "trades cannot skip payment before dispatch",
  () => {
    const data = buildManifest();
    const trade = required(
      data.trades.find((row) => row.status === "dispatched"),
    );
    trade.timeline = trade.timeline.filter(
      (step) => step.status !== "paid_to_escrow",
    );
    return data;
  },
  /Invalid trade transition/u,
);
await rejectsExample(
  "completed receipt amounts must equal measured items",
  () => {
    const data = buildManifest();
    required(
      data.bookings.find((row) => row.status === "completed"),
    ).totalPaise = 1;
    return data;
  },
  /Booking receipt mismatch/u,
);
await rejectsExample(
  "a household booking cannot jump from requested to completed",
  () => {
    const data = buildManifest();
    const booking = required(
      data.bookings.find((row) => row.status === "completed"),
    );
    booking.timeline = booking.timeline.filter((step) =>
      ["requested", "completed"].includes(step.status),
    );
    return data;
  },
  /Invalid booking transition/u,
);
await rejectsExample(
  "a stock dispatch needs its movement",
  () => {
    const data = buildManifest();
    const removed = required(
      data.movements.find((row) => row.reason === "dispatch"),
    );
    data.movements = data.movements.filter((row) => row.id !== removed.id);
    return data;
  },
  /Missing movement/u,
);
await rejectsExample(
  "duplicate movements cannot inflate stock",
  () => {
    const data = buildManifest();
    const move = required(
      data.movements.find((row) => row.reason === "pickup"),
    );
    data.movements.push({ ...move, id: "demo:extra-move" });
    return data;
  },
  /Duplicate movement/u,
);
await rejectsExample(
  "every stock balance must match its movement ledger",
  () => {
    const data = buildManifest();
    required(data.balances[0]).grams += 1;
    return data;
  },
  /Balance does not match movements/u,
);
await rejectsExample(
  "stock reservations cannot be understated",
  () => {
    const data = buildManifest();
    required(data.balances.find((row) => row.reservedGrams > 0)).reservedGrams =
      0;
    return data;
  },
  /Over-reserved or incorrect stock/u,
);
await rejectsExample(
  "job assignment must reference a Saathi",
  () => {
    const data = buildManifest();
    required(data.jobs.find((row) => row.status === "assigned")).workerId =
      "demo:household:01";
    return data;
  },
  /Job assignment mismatch/u,
);
await rejectsExample(
  "yard sorting belongs to a yard",
  () => {
    const data = buildManifest();
    required(data.jobs.find((row) => row.kind === "yard_sorting")).orgId =
      orgRef("kabadiwala", "paper");
    return data;
  },
  /Invalid job organisation/u,
);
await rejectsExample(
  "one worker cannot hold two jobs in the same time window",
  () => {
    const data = buildManifest();
    const assigned = data.jobs.filter((row) => row.status === "assigned");
    required(assigned[1]).workerId = required(assigned[0]).workerId;
    return data;
  },
  /Worker double-booked/u,
);
await rejectsExample(
  "review cannot approve an unsubmitted application",
  () => {
    const data = buildManifest();
    const application = required(
      data.applications.find((row) => row.status === "approved"),
    );
    application.timeline = application.timeline.filter(
      (step) => step.status !== "submitted",
    );
    return data;
  },
  /Invalid application transition/u,
);
await rejectsExample(
  "snapshot versions must match the application",
  () => {
    const data = buildManifest();
    required(data.snapshots[0]).version += 1;
    return data;
  },
  /Snapshot owner\/version mismatch/u,
);
await rejectsExample(
  "a snapshot cannot reference another applicant's document",
  () => {
    const data = buildManifest();
    const snapshot = required(data.snapshots[0]);
    const foreign = required(
      data.documentPlans.find(
        (row) => row.applicationId !== snapshot.applicationId,
      ),
    );
    snapshot.documentPlanIds.push(foreign.id);
    return data;
  },
  /Document ownership mismatch/u,
);
await rejectsExample(
  "a snapshot cannot repeat the same document",
  () => {
    const data = buildManifest();
    const snapshot = required(
      data.snapshots.find((row) => row.documentPlanIds.length > 0),
    );
    snapshot.documentPlanIds.push(required(snapshot.documentPlanIds[0]));
    return data;
  },
  /Duplicate snapshot document/u,
);
await rejectsExample(
  "timelines must be strictly ordered",
  () => {
    const data = buildManifest();
    const path = required(
      data.trades.find((row) => row.status === "completed"),
    ).timeline;
    required(path[1]).at = required(path[0]).at;
    return data;
  },
  /Timeline order/u,
);
await rejectsExample(
  "coverage gaps cannot disappear from the review manifest",
  () => {
    const data = buildManifest();
    data.gaps = data.gaps.filter((gap) => gap.id !== "deployment-isolation");
    return data;
  },
  /Missing required pending-coverage gap/u,
);
await rejectsExample(
  "all external services remain disabled",
  () => {
    const data = buildManifest();
    return { ...data, sideEffects: { ...data.sideEffects, sms: true } };
  },
  /sideEffects\.sms/u,
);
await rejectsExample(
  "deployment targeting is not part of an offline manifest",
  () => ({ ...buildManifest(), deployment: "production" }),
  /deployment/u,
);
await rejectsExample(
  "phone numbers and credentials are not accepted user fields",
  () => {
    const data = buildManifest();
    return {
      ...data,
      users: [
        {
          ...required(data.users[0]),
          phone: "forbidden",
          password: "forbidden",
        },
        ...data.users.slice(1),
      ],
    };
  },
  /Unrecognized keys/u,
);

await rejectsExample(
  "tracking references must be unique",
  () => {
    const data = buildManifest();
    required(data.bookings[1]).trackingRef = required(
      data.bookings[0],
    ).trackingRef;
    return data;
  },
  /Duplicate logical ID/u,
);
await rejectsExample(
  "open listings need an existing stock balance",
  () => {
    const data = buildManifest();
    const listing = required(
      data.listings.find(
        (row) =>
          row.status === "withdrawn" &&
          row.orgId === orgRef("kabadiwala", "paper"),
      ),
    );
    listing.status = "open";
    listing.orgId = orgRef("kabadiwala", "plastic", 2);
    listing.materialCode = "PLASTIC-PET";
    return data;
  },
  /Listing has no stock balance/u,
);
