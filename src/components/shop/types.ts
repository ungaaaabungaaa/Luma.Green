import type { FunctionReturnType } from "convex/server";

import type { api } from "../../../convex/_generated/api";

/** Result shapes of the shop's queries, named for the screens. */

export type Requests = FunctionReturnType<typeof api.shop.requests>;
export type BookingView = Requests["new"][number];
export type MaterialRef = BookingView["items"][number]["material"];
export type BookingDetail = NonNullable<
  FunctionReturnType<typeof api.shop.get>
>;
export type RateCard = FunctionReturnType<typeof api.shop.rateCard>;
export type RateCardRow = RateCard["rows"][number];
export type Payouts = FunctionReturnType<typeof api.shop.payouts>;
export type Stock = FunctionReturnType<typeof api.stock.mine>;
export type StockRow = Stock["rows"][number];
