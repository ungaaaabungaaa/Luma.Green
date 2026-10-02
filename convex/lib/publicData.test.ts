import { afterEach, describe, expect, it, vi } from "vitest";

import { publicDataEnv } from "../../src/lib/env";
import {
  HOUR_MS,
  nextFetchAt,
  parseAirReadings,
  parseCpcbTime,
  parseForecast,
  PUBLIC_DATA_CITIES,
  publicDataStatus,
  readBoundedJson,
} from "./publicData";

const now = Date.parse("2026-10-02T10:00:00Z");
const weather = {
  kind: "weather" as const,
  forecastAt: now,
  tempC: 25,
  humidityPercent: 60,
  windMetersPerSecond: 4,
  precipitationMm: 0,
};

afterEach(() => vi.unstubAllEnvs());

function forecast() {
  return {
    properties: {
      meta: {
        updated_at: "2026-10-02T08:00:00Z",
        units: {
          air_temperature: "celsius",
          relative_humidity: "%",
          wind_speed: "m/s",
          precipitation_amount: "mm",
        },
      },
      timeseries: [
        {
          time: "2026-10-02T10:00:00Z",
          data: {
            instant: {
              details: {
                air_temperature: 25,
                relative_humidity: 60,
                wind_speed: 4,
              },
            },
            next_1_hours: { details: { precipitation_amount: 0 } },
          },
        },
      ],
    },
  };
}

describe("public weather", () => {
  it("keeps source issue time distinct from forecast time", () => {
    expect(parseForecast(forecast(), now)).toEqual({
      sourceUpdatedAt: now - 2 * HOUR_MS,
      data: weather,
    });
  });
  it("rejects a changed unit contract and impossible physical values", () => {
    const wrongUnits = forecast();
    wrongUnits.properties.meta.units.air_temperature = "fahrenheit";
    expect(parseForecast(wrongUnits, now)).toBeNull();
    const bad = forecast();
    bad.properties.timeseries[0].data.instant.details.relative_humidity = 101;
    expect(parseForecast(bad, now)).toBeNull();
  });
  it("does not represent an old or future forecast as current", () => {
    expect(parseForecast(forecast(), now + 3 * HOUR_MS)).toBeNull();
    const future = forecast();
    future.properties.meta.updated_at = "2026-10-03T08:00:00Z";
    expect(parseForecast(future, now)).toBeNull();
  });
});

describe("CPCB station values", () => {
  const record = {
    country: "India",
    city: "Bengaluru",
    station: "Public station",
    pollutant_id: "PM2.5",
    pollutant_avg: "42",
    last_update: "02-10-2026 15:30:00",
  };
  it("reads Indian Standard Time and rejects invalid calendar dates", () => {
    expect(parseCpcbTime(record.last_update)).toBe(now);
    expect(parseCpcbTime("31-02-2026 15:30:00")).toBeNaN();
    expect(parseCpcbTime("2026-10-02T10:00:00Z")).toBeNaN();
  });
  it("does not infer pollutant units or calculate an AQI score", () => {
    const result = parseAirReadings({ records: [record] }, "bengaluru", now);
    expect(result).toEqual({
      sourceUpdatedAt: now,
      data: {
        kind: "air",
        truncated: false,
        readings: [
          {
            station: "Public station",
            pollutant: "PM2.5",
            average: 42,
            unit: null,
            measuredAt: now,
          },
        ],
      },
    });
  });
  it("ignores unavailable values, wrong-city records and future readings", () => {
    expect(
      parseAirReadings(
        {
          records: [
            { ...record, pollutant_avg: "NA" },
            { ...record, city: "Delhi" },
            { ...record, pollutant_avg: "" },
            { ...record, last_update: "03-10-2026 15:30:00" },
          ],
        },
        "bengaluru",
        now,
      ),
    ).toBeNull();
  });
  it("marks the bounded station sample and retains the oldest source time", () => {
    const result = parseAirReadings(
      {
        total: 140,
        records: [
          record,
          {
            ...record,
            pollutant_id: "NO2",
            pollutant_unit: "provider-unit",
            last_update: "02-10-2026 14:30:00",
          },
        ],
      },
      "bengaluru",
      now,
    );
    expect(result?.data.truncated).toBe(true);
    expect(result?.sourceUpdatedAt).toBe(now - HOUR_MS);
    expect(result?.data.readings[1]?.unit).toBe("provider-unit");
  });
});

it("freshness expires without waiting for another scheduled write", () => {
  const record = {
    enabled: true,
    fetchedAt: now,
    sourceUpdatedAt: now,
    data: weather,
  };
  expect(publicDataStatus(record, now)).toBe("fresh");
  expect(publicDataStatus(record, now + 2 * HOUR_MS)).toBe("stale");
  expect(publicDataStatus(record, now + 25 * HOUR_MS)).toBe("unavailable");
  expect(publicDataStatus({ ...record, enabled: false }, now)).toBe("disabled");
});

it("enforces the retry budget and provider cache expiry", () => {
  expect(PUBLIC_DATA_CITIES).toHaveLength(6);
  expect(nextFetchAt(now, null)).toBe(now + HOUR_MS);
  expect(nextFetchAt(now, "invalid")).toBe(now + HOUR_MS);
  expect(nextFetchAt(now, new Date(now + 4 * HOUR_MS).toUTCString())).toBe(
    now + 4 * HOUR_MS,
  );
});

it("keeps all network sources off unless explicitly configured", () => {
  vi.stubEnv("PUBLIC_DATA_ENABLED", "false");
  vi.stubEnv(
    "MET_NORWAY_USER_AGENT",
    "Luma.Green/1.0 https://luma.green/contact",
  );
  vi.stubEnv("DATA_GOV_IN_API_KEY", "test-key");
  vi.stubEnv(
    "DATA_GOV_IN_AIR_RESOURCE_ID",
    "12345678-1234-4123-8123-123456789abc",
  );
  expect(publicDataEnv()).toEqual({ weather: null, air: null });
  vi.stubEnv("PUBLIC_DATA_ENABLED", "true");
  expect(publicDataEnv().weather).not.toBeNull();
  expect(publicDataEnv().air).not.toBeNull();
  vi.stubEnv("MET_NORWAY_USER_AGENT", "generic-agent");
  vi.stubEnv("DATA_GOV_IN_AIR_RESOURCE_ID", "https://example.com");
  expect(publicDataEnv()).toEqual({ weather: null, air: null });
});

it("rejects oversized bodies even if the server omits Content-Length", async () => {
  expect(await readBoundedJson(new Response('{"ok":true}'))).toEqual({
    ok: true,
  });
  await expect(
    readBoundedJson(new Response("x".repeat(256 * 1024 + 1))),
  ).rejects.toThrow("INVALID_PUBLIC_DATA");
});
