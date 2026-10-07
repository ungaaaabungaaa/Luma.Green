"use client";

import {
  type AuthClient,
  ConvexBetterAuthProvider,
} from "@convex-dev/better-auth/react";
import { ConvexReactClient } from "convex/react";
import { type ReactNode, useState } from "react";

import { authClient } from "@/lib/auth-client";
import { clientEnv } from "@/lib/env";

/**
 * @convex-dev/better-auth 0.12 types this prop against better-auth 1.6.15;
 * with 1.6.33 and our plugins the inferred session type no longer lines up,
 * though the runtime contract (useSession, convex.token) is the same.
 * Revisit when either package is bumped.
 */
const providerAuthClient = authClient as unknown as AuthClient;

/** True when this build talks to a Convex deployment. */
export const isConvexConfigured = Boolean(clientEnv.NEXT_PUBLIC_CONVEX_URL);

/**
 * Convex is optional until `NEXT_PUBLIC_CONVEX_URL` is set, so a fresh clone
 * (and CI) builds and renders without a Convex deployment. Once the URL is
 * present every `useQuery` below this provider is live, and signed in through
 * Better Auth. Components that call Convex must check `isConvexConfigured`
 * first.
 */
export function ConvexClientProvider({ children }: { children: ReactNode }) {
  const url = clientEnv.NEXT_PUBLIC_CONVEX_URL;
  const [client] = useState(() =>
    url ? new ConvexReactClient(url) : undefined,
  );

  return client ? (
    <IdentityProvider client={client}>{children}</IdentityProvider>
  ) : (
    <>{children}</>
  );
}

/** Preserve initial public sign-in work; reset when a previous private identity leaves. */
function IdentityProvider({
  client,
  children,
}: {
  client: ConvexReactClient;
  children: ReactNode;
}) {
  const session = authClient.useSession();
  const userId = session.data?.user.id ?? null;
  const [boundary, setBoundary] = useState({ userId, generation: 0 });
  if (boundary.userId !== userId) {
    // React rerenders this component before its children. Initial sign-in has
    // no earlier private identity, so keep the public OTP/booking continuation.
    setBoundary({
      userId,
      generation: boundary.generation + (boundary.userId === null ? 0 : 1),
    });
  }
  return (
    <ConvexBetterAuthProvider
      key={boundary.generation}
      client={client}
      authClient={providerAuthClient}
    >
      {children}
    </ConvexBetterAuthProvider>
  );
}
