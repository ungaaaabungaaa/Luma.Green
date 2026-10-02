import {
  paginationOptsValidator,
  paginationResultValidator,
} from "convex/server";
import { ConvexError, v } from "convex/values";

import type { Doc, Id } from "./_generated/dataModel";
import {
  mutation,
  type MutationCtx,
  query,
  type QueryCtx,
} from "./_generated/server";
import { requireAdmin, requireUser } from "./lib/access";
import { isAdminEmail } from "./lib/admin";
import { findProfile } from "./lib/applicationAccess";
import {
  CONVERSATION_PAGE_SIZE,
  MESSAGE_PAGE_SIZE,
  MESSAGES_PER_MINUTE,
  messageText,
  supportSubject,
  vConversationStatus,
  vConversationView,
  vMessageView,
} from "./lib/messaging";

interface Actor {
  profile: Doc<"profiles">;
  isAdmin: boolean;
}

/** The session and profile are required even when the caller knows a thread ID. */
async function actorFor(ctx: QueryCtx): Promise<Actor> {
  const user = await requireUser(ctx);
  const profile = await findProfile(ctx, user._id);
  if (!profile) throw new ConvexError("NO_PROFILE");
  const isAdmin = isAdminEmail(user.email) || profile.kind === "admin";
  if (isAdmin) await requireAdmin(ctx);
  return { profile, isAdmin };
}

async function activeMembership(
  ctx: QueryCtx,
  profileId: Id<"profiles">,
  orgId: Id<"orgs">,
) {
  const membership = await ctx.db
    .query("memberships")
    .withIndex("by_profile_org", (q) =>
      q.eq("profileId", profileId).eq("orgId", orgId),
    )
    .first();
  if (!membership) return null;
  const org = await ctx.db.get("orgs", orgId);
  return org?.status === "active" ? org : null;
}

/** Trade membership is live, not a copied participant list that can become stale. */
async function tradeAccess(ctx: QueryCtx, actor: Actor, tradeId: Id<"trades">) {
  if (actor.isAdmin) throw new ConvexError("MESSAGE_ACCESS_DENIED");
  const trade = await ctx.db.get("trades", tradeId);
  if (!trade) throw new ConvexError("MESSAGE_ACCESS_DENIED");
  const seller = await activeMembership(
    ctx,
    actor.profile._id,
    trade.sellerOrgId,
  );
  const buyer = seller
    ? null
    : await activeMembership(ctx, actor.profile._id, trade.buyerOrgId);
  const org = seller ?? buyer;
  if (!org) throw new ConvexError("MESSAGE_ACCESS_DENIED");
  return { trade, org };
}

async function conversationAccess(
  ctx: QueryCtx,
  actor: Actor,
  conversationId: Id<"conversations">,
) {
  const conversation = await ctx.db.get("conversations", conversationId);
  if (!conversation) throw new ConvexError("MESSAGE_ACCESS_DENIED");
  if (conversation.kind === "support") {
    if (!actor.isAdmin && conversation.supportProfileId !== actor.profile._id) {
      throw new ConvexError("MESSAGE_ACCESS_DENIED");
    }
    return { conversation, org: null };
  }
  if (!conversation.tradeId) throw new ConvexError("MESSAGE_ACCESS_DENIED");
  const { trade, org } = await tradeAccess(ctx, actor, conversation.tradeId);
  if (
    conversation.sellerOrgId !== trade.sellerOrgId ||
    conversation.buyerOrgId !== trade.buyerOrgId
  ) {
    throw new ConvexError("MESSAGE_ACCESS_DENIED");
  }
  return { conversation, org };
}

async function conversationView(
  ctx: QueryCtx,
  conversation: Doc<"conversations">,
  orgId?: Id<"orgs">,
) {
  const counterpartyId =
    conversation.sellerOrgId === orgId
      ? conversation.buyerOrgId
      : conversation.sellerOrgId;
  const counterparty = counterpartyId
    ? await ctx.db.get("orgs", counterpartyId)
    : null;
  return {
    id: conversation._id,
    kind: conversation.kind,
    status: conversation.status,
    subject: conversation.subject,
    updatedAt: conversation.updatedAt,
    tradeId: conversation.tradeId,
    counterpartyName: counterparty?.name,
  };
}

async function audit(
  ctx: MutationCtx,
  actor: Actor,
  conversationId: Id<"conversations">,
  action: string,
  metadata?: {
    status?: "open" | "closed";
    messageId?: Id<"conversationMessages">;
  },
) {
  await ctx.db.insert("auditLog", {
    actorProfileId: actor.profile._id,
    action,
    entityTable: "conversations",
    entityId: conversationId,
    metadata,
    createdAt: Date.now(),
  });
}

/** Recent support and business threads; membership fan-out is explicitly bounded. */
export const listMine = query({
  args: {},
  returns: v.array(vConversationView),
  handler: async (ctx) => {
    const actor = await actorFor(ctx);
    if (actor.isAdmin) throw new ConvexError("NOT_A_MEMBER");
    const support = await ctx.db
      .query("conversations")
      .withIndex("by_supportProfile", (q) =>
        q.eq("supportProfileId", actor.profile._id),
      )
      .take(1);
    const memberships = await ctx.db
      .query("memberships")
      .withIndex("by_profile", (q) => q.eq("profileId", actor.profile._id))
      .take(11);
    if (memberships.length > 10) throw new ConvexError("TOO_MANY_BUSINESSES");
    const visible = new Map<
      Id<"conversations">,
      Awaited<ReturnType<typeof conversationView>>
    >();
    for (const conversation of support) {
      visible.set(conversation._id, await conversationView(ctx, conversation));
    }
    for (const membership of memberships) {
      const org = await ctx.db.get("orgs", membership.orgId);
      if (org?.status !== "active") continue;
      const [selling, buying] = await Promise.all([
        ctx.db
          .query("conversations")
          .withIndex("by_seller_updatedAt", (q) => q.eq("sellerOrgId", org._id))
          .order("desc")
          .take(CONVERSATION_PAGE_SIZE),
        ctx.db
          .query("conversations")
          .withIndex("by_buyer_updatedAt", (q) => q.eq("buyerOrgId", org._id))
          .order("desc")
          .take(CONVERSATION_PAGE_SIZE),
      ]);
      for (const conversation of [...selling, ...buying]) {
        // Recheck the source trade. An obsolete or malformed thread is not a grant.
        const trade = conversation.tradeId
          ? await ctx.db.get("trades", conversation.tradeId)
          : null;
        if (
          !trade ||
          conversation.kind !== "trade" ||
          trade.buyerOrgId !== conversation.buyerOrgId ||
          trade.sellerOrgId !== conversation.sellerOrgId
        )
          continue;
        visible.set(
          conversation._id,
          await conversationView(ctx, conversation, org._id),
        );
      }
    }
    const ordered = visible
      .values()
      .toArray()
      .toSorted((a, b) => b.updatedAt - a.updatedAt);
    const supportThread = ordered.find((item) => item.kind === "support");
    const tradeThreads = ordered.filter((item) => item.kind === "trade");
    // A busy business must still be able to reach its support conversation.
    const pinned = supportThread ? [supportThread] : [];
    return [
      ...pinned,
      ...tradeThreads.slice(0, CONVERSATION_PAGE_SIZE - pinned.length),
    ].toSorted((a, b) => b.updatedAt - a.updatedAt);
  },
});

export const listSupport = query({
  args: {
    status: vConversationStatus,
    paginationOpts: paginationOptsValidator,
  },
  returns: paginationResultValidator(vConversationView),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    if (
      !Number.isSafeInteger(args.paginationOpts.numItems) ||
      args.paginationOpts.numItems < 1
    ) {
      throw new ConvexError("INVALID_PAGE_SIZE");
    }
    const result = await ctx.db
      .query("conversations")
      .withIndex("by_kind_status_updatedAt", (q) =>
        q.eq("kind", "support").eq("status", args.status),
      )
      .order(args.status === "open" ? "asc" : "desc")
      .paginate({
        ...args.paginationOpts,
        numItems: Math.min(
          args.paginationOpts.numItems,
          CONVERSATION_PAGE_SIZE,
        ),
        maximumRowsRead: CONVERSATION_PAGE_SIZE,
      });
    return {
      ...result,
      page: await Promise.all(
        result.page.map((row) => conversationView(ctx, row)),
      ),
    };
  },
});

export const get = query({
  args: { conversationId: v.string() },
  returns: vConversationView,
  handler: async (ctx, args) => {
    const actor = await actorFor(ctx);
    const conversationId = ctx.db.normalizeId(
      "conversations",
      args.conversationId,
    );
    if (!conversationId) throw new ConvexError("MESSAGE_ACCESS_DENIED");
    const { conversation, org } = await conversationAccess(
      ctx,
      actor,
      conversationId,
    );
    return conversationView(ctx, conversation, org?._id);
  },
});

/** Newest first; clients reverse the loaded pages when rendering a transcript. */
export const listMessages = query({
  args: {
    conversationId: v.id("conversations"),
    paginationOpts: paginationOptsValidator,
  },
  returns: paginationResultValidator(vMessageView),
  handler: async (ctx, args) => {
    const actor = await actorFor(ctx);
    await conversationAccess(ctx, actor, args.conversationId);
    if (
      !Number.isSafeInteger(args.paginationOpts.numItems) ||
      args.paginationOpts.numItems < 1
    ) {
      throw new ConvexError("INVALID_PAGE_SIZE");
    }
    const result = await ctx.db
      .query("conversationMessages")
      .withIndex("by_conversation_createdAt", (q) =>
        q.eq("conversationId", args.conversationId),
      )
      .order("desc")
      .paginate({
        ...args.paginationOpts,
        numItems: Math.min(args.paginationOpts.numItems, MESSAGE_PAGE_SIZE),
        maximumRowsRead: MESSAGE_PAGE_SIZE,
        maximumBytesRead: 256_000,
      });
    return {
      ...result,
      page: await Promise.all(
        result.page.map(async (message) => {
          const org = message.senderOrgId
            ? await ctx.db.get("orgs", message.senderOrgId)
            : null;
          return {
            id: message._id,
            body: message.body,
            createdAt: message.createdAt,
            isMine: message.senderProfileId === actor.profile._id,
            senderRole: message.senderRole,
            senderOrgName: org?.name,
          };
        }),
      ),
    };
  },
});

export const openSupport = mutation({
  args: { subject: v.string() },
  returns: v.id("conversations"),
  handler: async (ctx, args) => {
    const actor = await actorFor(ctx);
    if (actor.isAdmin) throw new ConvexError("NOT_A_MEMBER");
    const subject = supportSubject(args.subject);
    const existing = await ctx.db
      .query("conversations")
      .withIndex("by_supportProfile", (q) =>
        q.eq("supportProfileId", actor.profile._id),
      )
      .unique();
    if (existing) {
      if (existing.status === "closed") {
        await ctx.db.patch("conversations", existing._id, {
          status: "open",
          updatedAt: Date.now(),
        });
        await audit(ctx, actor, existing._id, "conversation.reopened", {
          status: "open",
        });
      }
      return existing._id;
    }
    const now = Date.now();
    const id = await ctx.db.insert("conversations", {
      kind: "support",
      status: "open",
      subject,
      supportProfileId: actor.profile._id,
      createdAt: now,
      updatedAt: now,
    });
    await audit(ctx, actor, id, "conversation.created");
    return id;
  },
});

export const openTrade = mutation({
  args: { tradeId: v.id("trades") },
  returns: v.id("conversations"),
  handler: async (ctx, args) => {
    const actor = await actorFor(ctx);
    const { trade } = await tradeAccess(ctx, actor, args.tradeId);
    const existing = await ctx.db
      .query("conversations")
      .withIndex("by_trade", (q) => q.eq("tradeId", trade._id))
      .unique();
    if (existing) return existing._id;
    const now = Date.now();
    const id = await ctx.db.insert("conversations", {
      kind: "trade",
      status: "open",
      subject: trade.materialCode,
      tradeId: trade._id,
      sellerOrgId: trade.sellerOrgId,
      buyerOrgId: trade.buyerOrgId,
      createdAt: now,
      updatedAt: now,
    });
    await audit(ctx, actor, id, "conversation.created");
    return id;
  },
});

export const send = mutation({
  args: { conversationId: v.id("conversations"), body: v.string() },
  returns: v.id("conversationMessages"),
  handler: async (ctx, args) => {
    const actor = await actorFor(ctx);
    const { conversation, org } = await conversationAccess(
      ctx,
      actor,
      args.conversationId,
    );
    if (conversation.status !== "open")
      throw new ConvexError("CONVERSATION_CLOSED");
    const body = messageText(args.body);
    const now = Date.now();
    const recent = await ctx.db
      .query("conversationMessages")
      .withIndex("by_sender_createdAt", (q) =>
        q
          .eq("senderProfileId", actor.profile._id)
          .gt("createdAt", now - 60_000),
      )
      .take(MESSAGES_PER_MINUTE);
    if (recent.length >= MESSAGES_PER_MINUTE)
      throw new ConvexError("MESSAGE_RATE_LIMITED");
    const messageId = await ctx.db.insert("conversationMessages", {
      conversationId: conversation._id,
      senderProfileId: actor.profile._id,
      senderRole: actor.isAdmin ? "admin" : "member",
      senderOrgId: org?._id,
      body,
      createdAt: now,
    });
    await ctx.db.patch("conversations", conversation._id, { updatedAt: now });
    await audit(ctx, actor, conversation._id, "conversation.messageSent", {
      messageId,
    });
    return messageId;
  },
});

// eslint-disable-next-line unicorn/no-non-function-verb-prefix -- Convex mutation registration is callable through the generated API.
export const setSupportStatus = mutation({
  args: { conversationId: v.id("conversations"), status: vConversationStatus },
  returns: v.null(),
  handler: async (ctx, args) => {
    const actor = await actorFor(ctx);
    const { conversation } = await conversationAccess(
      ctx,
      actor,
      args.conversationId,
    );
    if (conversation.kind !== "support")
      throw new ConvexError("NOT_A_SUPPORT_CONVERSATION");
    if (conversation.status !== args.status) {
      await ctx.db.patch("conversations", conversation._id, {
        status: args.status,
        updatedAt: Date.now(),
      });
      await audit(
        ctx,
        actor,
        conversation._id,
        args.status === "open"
          ? "conversation.reopened"
          : "conversation.closed",
        { status: args.status },
      );
    }
    return null;
  },
});
