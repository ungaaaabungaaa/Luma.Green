import type { FunctionReturnType } from "convex/server";

import type { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { NOW } from "./fixtures";

type InboxItem = FunctionReturnType<typeof api.inbox.list>["page"][number];

/** No names, contact details, tokens or real record identifiers enter this fixture. */
export const inboxItems: InboxItem[] = [
  {
    id: "guide-inbox-pickup" as Id<"inbox">,
    event: "booking_confirmed",
    createdAt: NOW - 300_000,
    read: false,
  },
  {
    id: "guide-inbox-application" as Id<"inbox">,
    event: "application_received",
    createdAt: NOW - 3_600_000,
    read: false,
  },
  {
    id: "guide-inbox-approved" as Id<"inbox">,
    event: "application_approved",
    createdAt: NOW - 86_400_000,
    read: true,
  },
];

export function inboxFixture(search: string) {
  const state = new URLSearchParams(search).get("inbox");
  const results = state === "empty" || state === "loading" ? [] : inboxItems;
  return {
    results,
    status: state === "loading" ? "LoadingFirstPage" : "Exhausted",
    unreadCount: results.filter((item) => !item.read).length,
  };
}

export function securityFixture(
  search: string,
): FunctionReturnType<typeof api.identity.me> {
  return {
    kind: "member",
    phone: undefined,
    locale: undefined,
    adminName: undefined,
    hasProfile: true,
    hasPassword: new URLSearchParams(search).has("phone"),
    twoFactorEnabled: new URLSearchParams(search).get("security") === "on",
  };
}
