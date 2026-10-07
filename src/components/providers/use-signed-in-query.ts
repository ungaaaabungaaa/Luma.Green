"use client";

import { useConvexAuth, useQuery } from "convex/react";
import type { FunctionReference, FunctionReturnType } from "convex/server";

import { authClient } from "@/lib/auth-client";
import { AuthServiceUnavailable } from "@/lib/auth-session";

type SignedInQuery = FunctionReference<
  "query",
  "public",
  Record<string, never>
>;

/**
 * A no-argument query about the signed-in person: undefined while Convex is
 * still loading the session or the result, null once it knows nobody is
 * signed in. A valid Better Auth session whose Convex token could not be
 * confirmed uses the route's recovery boundary instead of claiming sign-out.
 *
 * A plain `useQuery` can run before the auth token arrives and answer as if
 * the person were signed out, which sent signed-in people back to the login
 * page on a fresh page load.
 */
export function useSignedInQuery<Query extends SignedInQuery>(
  query: Query,
): FunctionReturnType<Query> | null | undefined {
  const { isPending, isReady } = useVerifiedSession();
  const result = useQuery(query, isReady ? {} : "skip");
  if (isPending) return undefined;
  return isReady ? result : null;
}

/** Both services must confirm identity before private subscriptions can mount. */
export function useVerifiedSession() {
  const { isLoading, isAuthenticated } = useConvexAuth();
  const session = authClient.useSession();
  const isPending = isLoading || session.isPending;
  const isDenied =
    session.error?.status === 401 || session.error?.status === 403;
  if (
    !isPending &&
    !isDenied &&
    (session.error || (!isAuthenticated && session.data))
  )
    throw new AuthServiceUnavailable();
  return {
    isPending,
    isReady:
      !isPending && !isDenied && isAuthenticated && Boolean(session.data),
    userId: session.data?.user.id,
  };
}
