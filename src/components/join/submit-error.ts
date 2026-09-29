import { ConvexError } from "convex/values";

/**
 * What to tell someone whose "Send" didn't go through: a `join.errors` key,
 * or `fixErrors` (under `join.form`) when the server found gaps the form
 * missed.
 */
export function submitErrorKey(error: unknown): "fixErrors" | "generic" {
  return error instanceof ConvexError &&
    typeof error.data === "object" &&
    error.data !== null &&
    (error.data as { code?: unknown }).code === "INCOMPLETE"
    ? "fixErrors"
    : "generic";
}
