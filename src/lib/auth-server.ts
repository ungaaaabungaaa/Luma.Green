import { convexBetterAuthNextJs } from "@convex-dev/better-auth/nextjs";
import { headers } from "next/headers";

import { hasAuthSession } from "./auth-session";
import { convexSiteUrlFrom } from "./convex-urls";
import { clientEnv } from "./env";

const convexUrl = clientEnv.NEXT_PUBLIC_CONVEX_URL;
// Set locally by `npx convex dev`; on Vercel builds only the `.cloud` URL is
// injected, so derive the `.site` one from it.
const convexSiteUrl =
  clientEnv.NEXT_PUBLIC_CONVEX_SITE_URL ??
  (convexUrl ? convexSiteUrlFrom(convexUrl) : undefined);

/**
 * Better Auth's `/api/auth` proxy. Server route checks use hasServerSession
 * below so a failed token request cannot be mistaken for a confirmed sign-out.
 *
 * Undefined until Convex is configured — every variable is optional
 * (AGENTS.md), so a fresh clone and CI build without it.
 */
export const authServer =
  convexUrl && convexSiteUrl
    ? convexBetterAuthNextJs({ convexUrl, convexSiteUrl })
    : undefined;

/** Preserve HTTP availability failures; the SDK's boolean helper discards them. */
export async function hasServerSession() {
  if (!convexUrl || !convexSiteUrl) return false;
  const incoming = new Headers(await headers());
  return hasAuthSession(convexSiteUrl, incoming);
}
