import type { ReactNode } from "react";

/** Select the component's data branch without creating any backend connection. */
export const isConvexConfigured = true;
export function ConvexClientProvider({ children }: { children: ReactNode }) {
  return children;
}
