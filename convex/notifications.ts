import { v } from "convex/values";

import { internal } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";
import {
  internalAction,
  internalMutation,
  type MutationCtx,
} from "./_generated/server";
import { notificationConfig, sendNotification } from "./lib/notificationConfig";
import { notificationAudit } from "./lib/notifications";

const vResult = v.union(
  v.literal("provider_accepted"),
  v.literal("failed"),
  v.literal("unknown"),
  v.literal("disabled"),
);
const args = { id: v.id("smsNotifications") };

async function setStatus(
  ctx: MutationCtx,
  row: Doc<"smsNotifications">,
  status: Doc<"smsNotifications">["status"],
) {
  await ctx.db.patch("smsNotifications", row._id, {
    status,
    updatedAt: Date.now(),
  });
  await notificationAudit(ctx, row._id, status);
}

function isCurrentBookingEvent(
  booking: Doc<"bookings">,
  row: Doc<"smsNotifications">,
): boolean {
  if (["cancelled", "declined", "completed"].includes(booking.status))
    return false;
  if (
    row.event !== "booking_confirmed" &&
    (booking.orgId !== row.orgId ||
      (booking.dispatch?.attempt ?? 1) !== row.revision)
  )
    return false;
  return row.event === "booking_offer"
    ? booking.status === "requested"
    : row.event !== "booking_accepted" ||
        booking.status === "accepted" ||
        booking.status === "on_the_way";
}

/** Suppress obsolete offers and decisions before reserving a paid send. */
async function currentLink(
  ctx: MutationCtx,
  row: Doc<"smsNotifications">,
  locale: string,
  origin: string,
) {
  if (row.bookingId) {
    const booking = await ctx.db.get("bookings", row.bookingId);
    if (!booking || !isCurrentBookingEvent(booking, row)) return null;
    return row.event === "booking_offer"
      ? `${origin}/${locale}/app/requests`
      : `${origin}/${locale}/t/${booking.token}`;
  }
  if (row.applicationId) {
    const application = await ctx.db.get("applications", row.applicationId);
    if (application?.version !== row.revision) return null;
    const expected =
      row.event === "application_received"
        ? "submitted"
        : row.event.replace("application_", "");
    return application.status === expected
      ? `${origin}/${locale}/join/status`
      : null;
  }
  return null;
}

export const claim = internalMutation({
  args,
  returns: v.union(
    v.null(),
    v.object({
      phone: v.string(),
      link: v.string(),
      templateId: v.string(),
      locale: v.string(),
    }),
  ),
  handler: async (ctx, { id }) => {
    const row = await ctx.db.get("smsNotifications", id);
    if (row?.status !== "pending") return null;
    const config = notificationConfig(row.event, row.locale);
    if (!config) {
      await setStatus(ctx, row, "disabled");
      return null;
    }
    const profile = await ctx.db.get("profiles", row.profileId);
    const link = await currentLink(ctx, row, config.locale, config.origin);
    if (!link || !profile?.phone || !/^\+91[6-9]\d{9}$/.test(profile.phone)) {
      await setStatus(ctx, row, "cancelled");
      return null;
    }
    const recentAttempts = await ctx.db
      .query("smsNotifications")
      .withIndex("by_profile_attemptedAt", (q) =>
        q
          .eq("profileId", row.profileId)
          .gt("attemptedAt", Date.now() - 86_400_000),
      )
      .take(20);
    if (recentAttempts.length >= 20) {
      await setStatus(ctx, row, "rate_limited");
      return null;
    }
    await ctx.db.patch("smsNotifications", id, {
      attemptedAt: Date.now(),
      templateId: config.templateId,
      templateLocale: config.locale,
    });
    await setStatus(ctx, row, "sending");
    // One watchdog only. A crashed action is ambiguous and is never resent.
    await ctx.scheduler.runAfter(60_000, internal.notifications.expireClaim, {
      id,
    });
    return {
      phone: profile.phone,
      link,
      templateId: config.templateId,
      locale: config.locale,
    };
  },
});

export const finish = internalMutation({
  args: { ...args, status: vResult },
  returns: v.null(),
  handler: async (ctx, { id, status }) => {
    const row = await ctx.db.get("smsNotifications", id);
    if (row?.status === "sending") await setStatus(ctx, row, status);
    return null;
  },
});

export const expireClaim = internalMutation({
  args,
  returns: v.null(),
  handler: async (ctx, { id }) => {
    const row = await ctx.db.get("smsNotifications", id);
    if (row?.status === "sending" && Date.now() - row.updatedAt >= 60_000)
      await setStatus(ctx, row, "unknown");
    return null;
  },
});

export const send = internalAction({
  args,
  returns: v.null(),
  handler: async (ctx, { id }) => {
    const reserved = await ctx.runMutation(internal.notifications.claim, {
      id,
    });
    if (reserved) {
      const authKey = process.env.MSG91_AUTH_KEY?.trim();
      const status = authKey
        ? await sendNotification({ ...reserved, authKey })
        : "disabled";
      await ctx.runMutation(internal.notifications.finish, { id, status });
    }
    return null;
  },
});
