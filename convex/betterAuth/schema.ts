import { defineSchema } from "convex/server";

import { tables } from "./generatedSchema";

/**
 * Better Auth's tables (generated — `pnpm auth:schema`) plus our additions.
 * Regenerating never touches this file.
 */
export default defineSchema({
  ...tables,
  // The database rate limiter deletes old rows by `lastRequest` on every
  // request; without this index each delete scans the whole table.
  rateLimit: tables.rateLimit.index("lastRequest", ["lastRequest"]),
});
