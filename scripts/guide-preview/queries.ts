import { type FunctionReference, getFunctionName } from "convex/server";

import { inboxFixture, securityFixture } from "./account-fixtures";
import {
  complianceFixture,
  fixtures,
  impactFixture,
  invoiceFixture,
  myListingsFixture,
  offersFixture,
  onboardingFixture,
  priceQuotesFixture,
  sellableFixture,
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
  if (name === "inbox:unreadCount")
    return inboxFixture(window.location.search).unreadCount;
  return name === "identity:me" &&
    window.location.pathname.endsWith("/account/security")
    ? securityFixture(window.location.search)
    : readFixture(name);
}
function readFixture(name: string): unknown {
  if (name === "workspace:mine") return workspaceFixture();
  if (name === "market:browse") return offersFixture();
  if (
    name === "market:trades" &&
    window.location.pathname.endsWith("/app/trades")
  )
    return tradesFixture;
  if (name === "insights:compliance") return complianceFixture;
  if (name === "insights:impact") return impactFixture;
  if (name === "market:receipt") return invoiceFixture;
  if (name === "market:sellable") return sellableFixture;
  if (name === "catalogue:priceQuotes") return priceQuotesFixture;
  if (name === "applications:mine") return onboardingFixture();
  if (
    name === "market:myListings" &&
    window.location.pathname.endsWith("/app/sell")
  )
    return myListingsFixture;
  if (!Object.hasOwn(fixtures, name))
    throw new Error(`Missing documentation fixture: ${name}`);
  return fixtures[name];
}
export function useConvexAuth() {
  return { isLoading: false, isAuthenticated: true };
}
export function usePaginatedQuery(query: FunctionReference<"query">) {
  const name = getFunctionName(query);
  if (name !== "inbox:list")
    throw new Error(`Missing paginated documentation fixture: ${name}`);
  const fixture = inboxFixture(window.location.search);
  return {
    results: fixture.results,
    status: fixture.status,
    loadMore: () => {
      throw new Error("Documentation fixture: pagination is exhausted.");
    },
  };
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
