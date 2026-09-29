"use client";

import { useConvexAuth, useQuery } from "convex/react";
import type { FunctionReference, FunctionReturnType } from "convex/server";

type SignedInQuery = FunctionReference<
  "query",
  "public",
  Record<string, never>
>;

/**
 * A no-argument query about the signed-in person: undefined while Convex is
 * still loading the session or the result, null once it knows nobody is
 * signed in.
 *
 * A plain `useQuery` can run before the auth token arrives and answer as if
 * the person were signed out, which sent signed-in people back to the login
 * page on a fresh page load.
 */
export function useSignedInQuery<Query extends SignedInQuery>(
  query: Query,
): FunctionReturnType<Query> | null | undefined {
  const { isLoading, isAuthenticated } = useConvexAuth();
  const result = useQuery(query, isAuthenticated ? {} : "skip");
  if (isLoading) return undefined;
  return isAuthenticated ? result : null;
}
