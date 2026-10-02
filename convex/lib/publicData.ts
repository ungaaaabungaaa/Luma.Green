import { v } from "convex/values";
import { z } from "zod";

/** Coarse city centres only. No household or device location leaves Convex. */
export const PUBLIC_DATA_CITIES = [
  { id: "bengaluru", providerCity: "Bengaluru", lat: 12.97, lon: 77.59 },
  { id: "delhi", providerCity: "Delhi", lat: 28.61, lon: 77.21 },
  { id: "mumbai", providerCity: "Mumbai", lat: 19.08, lon: 72.88 },
  { id: "chennai", providerCity: "Chennai", lat: 13.08, lon: 80.27 },
  { id: "hyderabad", providerCity: "Hyderabad", lat: 17.39, lon: 78.49 },
  { id: "kolkata", providerCity: "Kolkata", lat: 22.57, lon: 88.36 },
] as const;
export const vPublicDataCity = v.union(
  v.literal("bengaluru"),
  v.literal("delhi"),
  v.literal("mumbai"),
  v.literal("chennai"),
  v.literal("hyderabad"),
  v.literal("kolkata"),
);
export const vPublicDataProvider = v.union(
  v.literal("met_norway"),
  v.literal("cpcb"),
);
export type PublicDataCity = typeof vPublicDataCity.type;
export type PublicDataProvider = typeof vPublicDataProvider.type;
export const HOUR_MS = 60 * 60 * 1000;
export const AIR_RECORD_LIMIT = 100;
export const vWeatherData = v.object({
  kind: v.literal("weather"),
  forecastAt: v.number(),
  tempC: v.number(),
  humidityPercent: v.number(),
  windMetersPerSecond: v.number(),
  precipitationMm: v.union(v.number(), v.null()),
});
export const vAirData = v.object({
  kind: v.literal("air"),
  readings: v.array(
    v.object({
      station: v.string(),
      pollutant: v.string(),
      average: v.number(),
      unit: v.union(v.string(), v.null()),
      measuredAt: v.number(),
    }),
  ),
  truncated: v.boolean(),
});
export const vPublicData = v.union(vWeatherData, vAirData);
export type PublicData = typeof vPublicData.type;
export const publicDataFields = {
  provider: vPublicDataProvider,
  city: vPublicDataCity,
  attemptedAt: v.number(),
  nextAttemptAt: v.number(),
  fetchedAt: v.optional(v.number()),
  sourceUpdatedAt: v.optional(v.number()),
  lastModified: v.optional(v.string()),
  data: v.optional(vPublicData),
  lastResult: v.union(
    v.literal("fetching"),
    v.literal("ok"),
    v.literal("failed"),
  ),
};

export const PUBLIC_DATA_SOURCES = {
  weather: {
    name: "MET Norway",
    url: "https://api.met.no/weatherapi/locationforecast/2.0/documentation",
    licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
  },
  air: {
    name: "CPCB / data.gov.in",
    url: "https://www.data.gov.in/catalog/real-time-air-quality-index",
    licenseUrl: "https://www.data.gov.in/government-open-data-license-india",
  },
} as const;

const finite = z.number();
const forecastSchema = z.object({
  properties: z.object({
    meta: z.object({
      updated_at: z.string(),
      units: z.object({
        air_temperature: z.literal("celsius"),
        relative_humidity: z.literal("%"),
        wind_speed: z.literal("m/s"),
        precipitation_amount: z.literal("mm"),
      }),
    }),
    timeseries: z
      .array(
        z.object({
          time: z.string(),
          data: z.object({
            instant: z.object({
              details: z.object({
                air_temperature: finite.min(-100).max(70),
                relative_humidity: finite.min(0).max(100),
                wind_speed: finite.min(0).max(150),
              }),
            }),
            next_1_hours: z
              .object({
                details: z.object({
                  precipitation_amount: finite.min(0).max(1000),
                }),
              })
              .optional(),
          }),
        }),
      )
      .min(1)
      .max(300),
  }),
});

export function parseForecast(input: unknown, now: number) {
  const parsed = forecastSchema.safeParse(input);
  if (!parsed.success) return null;
  const sourceUpdatedAt = Date.parse(parsed.data.properties.meta.updated_at);
  if (!isValidSourceTime(sourceUpdatedAt, now)) return null;
  const selected = parsed.data.properties.timeseries
    .map((entry) => ({ ...entry, at: Date.parse(entry.time) }))
    .filter(
      (entry) =>
        Number.isFinite(entry.at) && Math.abs(entry.at - now) <= HOUR_MS,
    )
    .toSorted((a, b) => Math.abs(a.at - now) - Math.abs(b.at - now))
    .at(0);
  if (!selected) return null;
  const details = selected.data.instant.details;
  return {
    sourceUpdatedAt,
    data: {
      kind: "weather" as const,
      forecastAt: selected.at,
      tempC: details.air_temperature,
      humidityPercent: details.relative_humidity,
      windMetersPerSecond: details.wind_speed,
      precipitationMm:
        selected.data.next_1_hours?.details.precipitation_amount ?? null,
    },
  };
}

function isValidSourceTime(value: number, now: number) {
  return Number.isFinite(value) && value > 0 && value <= now + 5 * 60 * 1000;
}

/** The feed uses Indian Standard Time and dd-mm-yyyy, not US dates. */
export function parseCpcbTime(value: string) {
  const match = /^(\d{2})-(\d{2})-(\d{4}) (\d{2}):(\d{2}):(\d{2})$/.exec(value);
  if (!match) return NaN;
  const [, day, month, year, hour, minute, second] = match;
  const time = Date.parse(
    `${year}-${month}-${day}T${hour}:${minute}:${second}+05:30`,
  );
  if (!Number.isFinite(time)) return NaN;
  // Date.parse normalizes impossible dates such as 31 February. Reject them.
  const local = new Date(time + 330 * 60 * 1000).toISOString();
  return local.startsWith(`${year}-${month}-${day}T${hour}:${minute}:${second}`)
    ? time
    : NaN;
}

const airRecordSchema = z.object({
  country: z.literal("India"),
  city: z.string(),
  station: z.string().min(1).max(240),
  pollutant_id: z.string().min(1).max(30),
  pollutant_avg: z.union([z.string(), finite]),
  pollutant_unit: z.string().max(40).optional(),
  last_update: z.string(),
});
const airSchema = z.object({
  total: z.union([finite, z.string()]).optional(),
  records: z.array(z.unknown()).max(AIR_RECORD_LIMIT),
});

export function parseAirReadings(
  input: unknown,
  city: PublicDataCity,
  now: number,
) {
  const parsed = airSchema.safeParse(input);
  if (!parsed.success) return null;
  const providerCity = PUBLIC_DATA_CITIES.find(
    (entry) => entry.id === city,
  )?.providerCity;
  const readings: (typeof vAirData.type)["readings"] = [];
  for (const raw of parsed.data.records) {
    const entry = airRecordSchema.safeParse(raw);
    if (!entry.success || entry.data.city !== providerCity) continue;
    const row = entry.data;
    if (
      typeof row.pollutant_avg === "string" &&
      row.pollutant_avg.trim() === ""
    )
      continue;
    const average = Number(row.pollutant_avg);
    const measuredAt = parseCpcbTime(row.last_update);
    if (
      !Number.isFinite(average) ||
      average < 0 ||
      !isValidSourceTime(measuredAt, now)
    )
      continue;
    const unit = row.pollutant_unit?.trim();
    readings.push({
      station: row.station,
      pollutant: row.pollutant_id,
      average,
      unit: unit && unit !== "NA" ? unit : null,
      measuredAt,
    });
  }
  if (readings.length === 0) return null;
  return {
    sourceUpdatedAt: Math.min(...readings.map((row) => row.measuredAt)),
    data: {
      kind: "air" as const,
      readings,
      truncated:
        Number(parsed.data.total ?? 0) > parsed.data.records.length ||
        parsed.data.records.length === AIR_RECORD_LIMIT,
    },
  };
}

export function publicDataStatus(
  input: {
    enabled: boolean;
    fetchedAt?: number;
    sourceUpdatedAt?: number;
    data?: PublicData;
  },
  now: number,
): "disabled" | "unavailable" | "fresh" | "stale" {
  if (!input.enabled) return "disabled";
  if (
    !input.data ||
    input.fetchedAt === undefined ||
    input.sourceUpdatedAt === undefined ||
    now - input.sourceUpdatedAt > 24 * HOUR_MS
  )
    return "unavailable";
  if (now - input.fetchedAt > 2 * HOUR_MS) return "stale";
  if (input.data.kind === "weather") {
    return now - input.sourceUpdatedAt > 12 * HOUR_MS ||
      Math.abs(now - input.data.forecastAt) > HOUR_MS
      ? "stale"
      : "fresh";
  }
  return now - input.sourceUpdatedAt > 3 * HOUR_MS ? "stale" : "fresh";
}

/** Honor provider expiry. Even a failure cannot cause a retry within one hour. */
export function nextFetchAt(now: number, expires: string | null) {
  const expiry = expires ? Date.parse(expires) : NaN;
  return Number.isFinite(expiry)
    ? Math.max(now + HOUR_MS, expiry)
    : now + HOUR_MS;
}

export async function readBoundedJson(response: Response): Promise<unknown> {
  const limit = 256 * 1024;
  if (Number(response.headers.get("content-length")) > limit || !response.body)
    throw new Error("INVALID_PUBLIC_DATA");
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const result = await reader.read();
      if (result.done) break;
      size += result.value.byteLength;
      if (size > limit) throw new Error("INVALID_PUBLIC_DATA");
      chunks.push(result.value);
    }
  } finally {
    await reader.cancel();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  return JSON.parse(new TextDecoder().decode(bytes)) as unknown;
}
