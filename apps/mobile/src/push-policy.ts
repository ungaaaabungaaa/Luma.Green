import type { Locale } from "../../../src/i18n/locales.ts";
import { classifyNavigation } from "./navigation.ts";

export interface PushRequest {
  type: "luma.push.enable" | "luma.push.status";
  requestId: string;
}

export interface PushResult {
  requestId: string;
  status: "granted" | "denied" | "unavailable" | "error";
  token?: string;
}

/** A token is sent only to the exact trusted document which requested it. */
export function parsePushRequest(
  raw: string,
  frameUrl: string,
  topUrl: string,
  origin: string,
): PushRequest | null {
  if (
    frameUrl !== topUrl ||
    raw.length > 256 ||
    classifyNavigation(frameUrl, origin) !== "internal"
  )
    return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== "object" || Object.keys(value).length !== 2)
      return null;
    return !("type" in value) ||
      (value.type !== "luma.push.enable" &&
        value.type !== "luma.push.status") ||
      !("requestId" in value) ||
      typeof value.requestId !== "string" ||
      !/^[\w-]{1,64}$/.test(value.requestId)
      ? null
      : { type: value.type, requestId: value.requestId };
  } catch {
    return null;
  }
}

export function runtimePushProject(extra: unknown): string | undefined {
  if (
    !extra ||
    typeof extra !== "object" ||
    !("pushEnabled" in extra) ||
    extra.pushEnabled !== true ||
    !("eas" in extra)
  )
    return undefined;
  const eas = extra.eas;
  if (
    !eas ||
    typeof eas !== "object" ||
    !("projectId" in eas) ||
    typeof eas.projectId !== "string"
  )
    return undefined;
  return /^[\da-f]{8}-[\da-f]{4}-[1-8][\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/i.test(
    eas.projectId,
  )
    ? eas.projectId
    : undefined;
}

export function pushResultScript(
  documentUrl: string,
  result: PushResult,
): string {
  return `if(window.top===window&&window.location.href===${JSON.stringify(documentUrl)}){document.dispatchEvent(new CustomEvent('luma-push-result',{detail:${JSON.stringify(result)}}));}true;`;
}

export function pushSignalScript(
  documentUrl: string,
  signal: "ready" | "changed",
): string {
  return `if(window.top===window&&window.location.href===${JSON.stringify(documentUrl)}){document.dispatchEvent(new CustomEvent('luma-push-${signal}'));}true;`;
}

/** Remote payloads never choose a URL, record or executable native command. */
export function notificationDestination(
  origin: string,
  locale: Locale,
): string {
  const prefix = locale === "en" ? "" : locale + "/";
  return `${origin}/${prefix}account/notifications`;
}
