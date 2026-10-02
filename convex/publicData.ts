import { v } from "convex/values";

import { publicDataEnv } from "../src/lib/env";
import { internal } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";
import { internalAction, internalMutation, query } from "./_generated/server";
import {
  AIR_RECORD_LIMIT,
  HOUR_MS,
  nextFetchAt,
  parseAirReadings,
  parseForecast,
  PUBLIC_DATA_CITIES,
  type PublicData,
  type PublicDataCity,
  type PublicDataProvider,
  publicDataStatus,
  readBoundedJson,
  vAirData,
  vPublicData,
  vPublicDataCity,
  vPublicDataProvider,
  vWeatherData,
} from "./lib/publicData";

const status = v.union(
  v.literal("disabled"),
  v.literal("unavailable"),
  v.literal("fresh"),
  v.literal("stale"),
);
const viewFields = {
  status,
  fetchedAt: v.union(v.number(), v.null()),
  sourceUpdatedAt: v.union(v.number(), v.null()),
};

function visibleData(
  row: Doc<"publicDataSnapshots"> | null,
  isEnabled: boolean,
) {
  const state = publicDataStatus({ ...row, enabled: isEnabled }, Date.now());
  return {
    status: state,
    fetchedAt: row?.fetchedAt ?? null,
    sourceUpdatedAt: row?.sourceUpdatedAt ?? null,
    data:
      state === "disabled" || state === "unavailable"
        ? null
        : (row?.data ?? null),
  };
}

/** Deliberately public, cache-only: no account, address or browser location. */
export const forCity = query({
  args: { city: vPublicDataCity },
  returns: v.object({
    weather: v.object({ ...viewFields, data: v.union(vWeatherData, v.null()) }),
    air: v.object({ ...viewFields, data: v.union(vAirData, v.null()) }),
  }),
  handler: async (ctx, { city }) => {
    const config = publicDataEnv();
    const weatherRow = await ctx.db
      .query("publicDataSnapshots")
      .withIndex("by_provider_city", (q) =>
        q.eq("provider", "met_norway").eq("city", city),
      )
      .unique();
    const airRow = await ctx.db
      .query("publicDataSnapshots")
      .withIndex("by_provider_city", (q) =>
        q.eq("provider", "cpcb").eq("city", city),
      )
      .unique();
    const weather = visibleData(weatherRow, config.weather !== null);
    const air = visibleData(airRow, config.air !== null);
    return {
      weather: {
        ...weather,
        data: weather.data?.kind === "weather" ? weather.data : null,
      },
      air: { ...air, data: air.data?.kind === "air" ? air.data : null },
    };
  },
});

/** Transactional rate gate also prevents overlapping manual/cron refreshes. */
export const claim = internalMutation({
  args: { city: vPublicDataCity, provider: vPublicDataProvider },
  returns: v.union(
    v.null(),
    v.object({
      attemptedAt: v.number(),
      lastModified: v.union(v.string(), v.null()),
    }),
  ),
  handler: async (ctx, args) => {
    const config = publicDataEnv();
    if (args.provider === "met_norway" ? !config.weather : !config.air)
      return null;
    const row = await ctx.db
      .query("publicDataSnapshots")
      .withIndex("by_provider_city", (q) =>
        q.eq("provider", args.provider).eq("city", args.city),
      )
      .unique();
    const now = Date.now();
    if (row && row.nextAttemptAt > now) return null;
    const fields = {
      ...args,
      attemptedAt: now,
      nextAttemptAt: now + HOUR_MS,
      lastResult: "fetching" as const,
    };
    if (row) await ctx.db.patch(row._id, fields);
    else await ctx.db.insert("publicDataSnapshots", fields);
    return { attemptedAt: now, lastModified: row?.lastModified ?? null };
  },
});

export const complete = internalMutation({
  args: {
    city: vPublicDataCity,
    provider: vPublicDataProvider,
    attemptedAt: v.number(),
    outcome: v.union(
      v.literal("success"),
      v.literal("not_modified"),
      v.literal("failed"),
    ),
    nextAttemptAt: v.number(),
    lastModified: v.optional(v.string()),
    sourceUpdatedAt: v.optional(v.number()),
    data: v.optional(vPublicData),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query("publicDataSnapshots")
      .withIndex("by_provider_city", (q) =>
        q.eq("provider", args.provider).eq("city", args.city),
      )
      .unique();
    if (row?.attemptedAt !== args.attemptedAt || row.lastResult !== "fetching")
      return false;
    const updates: Partial<Doc<"publicDataSnapshots">> = {
      nextAttemptAt: Math.max(row.nextAttemptAt, args.nextAttemptAt),
      lastResult: "failed",
    };
    if (
      args.outcome === "success" &&
      args.data &&
      args.sourceUpdatedAt !== undefined
    ) {
      const isRightKind =
        args.provider === "met_norway"
          ? args.data.kind === "weather"
          : args.data.kind === "air";
      if (isRightKind && args.sourceUpdatedAt >= (row.sourceUpdatedAt ?? 0)) {
        updates.data = args.data;
        updates.sourceUpdatedAt = args.sourceUpdatedAt;
        updates.fetchedAt = Date.now();
        updates.lastModified = args.lastModified;
        updates.lastResult = "ok";
      }
    } else if (args.outcome === "not_modified" && row.data) {
      // A 304 confirms transport, not a new forecast/measurement time.
      updates.lastResult = "ok";
      updates.fetchedAt = Date.now();
    }
    await ctx.db.patch(row._id, updates);
    await ctx.db.insert("auditLog", {
      action:
        updates.lastResult === "ok"
          ? "public_data.refreshed"
          : "public_data.failed",
      entityTable: "publicDataSnapshots",
      entityId: row._id,
      createdAt: Date.now(),
    });
    return true;
  },
});

interface FetchInput {
  city: PublicDataCity;
  provider: PublicDataProvider;
  attemptedAt: number;
  lastModified: string | null;
}
type FetchResult = { nextAttemptAt: number } & (
  | { outcome: "failed" | "not_modified" }
  | {
      outcome: "success";
      data: PublicData;
      sourceUpdatedAt: number;
      lastModified?: string;
    }
);

function sourceRequest(
  input: FetchInput,
  config: ReturnType<typeof publicDataEnv>,
) {
  const location = PUBLIC_DATA_CITIES.find((entry) => entry.id === input.city);
  if (!location) throw new Error("INVALID_CITY");
  const headers: Record<string, string> = { Accept: "application/json" };
  if (input.provider === "met_norway" && config.weather) {
    const url = new URL(
      "https://api.met.no/weatherapi/locationforecast/2.0/compact",
    );
    url.searchParams.set("lat", String(location.lat));
    url.searchParams.set("lon", String(location.lon));
    headers["User-Agent"] = config.weather.userAgent;
    if (input.lastModified) headers["If-Modified-Since"] = input.lastModified;
    return { url, headers };
  }
  if (!config.air || input.provider !== "cpcb")
    throw new Error("SOURCE_DISABLED");
  const url = new URL(
    `https://api.data.gov.in/resource/${config.air.resourceId}`,
  );
  url.searchParams.set("api-key", config.air.apiKey);
  url.searchParams.set("format", "json");
  url.searchParams.set("filters[city]", location.providerCity);
  url.searchParams.set("limit", String(AIR_RECORD_LIMIT));
  url.searchParams.set("offset", "0");
  return { url, headers };
}

async function fetchSource(
  input: FetchInput,
  config: ReturnType<typeof publicDataEnv>,
): Promise<FetchResult> {
  let nextAttemptAt = input.attemptedAt + HOUR_MS;
  try {
    const request = sourceRequest(input, config);
    const response = await fetch(request.url, {
      headers: request.headers,
      signal: AbortSignal.timeout(10_000),
      redirect: "error",
    });
    nextAttemptAt = nextFetchAt(
      input.attemptedAt,
      response.headers.get("expires"),
    );
    if (input.provider === "met_norway" && response.status === 304)
      return { nextAttemptAt, outcome: "not_modified" };
    if (!response.ok) throw new Error("PUBLIC_DATA_FETCH_FAILED");
    const body = await readBoundedJson(response);
    const parsed =
      input.provider === "met_norway"
        ? parseForecast(body, Date.now())
        : parseAirReadings(body, input.city, Date.now());
    if (!parsed) throw new Error("INVALID_PUBLIC_DATA");
    const lastModified = response.headers.get("last-modified");
    return {
      nextAttemptAt,
      outcome: "success",
      ...parsed,
      ...(lastModified && lastModified.length < 100 && { lastModified }),
    };
  } catch {
    // Store a fixed outcome only. Provider URLs/bodies can contain the API key.
    return { nextAttemptAt, outcome: "failed" };
  }
}

/** At most two bounded requests per registered city per hour. No browser trigger. */
export const refreshCity = internalAction({
  args: { city: vPublicDataCity },
  returns: v.number(),
  handler: async (ctx, { city }) => {
    const config = publicDataEnv();
    let attempts = 0;
    if (!config.weather && !config.air) return attempts;
    for (const provider of ["met_norway", "cpcb"] as const) {
      const lease = await ctx.runMutation(internal.publicData.claim, {
        city,
        provider,
      });
      if (!lease) continue;
      attempts += 1;
      const base = { city, provider, attemptedAt: lease.attemptedAt };
      const result = await fetchSource(
        { ...base, lastModified: lease.lastModified },
        config,
      );
      await ctx.runMutation(internal.publicData.complete, {
        ...base,
        ...result,
      });
    }
    return attempts;
  },
});
