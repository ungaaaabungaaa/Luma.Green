import { defineComponent } from "convex/server";

/**
 * Better Auth's tables — users, sessions, SMS codes, two-factor secrets —
 * installed locally so the schema follows the plugins in convex/auth.ts.
 * See https://labs.convex.dev/better-auth/features/local-install.
 */
const component = defineComponent("betterAuth");

export default component;
