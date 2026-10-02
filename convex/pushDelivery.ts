"use node";

import { v } from "convex/values";
import webpush from "web-push";
import { z } from "zod";

import { pushEnv } from "../src/lib/env";
import { internal } from "./_generated/api";
import { internalAction } from "./_generated/server";
import { isValidEndpoint, isValidExpoToken } from "./lib/push";
import { pushCopy } from "./lib/pushCopy";

const expoResult = z.object({
  status: z.enum(["ok", "error"]),
  id: z.string().max(200).optional(),
  details: z.object({ error: z.string().max(100).optional() }).optional(),
});
interface Result {
  status: "accepted" | "failed" | "unknown";
  removeDevice: boolean;
  receiptId?: string;
}

async function sendExpo(token: string, locale: string): Promise<Result> {
  const config = pushEnv();
  if (!config.expo || !isValidExpoToken(token))
    return { status: "failed", removeDevice: false };
  const copy = pushCopy(locale);
  const response = await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.expoAccessToken ?? ""}`,
    },
    body: JSON.stringify({
      to: token,
      title: copy.title,
      body: copy.body,
      data: { route: "/account/notifications" },
      sound: "default",
      channelId: "account-updates",
      ttl: 3600,
    }),
    signal: AbortSignal.timeout(8000),
    redirect: "error",
  });
  if (!response.ok)
    return {
      status: response.status >= 500 ? "unknown" : "failed",
      removeDevice: false,
    };
  const parsed = z
    .object({ data: expoResult })
    .safeParse(await response.json());
  if (!parsed.success) return { status: "unknown", removeDevice: false };
  const result = parsed.data.data;
  return {
    status: result.status === "ok" ? "accepted" : "failed",
    removeDevice: result.details?.error === "DeviceNotRegistered",
    receiptId: result.status === "ok" ? result.id : undefined,
  };
}

async function sendWeb(
  endpoint: string,
  keys: { p256dh: string; auth: string },
  locale: string,
): Promise<Result> {
  const config = pushEnv().web;
  if (!config || !isValidEndpoint(endpoint))
    return { status: "failed", removeDevice: false };
  const copy = pushCopy(locale);
  try {
    // web-push uses https.request and does not follow response redirects.
    await webpush.sendNotification(
      { endpoint, keys },
      JSON.stringify({
        title: copy.title,
        body: copy.body,
        route: "/account/notifications",
        locale: copy.locale,
      }),
      { vapidDetails: config, timeout: 8000, TTL: 3600, urgency: "normal" },
    );
    return { status: "accepted", removeDevice: false };
  } catch (error) {
    const status = z.object({ statusCode: z.number() }).safeParse(error);
    const code = status.success ? status.data.statusCode : 0;
    return {
      status: code >= 400 && code < 500 ? "failed" : "unknown",
      removeDevice: code === 404 || code === 410,
    };
  }
}

export const send = internalAction({
  args: { id: v.id("pushDeliveries") },
  returns: v.null(),
  handler: async (ctx, { id }) => {
    const target = await ctx.runMutation(internal.pushState.claim, { id });
    if (target) {
      let result: Result = { status: "failed", removeDevice: false };
      try {
        if (target.channel === "expo")
          result = await sendExpo(target.endpoint, target.locale);
        else if (target.keys)
          result = await sendWeb(target.endpoint, target.keys, target.locale);
      } catch {
        // Provider content and token details must never enter application logs.
        result = { status: "unknown", removeDevice: false };
      }
      await ctx.runMutation(internal.pushState.finish, { id, ...result });
    }
    return null;
  },
});

export const receipt = internalAction({
  args: { id: v.id("pushDeliveries"), receiptId: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const config = pushEnv();
    if (config.expo) {
      try {
        const response = await fetch(
          "https://exp.host/--/api/v2/push/getReceipts",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${config.expoAccessToken ?? ""}`,
            },
            body: JSON.stringify({ ids: [args.receiptId] }),
            signal: AbortSignal.timeout(8000),
            redirect: "error",
          },
        );
        if (response.ok) {
          const parsed = z
            .object({ data: z.record(z.string(), expoResult) })
            .safeParse(await response.json());
          if (parsed.success) {
            const result = new Map(Object.entries(parsed.data.data)).get(
              args.receiptId,
            );
            if (result)
              await ctx.runMutation(internal.pushState.receipt, {
                ...args,
                rejected: result.status === "error",
                removeDevice: result.details?.error === "DeviceNotRegistered",
              });
          }
        }
      } catch {
        /* Receipt polling is best-effort; acceptance is not delivery proof. */
      }
    }
    return null;
  },
});
