"use client";

import { useNow } from "next-intl";

import {
  type OrgWorkspace,
  useWorkspace,
} from "@/components/app/use-workspace";

import { indiaToday } from "../../../convex/lib/onboarding";

/**
 * The signed-in person's business: undefined while loading, null for someone
 * without one (a Saathi). Pages pass "skip" to their queries until it's known,
 * so a query never runs for the wrong person.
 */
export function useBusiness(): OrgWorkspace | null | undefined {
  const workspace = useWorkspace();
  if (workspace === undefined) return undefined;
  return workspace?.kind === "org" ? workspace.org : null;
}

/** The kabadiwala's shop, or null when this business isn't one. */
export function useShop(): OrgWorkspace | null | undefined {
  const business = useBusiness();
  if (business === undefined) return undefined;
  return business?.kind === "kabadiwala" ? business : null;
}

/** Today's date in India (YYYY-MM-DD), kept current while the page is open. */
export function useIndiaToday(): string {
  const now = useNow({ updateInterval: 60_000 });
  return indiaToday(now.getTime());
}
