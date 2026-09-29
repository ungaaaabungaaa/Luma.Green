"use client";

import { useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";

import { api } from "../../../convex/_generated/api";

export type Mine = FunctionReturnType<typeof api.applications.mine>;
export type Application = NonNullable<NonNullable<Mine>["application"]>;
export type FileSummary = Application["files"][number];

/**
 * The signed-in person and their application: `undefined` while loading,
 * `null` when signed out.
 */
export function useMine(): Mine | undefined {
  return useQuery(api.applications.mine);
}
