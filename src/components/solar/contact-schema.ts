import { ConvexError } from "convex/values";
import { z } from "zod";

import { normalizeIndianMobile } from "../../../convex/lib/phone";
import type { SolarKind } from "./calc";

/**
 * The "Talk to us" form, checked the way `support.send` checks it on the
 * server, so a message the form accepts is one the server accepts. Error
 * messages are keys under `solar.contact.errors`.
 */
export const contactSchema = z.object({
  name: z.string().trim().min(2, "name").max(80, "name"),
  phone: z
    .string()
    .refine((value) => normalizeIndianMobile(value) !== null, "phone"),
  message: z.string().trim().min(5, "message").max(1000, "message"),
});

export type ContactValues = z.infer<typeof contactSchema>;
export type ContactField = keyof ContactValues;

/** Solar enquiries arrive in the admin's inbox tagged by who asked. */
export function supportRoleFor(kind: SolarKind): "household" | "other" {
  return kind === "home" ? "household" : "other";
}

/** `support.send`'s refusal codes, by the field they are about. */
const serverCodes: Partial<Record<string, ContactField>> = {
  INVALID_NAME: "name",
  INVALID_PHONE: "phone",
  INVALID_MESSAGE: "message",
};

/** The field the server refused, or null for any other failure. */
export function fieldForError(error: unknown): ContactField | null {
  const code =
    error instanceof ConvexError && typeof error.data === "string"
      ? error.data
      : "";
  return serverCodes[code] ?? null;
}
