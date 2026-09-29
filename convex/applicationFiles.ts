import { ConvexError, v } from "convex/values";

import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import {
  action,
  internalMutation,
  internalQuery,
  mutation,
  type QueryCtx,
} from "./_generated/server";
import {
  activeFiles,
  removeFile,
  requireEditableApplication,
} from "./lib/applicationAccess";
import { vFileType } from "./lib/drafts";
import {
  FILE_RULES,
  fileProblem,
  type FileType,
  fileTypesFor,
  sniffContentType,
} from "./lib/onboarding";

const MAX_NAME_LENGTH = 120;

type AttachResult =
  { ok: true; fileId: Id<"applicationFiles"> } | { ok: false; error: string };

/** A one-time URL to upload a file to, for the caller's own application. */
export const generateUploadUrl = mutation({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    await requireEditableApplication(ctx);
    return ctx.storage.generateUploadUrl();
  },
});

/** Throws unless the caller may attach this upload as this type right now. */
async function assertCanAttach(
  ctx: QueryCtx,
  storageId: Id<"_storage">,
  type: FileType,
) {
  const found = await requireEditableApplication(ctx);
  if (!fileTypesFor(found.application.kind).includes(type)) {
    throw new ConvexError("WRONG_FILE_TYPE");
  }
  // An upload already attached anywhere is never touched again.
  const inUse = await ctx.db
    .query("applicationFiles")
    .withIndex("by_storageId", (q) => q.eq("storageId", storageId))
    .first();
  if (inUse) throw new ConvexError("FILE_IN_USE");
  return found;
}

export const checkAttach = internalQuery({
  args: { storageId: v.id("_storage"), type: vFileType },
  returns: v.null(),
  handler: async (ctx, args) => {
    await assertCanAttach(ctx, args.storageId, args.type);
    return null;
  },
});

export const record = internalMutation({
  args: {
    storageId: v.id("_storage"),
    type: vFileType,
    name: v.string(),
    contentType: v.string(),
    size: v.number(),
  },
  returns: v.id("applicationFiles"),
  handler: async (ctx, args) => {
    const { profile, application } = await assertCanAttach(
      ctx,
      args.storageId,
      args.type,
    );
    const attached = await activeFiles(ctx, application._id);
    const sameType = attached.filter((file) => file.type === args.type);
    const { max } = FILE_RULES[args.type];
    if (max === 1) {
      // Certificate, ID and selfie hold one file: a new one replaces it.
      for (const file of sameType) await removeFile(ctx, file);
    } else if (sameType.length >= max) {
      throw new ConvexError("TOO_MANY_FILES");
    }
    return ctx.db.insert("applicationFiles", {
      applicationId: application._id,
      profileId: profile._id,
      type: args.type,
      storageId: args.storageId,
      name: args.name.trim().slice(0, MAX_NAME_LENGTH) || args.type,
      contentType: args.contentType,
      size: args.size,
      createdAt: Date.now(),
    });
  },
});

/**
 * Attaches an uploaded file to the caller's application after checking its
 * real type (from its first bytes) and size. A file that fails is deleted
 * straight away — an action, so the delete isn't rolled back with the error.
 */
export const attach = action({
  args: {
    storageId: v.id("_storage"),
    type: vFileType,
    name: v.string(),
  },
  returns: v.union(
    v.object({ ok: v.literal(true), fileId: v.id("applicationFiles") }),
    v.object({ ok: v.literal(false), error: v.string() }),
  ),
  // Annotated: this module calls itself through `internal`, which TypeScript
  // can't infer on its own.
  handler: async (ctx, args): Promise<AttachResult> => {
    await ctx.runQuery(internal.applicationFiles.checkAttach, {
      storageId: args.storageId,
      type: args.type,
    });

    const blob = await ctx.storage.get(args.storageId);
    if (!blob) return { ok: false, error: "FILE_NOT_FOUND" };
    const head = new Uint8Array(await blob.slice(0, 16).arrayBuffer());
    const contentType = sniffContentType(head);
    const problem = fileProblem(args.type, { contentType, size: blob.size });
    if (problem || !contentType) {
      await ctx.storage.delete(args.storageId);
      return { ok: false, error: problem ?? "fileType" };
    }

    try {
      const fileId: Id<"applicationFiles"> = await ctx.runMutation(
        internal.applicationFiles.record,
        {
          storageId: args.storageId,
          type: args.type,
          name: args.name,
          contentType,
          size: blob.size,
        },
      );
      return { ok: true, fileId };
    } catch (error) {
      await ctx.storage.delete(args.storageId);
      throw error;
    }
  },
});

/** Takes one of the caller's own files off their application. */
export const remove = mutation({
  args: { fileId: v.id("applicationFiles") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { application } = await requireEditableApplication(ctx);
    const file = await ctx.db.get("applicationFiles", args.fileId);
    if (
      file?.applicationId !== application._id ||
      file.removedAt !== undefined
    ) {
      throw new ConvexError("FILE_NOT_FOUND");
    }
    await removeFile(ctx, file);
    return null;
  },
});
