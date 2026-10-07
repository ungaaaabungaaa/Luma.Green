import { v } from "convex/values";

import { query } from "./_generated/server";
import { searchIndustryReference } from "./lib/industryReference";
import { requireOrg } from "./lib/workspace";

export const search = query({
  args: {
    kind: v.union(
      v.literal("sectors"),
      v.literal("industries"),
      v.literal("lifecycles"),
      v.literal("byproducts"),
    ),
    search: v.string(),
    offset: v.optional(v.number()),
  },
  returns: v.object({
    sourceQuality: v.literal("workbook_unverified"),
    sourceLanguage: v.literal("en"),
    sourceWorkbook: v.string(),
    total: v.number(),
    nextOffset: v.union(v.number(), v.null()),
    items: v.array(
      v.object({
        id: v.string(),
        title: v.string(),
        subtitle: v.string(),
        sheet: v.string(),
        row: v.number(),
        details: v.array(v.object({ key: v.string(), value: v.string() })),
      }),
    ),
  }),
  handler: async (ctx, args) => {
    await requireOrg(ctx, undefined, "read");
    return searchIndustryReference(args.kind, args.search, args.offset);
  },
});
