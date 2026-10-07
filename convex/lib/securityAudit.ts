import type { Triggers } from "@convex-dev/better-auth";

import type { DataModel } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import type authSchema from "../betterAuth/schema";

async function record(ctx: MutationCtx, userId: string, action: string) {
  const profile = await ctx.db
    .query("profiles")
    .withIndex("by_authUserId", (query) => query.eq("authUserId", userId))
    .unique();
  await ctx.db.insert("auditLog", {
    actorProfileId: profile?._id,
    action,
    entityTable: "betterAuth.user",
    entityId: userId,
    createdAt: Date.now(),
  });
}

/** Runs inside the component's write transaction. Never copy factor values. */
export const securityAudit: Triggers<DataModel, typeof authSchema> = {
  account: {
    onUpdate: async (ctx, current, previous) => {
      if (
        current.providerId === "credential" &&
        current.password !== previous.password
      ) {
        await record(ctx, current.userId, "auth.password.changed");
      }
    },
  },
  user: {
    onCreate: async (ctx, user) => {
      await record(ctx, user._id, "auth.identity.created");
    },
    onUpdate: async (ctx, current, previous) => {
      if (
        current.phoneNumberVerified &&
        current.phoneNumber &&
        (current.phoneNumber !== previous.phoneNumber ||
          !previous.phoneNumberVerified)
      ) {
        const profile = await ctx.db
          .query("profiles")
          .withIndex("by_authUserId", (query) =>
            query.eq("authUserId", current._id),
          )
          .unique();
        if (profile)
          await ctx.db.patch(profile._id, {
            phone: current.phoneNumber,
            updatedAt: Date.now(),
          });
        await record(ctx, current._id, "auth.phone.verified");
      }
      if (current.emailVerified && !previous.emailVerified) {
        await record(ctx, current._id, "auth.email.verified");
      }
      if (current.twoFactorEnabled === previous.twoFactorEnabled) return;
      await record(
        ctx,
        current._id,
        current.twoFactorEnabled
          ? "auth.authenticator.enabled"
          : "auth.authenticator.disabled",
      );
    },
  },
  twoFactor: {
    onCreate: async (ctx, factor) => {
      await record(ctx, factor.userId, "auth.authenticator.setup_started");
    },
    onUpdate: async (ctx, current, previous) => {
      if (current.backupCodes !== previous.backupCodes) {
        await record(ctx, current.userId, "auth.recovery_codes.changed");
      }
    },
    onDelete: async (ctx, factor) => {
      await record(ctx, factor.userId, "auth.authenticator.secret_removed");
    },
  },
};
