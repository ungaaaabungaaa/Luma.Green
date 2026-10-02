import { ConvexError, v } from "convex/values";

import { isLocale } from "../../src/i18n/locales";
import { pushEnv } from "../../src/lib/env";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { requireUser } from "./access";
import { findProfile } from "./applicationAccess";
import type { NotificationEvent } from "./notificationConfig";

export const vSubscription = v.object({
  endpoint: v.string(),
  keys: v.object({ p256dh: v.string(), auth: v.string() }),
});

export function isValidEndpoint(value: string): boolean {
  if (value.length > 2048 || value.includes("\\")) return false;
  try {
    const url = new URL(value);
    const host = url.hostname;
    const isAllowed =
      host === "fcm.googleapis.com" ||
      host === "updates.push.services.mozilla.com" ||
      host === "web.push.apple.com" ||
      /^[a-z0-9-]+\.notify\.windows\.com$/.test(host);
    return (
      isAllowed &&
      url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      !url.port &&
      !url.hash &&
      url.pathname.length > 1
    );
  } catch {
    return false;
  }
}

export function isValidExpoToken(value: string): boolean {
  return (
    value.length <= 256 &&
    /^(?:Expo|Exponent)PushToken\[[A-Za-z0-9_-]+\]$/.test(value)
  );
}

export function isValidWebKeys(keys: {
  p256dh: string;
  auth: string;
}): boolean {
  return (
    /^B[A-Za-z0-9_-]{86}=?$/.test(keys.p256dh) &&
    /^[A-Za-z0-9_-]{22}={0,2}$/.test(keys.auth)
  );
}

export async function fingerprint(value: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function requireNotificationProfile(ctx: QueryCtx) {
  const user = await requireUser(ctx);
  const profile = await findProfile(ctx, user._id);
  if (!profile) throw new ConvexError("NO_PROFILE");
  return profile;
}

export async function pushAudit(
  ctx: MutationCtx,
  action: string,
  table: string,
  id: string,
  profileId: Id<"profiles">,
) {
  await ctx.db.insert("auditLog", {
    action,
    entityTable: table,
    entityId: id,
    actorProfileId: profileId,
    createdAt: Date.now(),
  });
}

export async function queueInbox(
  ctx: MutationCtx,
  input: {
    profileId: Id<"profiles">;
    event: NotificationEvent;
    dedupKey: string;
  },
) {
  const existing = await ctx.db
    .query("inbox")
    .withIndex("by_dedupKey", (q) => q.eq("dedupKey", input.dedupKey))
    .unique();
  if (existing) return;
  const now = Date.now();
  const inboxId = await ctx.db.insert("inbox", {
    ...input,
    read: false,
    createdAt: now,
  });
  await pushAudit(ctx, "inbox.created", "inbox", inboxId, input.profileId);
  const config = pushEnv();
  if (!config.web && !config.expo) return;
  const devices = await ctx.db
    .query("pushDevices")
    .withIndex("by_profile", (q) => q.eq("profileId", input.profileId))
    .take(10);
  for (const device of devices) {
    if (
      device.expiresAt <= now ||
      !(device.channel === "web" ? config.web : config.expo)
    )
      continue;
    const id = await ctx.db.insert("pushDeliveries", {
      inboxId,
      deviceId: device._id,
      profileId: input.profileId,
      status: "pending",
      createdAt: now,
      updatedAt: now,
    });
    await pushAudit(ctx, "push.queued", "pushDeliveries", id, input.profileId);
    await ctx.scheduler.runAfter(0, internal.pushDelivery.send, { id });
  }
}

export function checkedLocale(locale: string): string {
  if (!isLocale(locale)) throw new ConvexError("INVALID_LOCALE");
  return locale;
}
