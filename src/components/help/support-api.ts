import type { FunctionArgs } from "convex/server";

import type { api } from "../../../convex/_generated/api";

/**
 * The contact form's side of `support.send` (`convex/support.ts`). Types come
 * from the generated API, so a change to the server's validators shows up
 * here as a compile error rather than a refused message.
 */
export type SupportMessage = FunctionArgs<typeof api.support.send>;
export type SupportRole = SupportMessage["role"];
export type SupportTopic = SupportMessage["topic"];

/** In the order the form offers them. */
export const SUPPORT_ROLES = [
  "household",
  "kabadiwala",
  "yard",
  "recycler",
  "manufacturer",
  "saathi",
  "other",
] as const satisfies readonly SupportRole[];

export const SUPPORT_TOPICS = [
  "account",
  "pickup",
  "prices",
  "payments",
  "documents",
  "trade",
  "solar",
  "other",
] as const satisfies readonly SupportTopic[];

/** Compile error if the server accepts a role or topic the form can't offer. */
type Covers<Missing extends never> = Missing;
export type SupportRolesCovered = Covers<
  Exclude<SupportRole, (typeof SUPPORT_ROLES)[number]>
>;
export type SupportTopicsCovered = Covers<
  Exclude<SupportTopic, (typeof SUPPORT_TOPICS)[number]>
>;

export function isSupportRole(value: string | null): value is SupportRole {
  return (SUPPORT_ROLES as readonly (string | null)[]).includes(value);
}

export function isSupportTopic(value: string | null): value is SupportTopic {
  return (SUPPORT_TOPICS as readonly (string | null)[]).includes(value);
}
