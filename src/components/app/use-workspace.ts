"use client";

import type { FunctionReturnType } from "convex/server";

import { useSignedInQuery } from "@/components/providers/use-signed-in-query";

import { api } from "../../../convex/_generated/api";

export type Workspace = NonNullable<
  FunctionReturnType<typeof api.workspace.mine>
>;
export type OrgWorkspace = Extract<Workspace, { kind: "org" }>["org"];

/**
 * Where the signed-in person works: undefined while loading, null when
 * signed out. The app shell has already handled both before any page runs,
 * so pages can rely on `useOrg()` / `useSaathi()`.
 */
export function useWorkspace() {
  return useSignedInQuery(api.workspace.mine);
}
