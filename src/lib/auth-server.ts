import { convexBetterAuthNextJs } from "@convex-dev/better-auth/nextjs";

import { convexSiteUrlFrom } from "./convex-urls";
import { clientEnv } from "./env";

const convexUrl = clientEnv.NEXT_PUBLIC_CONVEX_URL;
// Set locally by `npx convex dev`; on Vercel builds only the `.cloud` URL is
// injected, so derive the `.site` one from it.
const convexSiteUrl =
  clientEnv.NEXT_PUBLIC_CONVEX_SITE_URL ??
  (convexUrl ? convexSiteUrlFrom(convexUrl) : undefined);

/**
 * Server helpers for Better Auth on Convex: the `/api/auth` handler, token and
 * session checks for server layouts, and authenticated Convex calls.
 *
 * Undefined until Convex is configured — every variable is optional
 * (AGENTS.md), so a fresh clone and CI build without it.
 */
export const authServer =
  convexUrl && convexSiteUrl
    ? convexBetterAuthNextJs({ convexUrl, convexSiteUrl })
    : undefined;
