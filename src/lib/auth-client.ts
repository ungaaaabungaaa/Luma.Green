import { convexClient } from "@convex-dev/better-auth/client/plugins";
import { phoneNumberClient, twoFactorClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

/**
 * Browser side of sign-in (docs/architecture/auth.md). Requests go to
 * `/api/auth/*` on our own origin, which Next.js proxies to Convex.
 *
 * Sign-in, sign-up and sign-out must happen in the browser, through this
 * client — never from a server component.
 */
export const authClient = createAuthClient({
  plugins: [convexClient(), phoneNumberClient(), twoFactorClient()],
});
