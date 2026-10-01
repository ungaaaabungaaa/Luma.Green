import { type FunctionReference, getFunctionName } from "convex/server";

import {
  complianceFixture,
  fixtures,
  offersFixture,
  tradesFixture,
  workspaceFixture,
} from "./fixtures";

/** No Convex client or connection is created in this documentation-only process. */
export function useQuery(
  query: FunctionReference<"query">,
  args?: unknown,
): unknown {
  if (args === "skip") return undefined;
  const name = getFunctionName(query);
  if (name === "workspace:mine") return workspaceFixture();
  if (name === "market:browse") return offersFixture();
  if (
    name === "market:trades" &&
    window.location.pathname.endsWith("/app/trades")
  )
    return tradesFixture;
  if (name === "insights:compliance") return complianceFixture;
  if (!Object.hasOwn(fixtures, name))
    throw new Error(`Missing documentation fixture: ${name}`);
  return fixtures[name];
}
export function useConvexAuth() {
  return { isLoading: false, isAuthenticated: true };
}
function rejectWrite() {
  return Promise.reject(
    new Error("Documentation fixture: writes are disabled."),
  );
}
export function useMutation() {
  return rejectWrite;
}
export const useAction = useMutation;
