"use client";

import {
  type OrgWorkspace,
  useWorkspace,
} from "@/components/app/use-workspace";

/**
 * The signed-in person's business: undefined while loading, null for someone
 * without one (a Saathi). The app shell has already sent signed-out people
 * to the login page.
 */
export function useBusiness(): OrgWorkspace | null | undefined {
  const workspace = useWorkspace();
  if (workspace === undefined) return undefined;
  return workspace?.kind === "org" ? workspace.org : null;
}
