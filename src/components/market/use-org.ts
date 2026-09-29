"use client";

import {
  type OrgWorkspace,
  useWorkspace,
} from "@/components/app/use-workspace";

/** The signed-in person's business, or null (a Saathi, or still loading). */
export function useOrg(): OrgWorkspace | null {
  const workspace = useWorkspace();
  return workspace?.kind === "org" ? workspace.org : null;
}
