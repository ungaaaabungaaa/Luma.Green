/**
 * Writes convex/betterAuth/generatedSchema.ts from the Better Auth options in
 * convex/auth.ts, so the component's tables match the plugins we use. Our own
 * additions (extra indexes) live in convex/betterAuth/schema.ts.
 *
 * Run after adding, removing or upgrading a Better Auth plugin:
 *   pnpm auth:schema && npx convex dev --once
 */
import { writeFile } from "node:fs/promises";

import { betterAuth } from "better-auth/minimal";
import { format, resolveConfig } from "prettier";

import { createAuthOptions } from "../convex/auth";

const OUTPUT = "convex/betterAuth/generatedSchema.ts";

// Describing the tables needs the options only, not a live Convex context.
const auth = betterAuth(createAuthOptions({} as never));
const context = await auth.$context;
const schema = await context.adapter.createSchema?.(context.options, OUTPUT);
if (!schema) throw new Error("The Convex adapter can't generate a schema.");

// The generator suggests Better Auth's CLI; this script is how we regenerate.
const code = schema.code.replace(/npx auth generate[^\n]*/, "pnpm auth:schema");
const prettierOptions = await resolveConfig(OUTPUT);
await writeFile(
  OUTPUT,
  await format(code, { ...prettierOptions, filepath: OUTPUT }),
);
console.warn(`Wrote ${OUTPUT}`);
