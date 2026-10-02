import { ConvexError } from "convex/values";
import { z } from "zod";

import { normalizeIndianMobile } from "../../../convex/lib/phone";
import { SUPPORT_ROLES, SUPPORT_TOPICS } from "./support-api";

/** The longest message `support.send` accepts. */
export const MESSAGE_MAX = 1000;

/**
 * The contact form's rules — the same limits `support.send` checks on the
 * server, so a message the form lets through is one the server accepts.
 * Error messages are keys under `help.contact.errors`.
 */
export const contactSchema = z.object({
  name: z.string().trim().min(2, "nameInvalid").max(80, "nameInvalid"),
  phone: z
    .string()
    .refine((value) => normalizeIndianMobile(value) !== null, "phoneInvalid"),
  // Unanswered until they choose (or arrive with `?role=` / `?topic=`).
  role: z
    .enum(SUPPORT_ROLES, { error: "roleMissing" })
    .optional()
    .pipe(z.enum(SUPPORT_ROLES, { error: "roleMissing" })),
  topic: z
    .enum(SUPPORT_TOPICS, { error: "topicMissing" })
    .optional()
    .pipe(z.enum(SUPPORT_TOPICS, { error: "topicMissing" })),
  message: z
    .string()
    .trim()
    .min(5, "messageShort")
    .max(MESSAGE_MAX, "messageLong"),
});

export type ContactInput = z.input<typeof contactSchema>;
export type ContactValues = z.output<typeof contactSchema>;

export type ContactErrorKey =
  | "nameInvalid"
  | "phoneInvalid"
  | "rateLimited"
  | "roleMissing"
  | "topicMissing"
  | "messageShort"
  | "messageLong"
  | "generic";

/**
 * Which field a refusal from `support.send` belongs to, or null when it's
 * not one of the server's validation errors (network, outage, anything else).
 */
export function serverFieldError(
  error: unknown,
): { field: "name" | "phone" | "message"; key: ContactErrorKey } | null {
  if (!(error instanceof ConvexError)) return null;
  const data: unknown = error.data;
  if (data === "INVALID_NAME") return { field: "name", key: "nameInvalid" };
  if (data === "INVALID_PHONE") return { field: "phone", key: "phoneInvalid" };
  if (data === "SUPPORT_RATE_LIMITED")
    return { field: "phone", key: "rateLimited" };
  return data === "INVALID_MESSAGE"
    ? { field: "message", key: "messageShort" }
    : null;
}
