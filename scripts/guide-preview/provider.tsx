import type { ReactNode } from "react";

/** Isolated fixtures use only the local query adapters, never a Convex client. */
export const isConvexConfigured = true;
export function ConvexClientProvider({ children }: { children: ReactNode }) {
  return children;
}
