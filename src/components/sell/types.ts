import type { FunctionReturnType } from "convex/server";

import type { api } from "../../../convex/_generated/api";

/** A material in the catalogue, as the /sell screens get it. */
export type Material = FunctionReturnType<
  typeof api.catalogue.materials
>[number];

/** One shop and its offer for the household's basket. */
export type ShopOffer = FunctionReturnType<typeof api.households.shops>[number];

/** Today's price per kg by material code, in paise. */
export type PriceMap = ReadonlyMap<string, number>;
