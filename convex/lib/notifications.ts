import { internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import {
  notificationConfig,
  type NotificationEvent,
} from "./notificationConfig";

export async function notificationAudit(
  ctx: MutationCtx,
  id: Id<"smsNotifications">,
  status: Doc<"smsNotifications">["status"],
) {
  await ctx.db.insert("auditLog", {
    action: `notification.${status}`,
    entityTable: "smsNotifications",
    entityId: id,
    createdAt: Date.now(),
  });
}

/** The event owner calls this inside its mutation. There is no public enqueue API. */
export async function queueNotification(
  ctx: MutationCtx,
  input: {
    event: NotificationEvent;
    dedupKey: string;
    profileId: Id<"profiles">;
    locale: string;
    bookingId?: Id<"bookings">;
    applicationId?: Id<"applications">;
    orgId?: Id<"orgs">;
    revision: number;
  },
) {
  const existing = await ctx.db
    .query("smsNotifications")
    .withIndex("by_dedupKey", (q) => q.eq("dedupKey", input.dedupKey))
    .unique();
  if (existing) return existing._id;
  const config = notificationConfig(input.event, input.locale);
  const status = config ? "pending" : "disabled";
  const id = await ctx.db.insert("smsNotifications", {
    ...input,
    status,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });
  await notificationAudit(ctx, id, status);
  if (config)
    await ctx.scheduler.runAfter(0, internal.notifications.send, { id });
  return id;
}

export async function queueBookingNotification(
  ctx: MutationCtx,
  booking: Doc<"bookings">,
  event:
    | "booking_confirmed"
    | "booking_offer"
    | "booking_accepted"
    | "booking_reassigned",
  profileId = booking.householdProfileId,
) {
  if (!profileId) return;
  const profile = await ctx.db.get("profiles", profileId);
  if (!profile) return;
  const revision = booking.dispatch?.attempt ?? 1;
  await queueNotification(ctx, {
    event,
    profileId,
    locale: profile.locale,
    bookingId: booking._id,
    orgId: booking.orgId,
    revision,
    dedupKey: `${event}:${booking._id}:${String(revision)}:${profileId}`,
  });
}
