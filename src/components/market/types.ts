import type { FunctionReturnType } from "convex/server";

import type { api } from "../../../convex/_generated/api";

/** Result shapes of the market functions, as the screens use them. */

export type ListingView = FunctionReturnType<typeof api.market.browse>[number];

export type TradeView = FunctionReturnType<
  typeof api.market.trades
>["buying"][number];

export type SellableItem = FunctionReturnType<
  typeof api.market.sellable
>[number];

export type TradeReceipt = NonNullable<
  FunctionReturnType<typeof api.market.receipt>
>;

export type TradeSide = "buyer" | "seller";
export type TradeStatus = TradeView["status"];
export type TradeAction = TradeView["actions"][number];
