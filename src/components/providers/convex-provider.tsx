"use client";

import { ConvexProvider, ConvexReactClient } from "convex/react";
import { type ReactNode, useState } from "react";

import { clientEnv } from "@/lib/env";

/**
 * Convex is optional until `NEXT_PUBLIC_CONVEX_URL` is set, so a fresh clone
 * (and CI) builds and renders without a Convex deployment. Once the URL is
 * present every `useQuery` below this provider is live.
 */
export function ConvexClientProvider({ children }: { children: ReactNode }) {
  const url = clientEnv.NEXT_PUBLIC_CONVEX_URL;
  const [client] = useState(() =>
    url ? new ConvexReactClient(url) : undefined,
  );

  if (!client) return <>{children}</>;

  return <ConvexProvider client={client}>{children}</ConvexProvider>;
}
