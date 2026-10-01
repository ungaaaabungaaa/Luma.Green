import { ConvexError, v } from "convex/values";

import { mutation, query } from "./_generated/server";
import { authComponent } from "./auth";
import {
  activeFiles,
  countByType,
  findApplication,
  findProfile,
  removeFile,
  requireEditableApplication,
  requireMember,
} from "./lib/applicationAccess";
import {
  draftSections,
  vApplicationKind,
  vApplicationStatus,
  vFileType,
} from "./lib/drafts";
import { canMove } from "./lib/lifecycle";
import { queueNotification } from "./lib/notifications";
import {
  applicationIssues,
  indiaToday,
  type Section,
  sectionsFor,
} from "./lib/onboarding";

/** Drafts are small; anything bigger than this is not a form. */
const MAX_DRAFT_CHARS = 20_000;

/** Drafts contain plain JSON. Object key order does not change their meaning. */
function draftJson(value: unknown): string | undefined {
  return JSON.stringify(value, (_key, entry: unknown) =>
    entry !== null && typeof entry === "object" && !Array.isArray(entry)
      ? Object.fromEntries(
          Object.entries(entry).toSorted(([a], [b]) => a.localeCompare(b)),
        )
      : entry,
  );
}

const vFileSummary = v.object({
  id: v.id("applicationFiles"),
  type: vFileType,
  name: v.string(),
  contentType: v.string(),
  size: v.number(),
});

/**
 * The signed-in person's application, or null when signed out. Their own
 * only — there is no way to ask for anyone else's.
 */
export const mine = query({
  args: {},
  returns: v.union(
    v.null(),
    v.object({
      loginPhone: v.optional(v.string()),
      application: v.union(
        v.null(),
        v.object({
          id: v.id("applications"),
          kind: vApplicationKind,
          status: vApplicationStatus,
          version: v.number(),
          submittedAt: v.optional(v.number()),
          decidedAt: v.optional(v.number()),
          note: v.optional(v.string()),
          ...draftSections,
          files: v.array(vFileSummary),
        }),
      ),
    }),
  ),
  handler: async (ctx) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) return null;
    const loginPhone = user.phoneNumber ?? undefined;
    const profile = await findProfile(ctx, user._id);
    const application = profile
      ? await findApplication(ctx, profile._id)
      : null;
    if (!application) return { loginPhone, application: null };

    const files = await activeFiles(ctx, application._id);
    return {
      loginPhone,
      application: {
        id: application._id,
        kind: application.kind,
        status: application.status,
        version: application.version,
        submittedAt: application.submittedAt,
        decidedAt: application.decidedAt,
        note: application.note,
        kabadiwala: application.kabadiwala,
        business: application.business,
        documents: application.documents,
        saathi: application.saathi,
        files: files.map((file) => ({
          id: file._id,
          type: file.type,
          name: file.name,
          contentType: file.contentType,
          size: file.size,
        })),
      },
    };
  },
});

/**
 * Opens an application once the person confirms they're 18 or older and has
 * read the privacy notice for their role. Idempotent for the same role.
 */
export const start = mutation({
  args: {
    kind: vApplicationKind,
    locale: v.string(),
    ageConfirmed: v.literal(true),
    privacyAccepted: v.literal(true),
  },
  returns: v.id("applications"),
  handler: async (ctx, args) => {
    const profile = await requireMember(ctx);
    const existing = await findApplication(ctx, profile._id);
    if (existing) {
      if (existing.kind === args.kind) return existing._id;
      throw new ConvexError("ALREADY_APPLYING");
    }

    const now = Date.now();
    const applicationId = await ctx.db.insert("applications", {
      profileId: profile._id,
      kind: args.kind,
      status: "draft",
      version: 0,
      locale: args.locale,
      ageConfirmedAt: now,
      privacyAcceptedAt: now,
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.insert("auditLog", {
      action: "application.started",
      entityTable: "applications",
      entityId: applicationId,
      actorProfileId: profile._id,
      metadata: { kind: args.kind },
      createdAt: now,
    });
    return applicationId;
  },
});

/** Saves whatever is filled in so far. Only the sections this role uses. */
export const saveDraft = mutation({
  args: draftSections,
  returns: v.null(),
  handler: async (ctx, args) => {
    const { application } = await requireEditableApplication(ctx);
    if (JSON.stringify(args).length > MAX_DRAFT_CHARS) {
      throw new ConvexError("TOO_LARGE");
    }
    const allowed = sectionsFor(application.kind);
    for (const section of Object.keys(args) as Section[]) {
      if (!allowed.includes(section)) throw new ConvexError("WRONG_SECTION");
    }
    // Repeat saves must still pass access and section checks. Skip unchanged
    // sections so they do not write data or invalidate live query caches.
    const changed = Object.fromEntries(
      (Object.keys(args) as Section[])
        .filter(
          (section) =>
            draftJson(args[section]) !== draftJson(application[section]),
        )
        .map((section) => [section, args[section]]),
    );
    if (Object.keys(changed).length === 0) return null;
    await ctx.db.patch("applications", application._id, {
      ...changed,
      updatedAt: Date.now(),
    });
    return null;
  },
});

/**
 * Sends the application for verification. Checks it with the same rules as
 * the form, keeps a copy of this version, and starts the 12–24 hour clock.
 */
export const submit = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const { profile, application } = await requireEditableApplication(ctx);
    if (!canMove(application.status, "submitted")) {
      throw new ConvexError("NOT_EDITABLE");
    }

    const files = await activeFiles(ctx, application._id);
    const issues = applicationIssues(
      application.kind,
      {
        kabadiwala: application.kabadiwala,
        business: application.business,
        documents: application.documents,
        saathi: application.saathi,
      },
      countByType(files),
      indiaToday(),
    );
    if (issues.length > 0) {
      throw new ConvexError({
        code: "INCOMPLETE",
        issues: issues.map(({ section, field, message }) => ({
          section,
          field,
          message,
        })),
      });
    }

    const now = Date.now();
    const version = application.version + 1;
    await ctx.db.patch("applications", application._id, {
      status: "submitted",
      version,
      submittedAt: now,
      note: undefined,
      updatedAt: now,
    });
    for (const file of files) {
      if (file.firstSubmittedVersion === undefined) {
        await ctx.db.patch("applicationFiles", file._id, {
          firstSubmittedVersion: version,
        });
      }
    }
    await ctx.db.insert("applicationSnapshots", {
      applicationId: application._id,
      version,
      kabadiwala: application.kabadiwala,
      business: application.business,
      documents: application.documents,
      saathi: application.saathi,
      fileIds: files.map((file) => file._id),
      submittedAt: now,
    });
    await ctx.db.insert("auditLog", {
      action: "application.submitted",
      entityTable: "applications",
      entityId: application._id,
      actorProfileId: profile._id,
      metadata: { from: application.status, to: "submitted", version },
      createdAt: now,
    });
    await queueNotification(ctx, {
      event: "application_received",
      dedupKey: `application_received:${application._id}:${String(version)}`,
      profileId: profile._id,
      applicationId: application._id,
      locale: application.locale,
      revision: version,
    });
    return null;
  },
});

/**
 * Throws away an application that was never sent — to start again as a
 * different role. Its uploads go with it.
 */
export const discard = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const { profile, application } = await requireEditableApplication(ctx);
    if (application.status !== "draft" || application.version > 0) {
      throw new ConvexError("NOT_DISCARDABLE");
    }
    const files = await activeFiles(ctx, application._id);
    for (const file of files) await removeFile(ctx, file);
    await ctx.db.delete("applications", application._id);
    await ctx.db.insert("auditLog", {
      action: "application.discarded",
      entityTable: "applications",
      entityId: application._id,
      actorProfileId: profile._id,
      metadata: { kind: application.kind },
      createdAt: Date.now(),
    });
    return null;
  },
});
