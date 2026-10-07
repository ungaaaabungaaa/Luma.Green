/// <reference types="vite/client" />
// @vitest-environment edge-runtime
import { convexTest } from "convex-test";
import { afterEach, expect, it, vi } from "vitest";

import { api } from "./_generated/api";
import {
  convexModules,
  registerAuth,
  seedDemo,
  signIn,
} from "./lib/auth.testing";
import schema from "./schema";

const modules = convexModules(import.meta.glob("./**/*.*s"));
const paginationOpts = { cursor: null, numItems: 20 };
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

async function world(hasTwoFactor = true) {
  vi.stubEnv("AUTH_DEV_MODE", "true");
  vi.stubEnv("ADMIN_EMAIL", "admin@example.test");
  vi.stubEnv("CASHFREE_MODE", "off");
  const t = convexTest(schema, modules);
  registerAuth(t);
  await seedDemo(t);
  const admin = await signIn(t, {
    email: "admin@example.test",
    twoFactorEnabled: hasTwoFactor,
  });
  const orgs = await t.run((ctx) => ctx.db.query("orgs").take(2));
  const first = orgs.at(0);
  const second = orgs.at(1);
  if (!first || !second) throw new Error("Missing test businesses");
  return { t, admin, first, second };
}

it("requires the configured admin and TOTP for vendor reads and writes", async () => {
  const { t, admin: noFactor, first } = await world(false);
  const member = await signIn(t, {
    email: "member@example.test",
    twoFactorEnabled: true,
  });
  for (const client of [t, member, noFactor]) {
    await expect(
      client.query(api.cashfreePayments.vendorsForAdmin, { paginationOpts }),
    ).rejects.toThrow();
    await expect(
      client.query(api.cashfreePayments.setupConfigurationForAdmin, {}),
    ).rejects.toThrow();
    await expect(
      client.mutation(api.cashfreePayments.registerVendorForAdmin, {
        orgId: first._id,
        mode: "sandbox",
        vendorId: "test_vendor",
      }),
    ).rejects.toThrow();
    await expect(
      client.action(api.cashfreeActions.verifyVendorForAdmin, {
        orgId: first._id,
        mode: "sandbox",
      }),
    ).rejects.toThrow();
  }
  expect(
    await t.run((ctx) => ctx.db.query("cashfreeVendors").collect()),
  ).toHaveLength(0);
});

it("records an unverified immutable reference and audits the admin without payment side effects", async () => {
  const { t, admin, first, second } = await world();
  const snapshot = () =>
    t.run(async (ctx) => ({
      stock: await ctx.db.query("inventory").collect(),
      trades: await ctx.db.query("trades").collect(),
      orders: await ctx.db.query("cashfreeOrders").collect(),
    }));
  const before = await snapshot();
  const args = {
    orgId: first._id,
    mode: "sandbox" as const,
    vendorId: "test_vendor",
  };
  await admin.mutation(api.cashfreePayments.registerVendorForAdmin, args);
  await admin.mutation(api.cashfreePayments.registerVendorForAdmin, args);
  await expect(
    admin.mutation(api.cashfreePayments.registerVendorForAdmin, {
      ...args,
      vendorId: "replacement",
    }),
  ).rejects.toThrow("VENDOR_MAPPING_FROZEN");
  await expect(
    admin.mutation(api.cashfreePayments.registerVendorForAdmin, {
      ...args,
      orgId: second._id,
    }),
  ).rejects.toThrow("VENDOR_MAPPING_FROZEN");
  expect(await snapshot()).toEqual(before);
  const rows = await t.run((ctx) => ctx.db.query("cashfreeVendors").collect());
  expect(rows).toHaveLength(1);
  expect(rows[0]).toMatchObject({ providerStatus: "UNVERIFIED", checkedAt: 0 });
  const audit = await t.run((ctx) => ctx.db.query("auditLog").collect());
  const recorded = audit.filter(
    (row) => row.action === "payment.vendor.admin_registered",
  );
  expect(recorded).toHaveLength(1);
  expect(recorded[0]?.metadata).toMatchObject({
    mode: "sandbox",
    adminUserId: expect.any(String),
  });
  const view = await admin.query(api.cashfreePayments.vendorsForAdmin, {
    paginationOpts,
  });
  expect(view.page.find((org) => org.orgId === first._id)?.vendors).toEqual([
    {
      mode: "sandbox",
      vendorId: "test_vendor",
      providerStatus: "UNVERIFIED",
      checkedAt: 0,
    },
  ]);
});

it("rejects suspended businesses and malformed references without creating a mapping", async () => {
  const { t, admin, first } = await world();
  await expect(
    admin.mutation(api.cashfreePayments.registerVendorForAdmin, {
      orgId: first._id,
      mode: "sandbox",
      vendorId: "https://wrong.example",
    }),
  ).rejects.toThrow("INVALID_VENDOR");
  await t.run((ctx) =>
    ctx.db.patch("orgs", first._id, { status: "suspended" }),
  );
  await expect(
    admin.mutation(api.cashfreePayments.registerVendorForAdmin, {
      orgId: first._id,
      mode: "sandbox",
      vendorId: "test_vendor",
    }),
  ).rejects.toThrow("NO_BUSINESS");
  expect(
    await t.run((ctx) => ctx.db.query("cashfreeVendors").collect()),
  ).toHaveLength(0);
});

it("does not contact a provider without matching configured credentials", async () => {
  const { admin, first } = await world();
  const fetcher = vi.fn();
  vi.stubGlobal("fetch", fetcher);
  await admin.mutation(api.cashfreePayments.registerVendorForAdmin, {
    orgId: first._id,
    mode: "sandbox",
    vendorId: "test_vendor",
  });
  expect(
    await admin.query(api.cashfreePayments.setupConfigurationForAdmin, {}),
  ).toEqual({ mode: null, sandboxCheckout: false });
  await expect(
    admin.action(api.cashfreeActions.verifyVendorForAdmin, {
      orgId: first._id,
      mode: "sandbox",
    }),
  ).rejects.toThrow("GATEWAY_REQUIRED");
  expect(fetcher).not.toHaveBeenCalled();
});

it("rejects provider lookup for a suspended business on the server", async () => {
  const { t, admin, first } = await world();
  const fetcher = vi.fn();
  vi.stubGlobal("fetch", fetcher);
  await admin.mutation(api.cashfreePayments.registerVendorForAdmin, {
    orgId: first._id,
    mode: "sandbox",
    vendorId: "test_vendor",
  });
  await t.run((ctx) =>
    ctx.db.patch("orgs", first._id, { status: "suspended" }),
  );
  await expect(
    admin.action(api.cashfreeActions.verifyVendorForAdmin, {
      orgId: first._id,
      mode: "sandbox",
    }),
  ).rejects.toThrow("NO_BUSINESS");
  expect(fetcher).not.toHaveBeenCalled();
});

it("updates status only from a matching provider read and keeps live activation separate", async () => {
  const { t, admin, first } = await world();
  vi.stubEnv("CASHFREE_MODE", "sandbox");
  vi.stubEnv("CASHFREE_SANDBOX_CLIENT_ID", "test-id");
  vi.stubEnv("CASHFREE_SANDBOX_CLIENT_SECRET", "test-secret");
  const fetcher = vi
    .fn()
    .mockResolvedValue(
      Response.json(
        { vendor_id: "test_vendor", status: "ACTIVE" },
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
  vi.stubGlobal("fetch", fetcher);
  await admin.mutation(api.cashfreePayments.registerVendorForAdmin, {
    orgId: first._id,
    mode: "sandbox",
    vendorId: "test_vendor",
  });
  await admin.action(api.cashfreeActions.verifyVendorForAdmin, {
    orgId: first._id,
    mode: "sandbox",
  });
  expect(fetcher).toHaveBeenCalledTimes(1);
  expect(String(fetcher.mock.calls[0]?.[0])).toBe(
    "https://sandbox.cashfree.com/pg/easy-split/vendors/test_vendor",
  );
  const rows = await t.run((ctx) => ctx.db.query("cashfreeVendors").collect());
  expect(rows[0]).toMatchObject({ providerStatus: "ACTIVE" });
  expect(rows[0]?.checkedAt).toBeGreaterThan(0);
  expect(
    await t.run((ctx) => ctx.db.query("cashfreeOrders").collect()),
  ).toHaveLength(0);
  expect(
    await admin.query(api.cashfreePayments.setupConfigurationForAdmin, {}),
  ).toEqual({ mode: "sandbox", sandboxCheckout: false });
});
