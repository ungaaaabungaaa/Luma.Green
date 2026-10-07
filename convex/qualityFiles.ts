import { ConvexError, v } from "convex/values";

import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import {
  action,
  httpAction,
  internalMutation,
  internalQuery,
  mutation,
  query,
  type QueryCtx,
} from "./_generated/server";
import { canReadAuditReport } from "./auditShares";
import { corsHeaders, preflightResponse, trustedOrigins } from "./files";
import { requireUser } from "./lib/access";
import { findProfile } from "./lib/applicationAccess";
import { qualityText, validateQualityContent } from "./lib/qualityContent";
import {
  vBuyerQualityDecision,
  vQualityFileKind,
} from "./lib/qualityFilesSchema";
import { requireOrg, selectedMembership } from "./lib/workspace";

export const vQualityFileView = v.object({
  id: v.id("qualityAttachments"),
  inspectionId: v.id("lotInspections"),
  name: v.string(),
  kind: vQualityFileKind,
  contentType: v.string(),
  size: v.number(),
  sha256: v.string(),
  createdAt: v.number(),
  withdrawnAt: v.optional(v.number()),
  sharedWithBuyer: v.boolean(),
});
export function qualityFileView(row: Doc<"qualityAttachments">) {
  return {
    id: row._id,
    inspectionId: row.inspectionId,
    name: row.name,
    kind: row.kind,
    contentType: row.contentType,
    size: row.size,
    sha256: row.sha256,
    createdAt: row.createdAt,
    withdrawnAt: row.withdrawnAt,
    sharedWithBuyer: Boolean(row.buyerOrgId),
  };
}
async function uploadScope(
  ctx: QueryCtx,
  inspectionId: Id<"lotInspections">,
  isSharedWithBuyer: boolean,
) {
  const scope = await requireOrg(ctx);
  const inspection = await ctx.db.get("lotInspections", inspectionId);
  const lot = inspection
    ? await ctx.db.get("materialLots", inspection.lotId)
    : null;
  if (inspection?.orgId !== scope.org._id || lot?.orgId !== scope.org._id)
    throw new ConvexError("INSPECTION_NOT_FOUND");
  if (isSharedWithBuyer) {
    const buyer = inspection.buyerOrgId
      ? await ctx.db.get("orgs", inspection.buyerOrgId)
      : null;
    if (buyer?.status !== "active" || buyer._id === scope.org._id)
      throw new ConvexError("BUYER_NOT_ACTIVE");
  }
  const attached = await ctx.db
    .query("qualityAttachments")
    .withIndex("by_inspection", (q) => q.eq("inspectionId", inspectionId))
    .take(21);
  if (attached.length >= 20) throw new ConvexError("FILE_LIMIT");
  return { ...scope, inspection };
}
export const checkUpload = internalQuery({
  args: { inspectionId: v.id("lotInspections"), shareWithBuyer: v.boolean() },
  returns: v.null(),
  handler: async (ctx, args) => {
    await uploadScope(ctx, args.inspectionId, args.shareWithBuyer);
    return null;
  },
});
export const recordUpload = internalMutation({
  args: {
    inspectionId: v.id("lotInspections"),
    shareWithBuyer: v.boolean(),
    kind: vQualityFileKind,
    name: v.string(),
    contentType: v.string(),
    size: v.number(),
    sha256: v.string(),
    storageId: v.id("_storage"),
  },
  returns: v.id("qualityAttachments"),
  handler: async (ctx, args) => {
    const { org, profile, inspection } = await uploadScope(
      ctx,
      args.inspectionId,
      args.shareWithBuyer,
    );
    const metadata = await ctx.db.system.get("_storage", args.storageId);
    if (metadata?.size !== args.size) throw new ConvexError("FILE_NOT_FOUND");
    const used = await ctx.db
      .query("qualityAttachments")
      .withIndex("by_storage", (q) => q.eq("storageId", args.storageId))
      .first();
    if (used) throw new ConvexError("FILE_IN_USE");
    const now = Date.now();
    const id = await ctx.db.insert("qualityAttachments", {
      orgId: org._id,
      inspectionId: inspection._id,
      buyerOrgId: args.shareWithBuyer ? inspection.buyerOrgId : undefined,
      kind: args.kind,
      name: qualityText(args.name, 120),
      contentType: args.contentType,
      size: args.size,
      sha256: args.sha256,
      storageId: args.storageId,
      createdBy: profile._id,
      createdAt: now,
    });
    await ctx.db.insert("auditLog", {
      orgId: org._id,
      actorProfileId: profile._id,
      action: "quality.file_attached",
      entityTable: "qualityAttachments",
      entityId: id,
      createdAt: now,
      metadata: {
        inspectionId: inspection._id,
        sharedWithBuyer: args.shareWithBuyer,
        sha256: args.sha256,
      },
    });
    return id;
  },
});
export const discard = internalMutation({
  args: { storageId: v.id("_storage") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const used = await ctx.db
      .query("qualityAttachments")
      .withIndex("by_storage", (q) => q.eq("storageId", args.storageId))
      .first();
    if (!used) await ctx.storage.delete(args.storageId);
    return null;
  },
});
/** Server accepts bytes, never a client-chosen storage ID or public download URL. */
export const upload = action({
  args: {
    inspectionId: v.id("lotInspections"),
    shareWithBuyer: v.boolean(),
    kind: vQualityFileKind,
    name: v.string(),
    contentType: v.string(),
    bytes: v.bytes(),
  },
  returns: v.id("qualityAttachments"),
  handler: async (ctx, args): Promise<Id<"qualityAttachments">> => {
    await ctx.runQuery(internal.qualityFiles.checkUpload, {
      inspectionId: args.inspectionId,
      shareWithBuyer: args.shareWithBuyer,
    });
    const name = qualityText(args.name, 120);
    const contentType = validateQualityContent(args.bytes, args.contentType);
    if (contentType === "application/pdf" && args.kind === "photo")
      throw new ConvexError("INVALID_FILE_TYPE");
    const digest = await crypto.subtle.digest("SHA-256", args.bytes);
    const sha256 = [...new Uint8Array(digest)]
      .map((n) => n.toString(16).padStart(2, "0"))
      .join("");
    const storageId = await ctx.storage.store(
      new Blob([args.bytes], { type: contentType }),
    );
    try {
      return await ctx.runMutation(internal.qualityFiles.recordUpload, {
        inspectionId: args.inspectionId,
        shareWithBuyer: args.shareWithBuyer,
        kind: args.kind,
        name,
        contentType,
        size: args.bytes.byteLength,
        sha256,
        storageId,
      });
    } catch (error) {
      await ctx.runMutation(internal.qualityFiles.discard, { storageId });
      throw error;
    }
  },
});
export const withdraw = mutation({
  args: { fileId: v.id("qualityAttachments") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { org, profile, role } = await requireOrg(ctx);
    if (role !== "owner") throw new ConvexError("OWNER_REQUIRED");
    const file = await ctx.db.get("qualityAttachments", args.fileId);
    if (file?.orgId !== org._id) throw new ConvexError("FILE_NOT_FOUND");
    if (file.withdrawnAt) return null;
    const now = Date.now();
    await ctx.db.patch("qualityAttachments", file._id, { withdrawnAt: now });
    await ctx.db.insert("auditLog", {
      orgId: org._id,
      actorProfileId: profile._id,
      action: "quality.file_withdrawn",
      entityTable: "qualityAttachments",
      entityId: file._id,
      createdAt: now,
    });
    return null;
  },
});
export const board = query({
  args: {},
  returns: v.object({
    orgId: v.id("orgs"),
    canOperate: v.boolean(),
    canWithdraw: v.boolean(),
    inspections: v.array(
      v.object({
        id: v.id("lotInspections"),
        label: v.string(),
        buyerName: v.optional(v.string()),
      }),
    ),
    own: v.array(vQualityFileView),
    incoming: v.array(vQualityFileView),
    decisions: v.array(
      v.object({
        id: v.id("qualityBuyerDecisions"),
        inspectionId: v.id("lotInspections"),
        decision: vBuyerQualityDecision,
        note: v.string(),
        createdAt: v.number(),
      }),
    ),
  }),
  handler: async (ctx) => {
    const { org, role } = await requireOrg(ctx, undefined, "read");
    const inspected = await ctx.db
      .query("lotInspections")
      .withIndex("by_org_created", (q) => q.eq("orgId", org._id))
      .order("desc")
      .take(100);
    const inspections = [];
    for (const row of inspected) {
      const lot = await ctx.db.get("materialLots", row.lotId);
      if (lot?.orgId !== org._id) continue;
      const buyer = row.buyerOrgId
        ? await ctx.db.get("orgs", row.buyerOrgId)
        : null;
      inspections.push({
        id: row._id,
        label: row.specificationReference + " · " + row.specificationVersion,
        buyerName: buyer?.name,
      });
    }
    const own = await ctx.db
      .query("qualityAttachments")
      .withIndex("by_org", (q) => q.eq("orgId", org._id))
      .order("desc")
      .take(100);
    const incoming = await ctx.db
      .query("qualityAttachments")
      .withIndex("by_buyer", (q) => q.eq("buyerOrgId", org._id))
      .order("desc")
      .take(100);
    const sellerDecisions = await ctx.db
      .query("qualityBuyerDecisions")
      .withIndex("by_inspecting_org", (q) => q.eq("inspectingOrgId", org._id))
      .order("desc")
      .take(100);
    const decisions = await ctx.db
      .query("qualityBuyerDecisions")
      .withIndex("by_buyer", (q) => q.eq("buyerOrgId", org._id))
      .order("desc")
      .take(100);
    return {
      orgId: org._id,
      canOperate: role !== "viewer",
      canWithdraw: role === "owner",
      inspections,
      own: own.map((row) => qualityFileView(row)),
      incoming: incoming
        .filter((f) => !f.withdrawnAt)
        .map((row) => qualityFileView(row)),
      decisions: [...decisions, ...sellerDecisions].map((d) => ({
        id: d._id,
        inspectionId: d.inspectionId,
        decision: d.decision,
        note: d.note,
        createdAt: d.createdAt,
      })),
    };
  },
});
export const decide = mutation({
  args: {
    inspectionId: v.id("lotInspections"),
    attachmentIds: v.array(v.id("qualityAttachments")),
    decision: vBuyerQualityDecision,
    note: v.string(),
  },
  returns: v.id("qualityBuyerDecisions"),
  handler: async (ctx, args) => {
    const { org, profile } = await requireOrg(ctx);
    const inspection = await ctx.db.get("lotInspections", args.inspectionId);
    if (inspection?.buyerOrgId !== org._id || inspection.orgId === org._id)
      throw new ConvexError("QUALITY_ACCESS_DENIED");
    if (
      args.attachmentIds.length === 0 ||
      args.attachmentIds.length > 20 ||
      new Set(args.attachmentIds).size !== args.attachmentIds.length
    )
      throw new ConvexError("INVALID_FILES");
    for (const id of args.attachmentIds) {
      const file = await ctx.db.get("qualityAttachments", id);
      if (
        file?.inspectionId !== inspection._id ||
        file.buyerOrgId !== org._id ||
        file.withdrawnAt
      )
        throw new ConvexError("QUALITY_ACCESS_DENIED");
    }
    const note = qualityText(args.note);
    const now = Date.now();
    const id = await ctx.db.insert("qualityBuyerDecisions", {
      ...args,
      note,
      inspectingOrgId: inspection.orgId,
      buyerOrgId: org._id,
      actorProfileId: profile._id,
      createdAt: now,
    });
    await ctx.db.insert("auditLog", {
      orgId: org._id,
      actorProfileId: profile._id,
      action: "quality.buyer_decision",
      entityTable: "qualityBuyerDecisions",
      entityId: id,
      createdAt: now,
    });
    return id;
  },
});
export const readFile = internalQuery({
  args: { fileId: v.string(), reportId: v.optional(v.string()) },
  returns: v.union(
    v.null(),
    v.object({
      storageId: v.id("_storage"),
      contentType: v.string(),
      name: v.string(),
    }),
  ),
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const profile = await findProfile(ctx, user._id);
    if (!profile) return null;
    const id = ctx.db.normalizeId("qualityAttachments", args.fileId);
    const file = id ? await ctx.db.get("qualityAttachments", id) : null;
    if (!file || file.withdrawnAt) return null;
    let isAllowed = false;
    if (args.reportId) {
      const reportId = ctx.db.normalizeId("auditReports", args.reportId);
      const report = reportId
        ? await ctx.db.get("auditReports", reportId)
        : null;
      isAllowed = Boolean(
        report &&
        report.attachmentIds.includes(file._id) &&
        (await canReadAuditReport(ctx, report, profile._id)),
      );
    } else {
      const selected = await selectedMembership(ctx, profile._id);
      isAllowed = Boolean(
        selected &&
        (selected.org._id === file.orgId ||
          selected.org._id === file.buyerOrgId),
      );
    }
    const source = await ctx.db.get("orgs", file.orgId);
    return isAllowed && source?.status === "active"
      ? {
          storageId: file.storageId,
          contentType: file.contentType,
          name: file.name,
        }
      : null;
  },
});
const origins = () =>
  trustedOrigins({
    SITE_URL: process.env.SITE_URL,
    EXTRA_TRUSTED_ORIGINS: process.env.EXTRA_TRUSTED_ORIGINS,
  });
export const serve = httpAction(async (ctx, request) => {
  const headers = {
    ...corsHeaders(request.headers.get("Origin"), origins()),
    "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff",
    "Content-Security-Policy": "sandbox; default-src 'none'",
  };
  const url = new URL(request.url);
  const fileId = url.pathname.slice("/quality-files/".length);
  let file;
  try {
    file = await ctx.runQuery(internal.qualityFiles.readFile, {
      fileId,
      reportId: url.searchParams.get("report") ?? undefined,
    });
  } catch {
    return new Response("UNAVAILABLE", { status: 403, headers });
  }
  if (!file) return new Response("UNAVAILABLE", { status: 404, headers });
  const blob = await ctx.storage.get(file.storageId);
  if (!blob) return new Response("UNAVAILABLE", { status: 404, headers });
  return new Response(blob, {
    headers: {
      ...headers,
      "Content-Type": file.contentType,
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(file.name)}`,
    },
  });
});
export const preflight = httpAction((_ctx, request) =>
  Promise.resolve(preflightResponse(request.headers.get("Origin"), origins())),
);
