/// <reference types="vite/client" />
// @vitest-environment edge-runtime
import { convexTest } from "convex-test";
import { afterEach, describe, expect, it, vi } from "vitest";

import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { convexModules, registerAuth, signIn } from "./lib/auth.testing";
import schema from "./schema";

const modules = convexModules(import.meta.glob("./**/*.*s"));
const ADMIN_EMAIL = "messaging-admin@luma.test";
const PAGE = { numItems: 50, cursor: null };

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

async function world({ adminTwoFactor = true } = {}) {
  vi.stubEnv("ADMIN_EMAIL", ADMIN_EMAIL);
  const t = convexTest(schema, modules);
  registerAuth(t);
  const owner = await signIn(t, { email: "owner@luma.test" });
  const buyer = await signIn(t, { email: "buyer@luma.test" });
  const other = await signIn(t, { email: "other@luma.test" });
  const admin = await signIn(t, {
    email: ADMIN_EMAIL,
    twoFactorEnabled: adminTwoFactor,
  });
  const ownerProfileId = await owner.mutation(api.identity.ensureProfile, {
    locale: "en",
  });
  const buyerProfileId = await buyer.mutation(api.identity.ensureProfile, {
    locale: "en",
  });
  await other.mutation(api.identity.ensureProfile, { locale: "en" });
  await admin.mutation(api.identity.ensureProfile, { locale: "en" });
  const trade = await t.run(async (ctx) => {
    const now = Date.now();
    const common = {
      status: "active" as const,
      city: "Bengaluru",
      area: "Peenya",
      address: "Test address",
      phones: [],
      weeklyOff: [],
      families: ["paper" as const],
      offersPickup: false,
      createdAt: now,
      updatedAt: now,
    };
    const sellerOrgId = await ctx.db.insert("orgs", {
      ...common,
      kind: "kabadiwala",
      name: "Demo Scrap Shop",
      slug: "demo-shop",
    });
    const buyerOrgId = await ctx.db.insert("orgs", {
      ...common,
      kind: "yard",
      name: "Demo Sorting Yard",
      slug: "demo-yard",
    });
    const sellerMembershipId = await ctx.db.insert("memberships", {
      profileId: ownerProfileId,
      orgId: sellerOrgId,
      role: "owner",
      createdAt: now,
    });
    await ctx.db.insert("memberships", {
      profileId: buyerProfileId,
      orgId: buyerOrgId,
      role: "staff",
      createdAt: now,
    });
    const listingId = await ctx.db.insert("listings", {
      orgId: sellerOrgId,
      sellerKind: "kabadiwala",
      materialCode: "PAPER-NEWS",
      grams: 10_000,
      askPaisePerKg: 1500,
      city: "Bengaluru",
      status: "open",
      createdAt: now,
      updatedAt: now,
    });
    const tradeId = await ctx.db.insert("trades", {
      listingId,
      sellerOrgId,
      buyerOrgId,
      materialCode: "PAPER-NEWS",
      grams: 10_000,
      paisePerKg: 1500,
      totalPaise: 15_000,
      status: "requested",
      timeline: [{ status: "requested", at: now }],
      createdAt: now,
      updatedAt: now,
    });
    return { tradeId, sellerOrgId, buyerOrgId, sellerMembershipId };
  });
  return { t, owner, buyer, other, admin, ownerProfileId, ...trade };
}

type World = Awaited<ReturnType<typeof world>>;

async function transcript(
  as: World["owner"],
  conversationId: Id<"conversations">,
) {
  return as.query(api.messaging.listMessages, {
    conversationId,
    paginationOpts: PAGE,
  });
}

describe("support conversations", () => {
  it("connects one member to the admin and keeps the transcript out of other accounts", async () => {
    const { t, owner, admin, other } = await world();
    const conversationId = await owner.mutation(api.messaging.openSupport, {
      subject: "  Pickup help  ",
    });
    expect(
      await owner.mutation(api.messaging.openSupport, {
        subject: "Same open thread",
      }),
    ).toBe(conversationId);
    const messageId = await owner.mutation(api.messaging.send, {
      conversationId,
      body: " Please check my pickup. ",
    });
    await admin.mutation(api.messaging.send, {
      conversationId,
      body: "We will check the request.",
    });
    const mine = await owner.query(api.messaging.listMine, {});
    expect(mine).toHaveLength(1);
    expect(mine[0]).toMatchObject({
      id: conversationId,
      subject: "Pickup help",
      kind: "support",
      status: "open",
    });
    const supportQueue = await admin.query(api.messaging.listSupport, {
      status: "open",
      paginationOpts: PAGE,
    });
    expect(supportQueue.page[0]?.id).toBe(conversationId);
    const history = await transcript(owner, conversationId);
    expect(history.page).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: messageId,
          body: "Please check my pickup.",
          isMine: true,
          senderRole: "member",
        }),
        expect.objectContaining({
          body: "We will check the request.",
          isMine: false,
          senderRole: "admin",
        }),
      ]),
    );
    expect(await other.query(api.messaging.listMine, {})).toEqual([]);
    await expect(
      other.query(api.messaging.get, { conversationId }),
    ).rejects.toThrow(/MESSAGE_ACCESS_DENIED/);
    await expect(transcript(other, conversationId)).rejects.toThrow(
      /MESSAGE_ACCESS_DENIED/,
    );
    await expect(
      other.mutation(api.messaging.send, { conversationId, body: "Intrusion" }),
    ).rejects.toThrow(/MESSAGE_ACCESS_DENIED/);
    await expect(
      other.mutation(api.messaging.setSupportStatus, {
        conversationId,
        status: "closed",
      }),
    ).rejects.toThrow(/MESSAGE_ACCESS_DENIED/);
    const audit = await t.run(async (ctx) =>
      ctx.db
        .query("auditLog")
        .withIndex("by_entity", (q) =>
          q.eq("entityTable", "conversations").eq("entityId", conversationId),
        )
        .collect(),
    );
    expect(audit.map((row) => row.action)).toEqual([
      "conversation.created",
      "conversation.messageSent",
      "conversation.messageSent",
    ]);
    expect(JSON.stringify(audit)).not.toContain("Please check my pickup");
    expect(JSON.stringify(audit)).not.toContain("Pickup help");
  });

  it("closes and reopens the same thread without rewriting message history", async () => {
    const { t, owner, admin } = await world();
    const conversationId = await owner.mutation(api.messaging.openSupport, {
      subject: "Pickup help",
    });
    await owner.mutation(api.messaging.send, {
      conversationId,
      body: "A saved message",
    });
    await admin.mutation(api.messaging.setSupportStatus, {
      conversationId,
      status: "closed",
    });
    await admin.mutation(api.messaging.setSupportStatus, {
      conversationId,
      status: "closed",
    });
    await expect(
      owner.mutation(api.messaging.send, { conversationId, body: "Wait" }),
    ).rejects.toThrow(/CONVERSATION_CLOSED/);
    const openQueue = await admin.query(api.messaging.listSupport, {
      status: "open",
      paginationOpts: PAGE,
    });
    expect(openQueue.page).toEqual([]);
    const closedQueue = await admin.query(api.messaging.listSupport, {
      status: "closed",
      paginationOpts: PAGE,
    });
    expect(closedQueue.page).toHaveLength(1);
    expect(
      await owner.mutation(api.messaging.openSupport, { subject: "More help" }),
    ).toBe(conversationId);
    await owner.mutation(api.messaging.setSupportStatus, {
      conversationId,
      status: "closed",
    });
    await owner.mutation(api.messaging.setSupportStatus, {
      conversationId,
      status: "open",
    });
    const history = await transcript(owner, conversationId);
    expect(history.page[0]?.body).toBe("A saved message");
    const audits = await t.run(async (ctx) =>
      ctx.db
        .query("auditLog")
        .withIndex("by_entity", (q) =>
          q.eq("entityTable", "conversations").eq("entityId", conversationId),
        )
        .collect(),
    );
    expect(audits.map((row) => row.action)).toEqual([
      "conversation.created",
      "conversation.messageSent",
      "conversation.closed",
      "conversation.reopened",
      "conversation.closed",
      "conversation.reopened",
    ]);
  });

  it("requires a live session and a profile", async () => {
    const { t, owner } = await world();
    const conversationId = await owner.mutation(api.messaging.openSupport, {
      subject: "Account help",
    });
    await expect(t.query(api.messaging.listMine, {})).rejects.toThrow(
      /NOT_SIGNED_IN/,
    );
    await expect(
      t.mutation(api.messaging.openSupport, { subject: "Account help" }),
    ).rejects.toThrow(/NOT_SIGNED_IN/);
    await expect(transcript(t, conversationId)).rejects.toThrow(
      /NOT_SIGNED_IN/,
    );
    const noProfile = await signIn(t, { email: "no-profile@luma.test" });
    await expect(
      noProfile.mutation(api.messaging.openSupport, {
        subject: "Account help",
      }),
    ).rejects.toThrow(/NO_PROFILE/);
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(Date.now() + 3_600_001);
    await expect(transcript(owner, conversationId)).rejects.toThrow(
      /NOT_SIGNED_IN/,
    );
    await expect(
      owner.mutation(api.messaging.send, {
        conversationId,
        body: "Expired session",
      }),
    ).rejects.toThrow(/NOT_SIGNED_IN/);
  });

  it("requires the admin's second factor for the queue, read, reply and status change", async () => {
    const {
      owner,
      other,
      admin: unverified,
    } = await world({ adminTwoFactor: false });
    const conversationId = await owner.mutation(api.messaging.openSupport, {
      subject: "Account help",
    });
    await expect(
      unverified.query(api.messaging.listSupport, {
        status: "open",
        paginationOpts: PAGE,
      }),
    ).rejects.toThrow(/TWO_FACTOR_REQUIRED/);
    await expect(transcript(unverified, conversationId)).rejects.toThrow(
      /TWO_FACTOR_REQUIRED/,
    );
    await expect(
      unverified.mutation(api.messaging.send, {
        conversationId,
        body: "Cannot reply",
      }),
    ).rejects.toThrow(/TWO_FACTOR_REQUIRED/);
    await expect(
      unverified.mutation(api.messaging.setSupportStatus, {
        conversationId,
        status: "closed",
      }),
    ).rejects.toThrow(/TWO_FACTOR_REQUIRED/);
    await expect(
      other.query(api.messaging.listSupport, {
        status: "open",
        paginationOpts: PAGE,
      }),
    ).rejects.toThrow(/NOT_ADMIN/);
  });
});

describe("private trade conversations", () => {
  it("reuses the trade context for both businesses and identifies each sender's business", async () => {
    const { owner, buyer, admin, tradeId } = await world();
    const conversationId = await owner.mutation(api.messaging.openTrade, {
      tradeId,
    });
    expect(await buyer.mutation(api.messaging.openTrade, { tradeId })).toBe(
      conversationId,
    );
    await owner.mutation(api.messaging.send, {
      conversationId,
      body: "The bales are dry.",
    });
    await buyer.mutation(api.messaging.send, {
      conversationId,
      body: "Please confirm the dispatch date.",
    });
    const ownerThreads = await owner.query(api.messaging.listMine, {});
    const buyerThreads = await buyer.query(api.messaging.listMine, {});
    expect(ownerThreads[0]).toMatchObject({
      id: conversationId,
      counterpartyName: "Demo Sorting Yard",
    });
    expect(buyerThreads[0]).toMatchObject({
      id: conversationId,
      counterpartyName: "Demo Scrap Shop",
    });
    const history = await transcript(buyer, conversationId);
    expect(history.page).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          senderOrgName: "Demo Scrap Shop",
          isMine: false,
        }),
        expect.objectContaining({
          senderOrgName: "Demo Sorting Yard",
          isMine: true,
        }),
      ]),
    );
    const openQueue = await admin.query(api.messaging.listSupport, {
      status: "open",
      paginationOpts: PAGE,
    });
    expect(openQueue.page).toEqual([]);
    await expect(
      owner.mutation(api.messaging.setSupportStatus, {
        conversationId,
        status: "closed",
      }),
    ).rejects.toThrow(/NOT_A_SUPPORT_CONVERSATION/);
  });

  it("sends as the selected buyer when the same person can only view the seller", async () => {
    const {
      t,
      owner,
      ownerProfileId,
      tradeId,
      sellerMembershipId,
      buyerOrgId,
    } = await world();
    await t.run(async (ctx) => {
      await ctx.db.patch("memberships", sellerMembershipId, { role: "viewer" });
      await ctx.db.insert("memberships", {
        profileId: ownerProfileId,
        orgId: buyerOrgId,
        role: "member",
        createdAt: Date.now(),
      });
    });
    await owner.mutation(api.workspace.select, { orgId: buyerOrgId });
    const conversationId = await owner.mutation(api.messaging.openTrade, {
      tradeId,
    });
    const messageId = await owner.mutation(api.messaging.send, {
      conversationId,
      body: "Buyer confirmation",
    });
    const message = await t.run(async (ctx) =>
      ctx.db.get("conversationMessages", messageId),
    );
    expect(message?.senderOrgId).toBe(buyerOrgId);
    const history = await transcript(owner, conversationId);
    expect(history.page[0]?.senderOrgName).toBe("Demo Sorting Yard");
  });

  it("does not borrow seller ownership when the selected buyer membership is read-only", async () => {
    const { t, owner, buyer, ownerProfileId, tradeId, buyerOrgId } =
      await world();
    const conversationId = await buyer.mutation(api.messaging.openTrade, {
      tradeId,
    });
    const membershipId = await t.run(async (ctx) =>
      ctx.db.insert("memberships", {
        profileId: ownerProfileId,
        orgId: buyerOrgId,
        role: "member",
        createdAt: Date.now(),
      }),
    );
    await owner.mutation(api.workspace.select, { orgId: buyerOrgId });
    await owner.mutation(api.messaging.send, {
      conversationId,
      body: "Before role change",
    });
    await t.run(async (ctx) =>
      ctx.db.patch("memberships", membershipId, { role: "viewer" }),
    );
    const history = await transcript(owner, conversationId);
    const threads = await owner.query(api.messaging.listMine, {});
    expect(history.page).toHaveLength(1);
    expect(threads.map((thread) => thread.id)).toContain(conversationId);
    await expect(
      owner.mutation(api.messaging.openTrade, { tradeId }),
    ).rejects.toThrow(/WORKSPACE_PERMISSION_DENIED/);
    await expect(
      owner.mutation(api.messaging.send, {
        conversationId,
        body: "After role change",
      }),
    ).rejects.toThrow(/WORKSPACE_PERMISSION_DENIED/);
    const unchanged = await transcript(owner, conversationId);
    expect(unchanged.page).toHaveLength(1);
  });

  it.each(["removed", "suspended", "unrelated"])(
    "fails closed for a %s selected workspace even with another valid trade membership",
    async (state) => {
      const { t, owner, ownerProfileId, tradeId, sellerOrgId, buyerOrgId } =
        await world();
      const conversationId = await owner.mutation(api.messaging.openTrade, {
        tradeId,
      });
      const membershipId = await t.run(async (ctx) =>
        ctx.db.insert("memberships", {
          profileId: ownerProfileId,
          orgId: buyerOrgId,
          role: "member",
          createdAt: Date.now(),
        }),
      );
      await owner.mutation(api.workspace.select, { orgId: buyerOrgId });
      await t.run(async (ctx) => {
        if (state === "removed")
          await ctx.db.delete("memberships", membershipId);
        else if (state === "suspended")
          await ctx.db.patch("orgs", buyerOrgId, { status: "suspended" });
        else {
          const selectedOrg = await ctx.db.insert("orgs", {
            kind: "yard",
            status: "active",
            name: "Unrelated workspace",
            slug: "unrelated",
            city: "Bengaluru",
            area: "Peenya",
            address: "Test address",
            phones: [],
            weeklyOff: [],
            families: ["paper"],
            offersPickup: false,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });
          await ctx.db.insert("memberships", {
            profileId: ownerProfileId,
            orgId: selectedOrg,
            role: "owner",
            createdAt: Date.now(),
          });
          await ctx.db.patch("profiles", ownerProfileId, {
            activeOrgId: selectedOrg,
          });
        }
      });
      await expect(
        owner.mutation(api.messaging.openTrade, { tradeId }),
      ).rejects.toThrow(/MESSAGE_ACCESS_DENIED/);
      await expect(
        owner.query(api.messaging.get, { conversationId }),
      ).rejects.toThrow(/MESSAGE_ACCESS_DENIED/);
      await expect(transcript(owner, conversationId)).rejects.toThrow(
        /MESSAGE_ACCESS_DENIED/,
      );
      await expect(
        owner.mutation(api.messaging.send, {
          conversationId,
          body: "Wrong workspace",
        }),
      ).rejects.toThrow(/MESSAGE_ACCESS_DENIED/);
      await owner.mutation(api.workspace.select, { orgId: sellerOrgId });
      await owner.mutation(api.messaging.send, {
        conversationId,
        body: "Selected seller",
      });
      const history = await transcript(owner, conversationId);
      expect(history.page).toHaveLength(1);
    },
  );

  it.each(["member", "viewer"] as const)(
    "limits inbox summaries to a live %s membership and removes them on revocation",
    async (role) => {
      const { t, owner, buyer, tradeId, sellerMembershipId } = await world();
      const conversationId = await buyer.mutation(api.messaging.openTrade, {
        tradeId,
      });
      await t.run(async (ctx) =>
        ctx.db.patch("memberships", sellerMembershipId, { role }),
      );
      const threads = await owner.query(api.messaging.listMine, {});
      expect(threads.map((thread) => thread.id)).toEqual([conversationId]);
      expect(
        await owner.query(api.messaging.get, { conversationId }),
      ).toMatchObject({ id: conversationId });
      await t.run(async (ctx) =>
        ctx.db.delete("memberships", sellerMembershipId),
      );
      expect(await owner.query(api.messaging.listMine, {})).toEqual([]);
      await expect(
        owner.query(api.messaging.get, { conversationId }),
      ).rejects.toThrow(/MESSAGE_ACCESS_DENIED/);
    },
  );

  it("denies unrelated members and the admin even when they know the trade or thread ID", async () => {
    const { owner, other, admin, tradeId } = await world();
    const conversationId = await owner.mutation(api.messaging.openTrade, {
      tradeId,
    });
    for (const stranger of [other, admin]) {
      await expect(
        stranger.mutation(api.messaging.openTrade, { tradeId }),
      ).rejects.toThrow(/MESSAGE_ACCESS_DENIED/);
      await expect(
        stranger.query(api.messaging.get, { conversationId }),
      ).rejects.toThrow(/MESSAGE_ACCESS_DENIED/);
      await expect(transcript(stranger, conversationId)).rejects.toThrow(
        /MESSAGE_ACCESS_DENIED/,
      );
      await expect(
        stranger.mutation(api.messaging.send, {
          conversationId,
          body: "Not a party",
        }),
      ).rejects.toThrow(/MESSAGE_ACCESS_DENIED/);
    }
  });

  it("removes read and write access immediately when a business is suspended", async () => {
    const { t, owner, buyer, tradeId, sellerOrgId } = await world();
    const conversationId = await owner.mutation(api.messaging.openTrade, {
      tradeId,
    });
    await t.run(async (ctx) =>
      ctx.db.patch("orgs", sellerOrgId, { status: "suspended" }),
    );
    expect(await owner.query(api.messaging.listMine, {})).toEqual([]);
    await expect(transcript(owner, conversationId)).rejects.toThrow(
      /MESSAGE_ACCESS_DENIED/,
    );
    await expect(
      owner.mutation(api.messaging.openTrade, { tradeId }),
    ).rejects.toThrow(/MESSAGE_ACCESS_DENIED/);
    await expect(
      owner.mutation(api.messaging.send, {
        conversationId,
        body: "Not permitted",
      }),
    ).rejects.toThrow(/MESSAGE_ACCESS_DENIED/);
    const buyerConversation = await buyer.query(api.messaging.get, {
      conversationId,
    });
    expect(buyerConversation.id).toBe(conversationId);
    // A suspended business can still ask the platform for help.
    expect(
      await owner.mutation(api.messaging.openSupport, {
        subject: "Suspension help",
      }),
    ).toBeTruthy();
  });

  it("removes access when membership is revoked and ignores copied org IDs if the source trade changes", async () => {
    const { t, owner, buyer, tradeId, sellerMembershipId, sellerOrgId } =
      await world();
    const conversationId = await owner.mutation(api.messaging.openTrade, {
      tradeId,
    });
    await t.run(async (ctx) =>
      ctx.db.delete("memberships", sellerMembershipId),
    );
    expect(await owner.query(api.messaging.listMine, {})).toEqual([]);
    await expect(transcript(owner, conversationId)).rejects.toThrow(
      /MESSAGE_ACCESS_DENIED/,
    );
    await expect(
      owner.mutation(api.messaging.send, {
        conversationId,
        body: "Not permitted",
      }),
    ).rejects.toThrow(/MESSAGE_ACCESS_DENIED/);
    await t.run(async (ctx) =>
      ctx.db.patch("trades", tradeId, { buyerOrgId: sellerOrgId }),
    );
    expect(await buyer.query(api.messaging.listMine, {})).toEqual([]);
    await expect(transcript(buyer, conversationId)).rejects.toThrow(
      /MESSAGE_ACCESS_DENIED/,
    );
  });
});

describe("bounded text and message history", () => {
  it("validates subject and body sizes and stores HTML-looking input as plain text", async () => {
    const { owner } = await world();
    for (const subject of [" ", "ab", "a".repeat(121)]) {
      await expect(
        owner.mutation(api.messaging.openSupport, { subject }),
      ).rejects.toThrow(/INVALID_SUBJECT/);
    }
    const conversationId = await owner.mutation(api.messaging.openSupport, {
      subject: "a".repeat(120),
    });
    for (const body of [" \n ", "a".repeat(2001)]) {
      await expect(
        owner.mutation(api.messaging.send, { conversationId, body }),
      ).rejects.toThrow(/INVALID_MESSAGE/);
    }
    await owner.mutation(api.messaging.send, {
      conversationId,
      body: "a".repeat(2000),
    });
    await owner.mutation(api.messaging.send, {
      conversationId,
      body: "<b>नमस्ते</b> مرحبا",
    });
    const history = await transcript(owner, conversationId);
    expect(history.page.map((row) => row.body)).toContain(
      "<b>नमस्ते</b> مرحبا",
    );
  });

  it("throttles the sender across support and trade threads and permits sends after the rolling window", async () => {
    const { owner, buyer, tradeId } = await world();
    const supportId = await owner.mutation(api.messaging.openSupport, {
      subject: "Rate limit test",
    });
    const tradeConversationId = await owner.mutation(api.messaging.openTrade, {
      tradeId,
    });
    for (let index = 0; index < 12; index += 1) {
      await owner.mutation(api.messaging.send, {
        conversationId: supportId,
        body: `Message ${String(index)}`,
      });
    }
    await expect(
      owner.mutation(api.messaging.send, {
        conversationId: tradeConversationId,
        body: "Thirteenth message",
      }),
    ).rejects.toThrow(/MESSAGE_RATE_LIMITED/);
    await buyer.mutation(api.messaging.send, {
      conversationId: tradeConversationId,
      body: "Other sender is independent",
    });
    vi.spyOn(Date, "now").mockReturnValue(Date.now() + 60_001);
    await owner.mutation(api.messaging.send, {
      conversationId: tradeConversationId,
      body: "Window has passed",
    });
    const history = await transcript(owner, supportId);
    expect(history.page).toHaveLength(12);
  });

  it("pages through immutable history without dropping messages with the same timestamp", async () => {
    const { t, owner, ownerProfileId } = await world();
    const conversationId = await owner.mutation(api.messaging.openSupport, {
      subject: "Long history",
    });
    await t.run(async (ctx) => {
      for (let index = 0; index < 55; index += 1) {
        await ctx.db.insert("conversationMessages", {
          conversationId,
          senderProfileId: ownerProfileId,
          senderRole: "member",
          body: `Message ${String(index)}`,
          createdAt: Date.now(),
        });
      }
    });
    const first = await owner.query(api.messaging.listMessages, {
      conversationId,
      paginationOpts: { numItems: 1000, cursor: null },
    });
    expect(first.page).toHaveLength(50);
    expect(first.isDone).toBe(false);
    const second = await owner.query(api.messaging.listMessages, {
      conversationId,
      paginationOpts: { numItems: 50, cursor: first.continueCursor },
    });
    expect(second.isDone).toBe(true);
    expect(
      new Set([...first.page, ...second.page].map((row) => row.id)).size,
    ).toBe(55);
    await expect(
      owner.query(api.messaging.listMessages, {
        conversationId,
        paginationOpts: { numItems: 0, cursor: null },
      }),
    ).rejects.toThrow(/INVALID_PAGE_SIZE/);
  });
});

describe("conversation discovery and reactive pages", () => {
  it("pages through every support ticket with the longest waiting open ticket first", async () => {
    const { t, admin } = await world();
    const ids = await t.run(async (ctx) => {
      const result: Id<"conversations">[] = [];
      for (let index = 0; index < 55; index += 1) {
        result.push(
          await ctx.db.insert("conversations", {
            kind: "support",
            status: "open",
            subject: `Help ${String(index)}`,
            createdAt: index,
            updatedAt: index,
          }),
        );
      }
      return result;
    });
    const first = await admin.query(api.messaging.listSupport, {
      status: "open",
      paginationOpts: PAGE,
    });
    expect(first.page.map((row) => row.id)).toEqual(ids.slice(0, 50));
    const next = await admin.query(api.messaging.listSupport, {
      status: "open",
      paginationOpts: { ...PAGE, cursor: first.continueCursor },
    });
    expect(next.page.map((row) => row.id)).toEqual(ids.slice(50));
    expect(next.isDone).toBe(true);
  });

  it("keeps support discoverable after fifty newer trade threads", async () => {
    const { t, owner, sellerOrgId, buyerOrgId, tradeId } = await world();
    const supportId = await owner.mutation(api.messaging.openSupport, {
      subject: "Waiting for help",
    });
    await t.run(async (ctx) => {
      const source = await ctx.db.get("trades", tradeId);
      if (!source) throw new Error("Missing trade");
      const { _id, _creationTime, ...trade } = source;
      for (let index = 0; index < 55; index += 1) {
        const id = await ctx.db.insert("trades", trade);
        await ctx.db.insert("conversations", {
          kind: "trade",
          status: "open",
          subject: trade.materialCode,
          tradeId: id,
          sellerOrgId,
          buyerOrgId,
          createdAt: Date.now() + index + 1,
          updatedAt: Date.now() + index + 1,
        });
      }
    });
    const threads = await owner.query(api.messaging.listMine, {});
    expect(threads).toHaveLength(50);
    expect(threads.some((thread) => thread.id === supportId)).toBe(true);
  });

  it("rejects malformed route IDs after checking the session", async () => {
    const { t, owner } = await world();
    await expect(
      t.query(api.messaging.get, { conversationId: "invalid" }),
    ).rejects.toThrow("NOT_SIGNED_IN");
    await expect(
      owner.query(api.messaging.get, { conversationId: "invalid" }),
    ).rejects.toThrow("MESSAGE_ACCESS_DENIED");
  });

  it("preserves the split metadata when new messages expand a pinned page", async () => {
    const { t, owner, ownerProfileId } = await world();
    const conversationId = await owner.mutation(api.messaging.openSupport, {
      subject: "Growing history",
    });
    async function addMessages(start: number, count: number) {
      await t.run(async (ctx) => {
        for (let index = start; index < start + count; index += 1) {
          await ctx.db.insert("conversationMessages", {
            conversationId,
            senderProfileId: ownerProfileId,
            senderRole: "member",
            body: `Message ${String(index)}`,
            createdAt: index,
          });
        }
      });
    }
    await addMessages(0, 40);
    const first = await owner.query(api.messaging.listMessages, {
      conversationId,
      paginationOpts: { cursor: null, numItems: 30 },
    });
    await addMessages(40, 30);
    const expanded = await owner.query(api.messaging.listMessages, {
      conversationId,
      paginationOpts: {
        cursor: null,
        numItems: 30,
        endCursor: first.continueCursor,
      },
    });
    expect(expanded.pageStatus).toBe("SplitRequired");
    expect(expanded.splitCursor).toEqual(expect.any(String));
    expect(expanded.page).toHaveLength(50);
  });
});
