import type { CaptureResult, PostHogConfig } from "posthog-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const configuration = vi.hoisted(() => ({
  NEXT_PUBLIC_TELEMETRY_ENABLED: true,
  NEXT_PUBLIC_POSTHOG_KEY: "phc_test_only",
  NEXT_PUBLIC_POSTHOG_HOST: "https://analytics.example.invalid",
  NEXT_PUBLIC_GA_MEASUREMENT_ID: "G-TESTONLY",
}));
vi.mock("./env", () => ({ clientEnv: configuration }));

function fakePosthog() {
  let options: Partial<PostHogConfig> = {};
  const client = {
    __loaded: false,
    capture: vi.fn(),
    init: vi.fn((_key: string, config: Partial<PostHogConfig>) => {
      options = config;
      client.__loaded = true;
    }),
  };
  return { client, options: () => options };
}

function page(path: string) {
  window.history.replaceState({}, "", path);
}

function granted() {
  localStorage.setItem("luma.analytics.v1", "granted");
}

beforeEach(() => {
  vi.resetModules();
  configuration.NEXT_PUBLIC_TELEMETRY_ENABLED = true;
  configuration.NEXT_PUBLIC_POSTHOG_KEY = "phc_test_only";
  configuration.NEXT_PUBLIC_GA_MEASUREMENT_ID = "G-TESTONLY";
  localStorage.clear();
  document.head.querySelectorAll("script").forEach((script) => {
    script.remove();
  });
  Reflect.set(window, "dataLayer", []);
  Reflect.deleteProperty(window, "ga-disable-G-TESTONLY");
  page("/prices");
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.doUnmock("posthog-js");
});

describe("analytics delivery gates", () => {
  it.each(["unset", "denied", "disabled", "private", "storage blocked"])(
    "loads no vendor and queues no request when %s",
    async (gate) => {
      const vendor = fakePosthog();
      const load = vi.fn(() => ({ default: vendor.client }));
      vi.doMock("posthog-js", load);
      if (gate === "denied")
        localStorage.setItem("luma.analytics.v1", "denied");
      else if (gate === "disabled" || gate === "private") granted();
      switch (gate) {
        case "disabled": {
          configuration.NEXT_PUBLIC_TELEMETRY_ENABLED = false;
          break;
        }
        case "private": {
          page("/app/trades/secret");
          break;
        }
        case "storage blocked": {
          vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
            throw new DOMException("Blocked", "SecurityError");
          });

          break;
        }
        // No default
      }
      const { recordPageView } = await import("./analytics-runtime");
      await recordPageView("/prices", "en");
      expect(load).not.toHaveBeenCalled();
      expect(vendor.client.capture).not.toHaveBeenCalled();
      expect(window.dataLayer).toEqual([]);
      expect(document.head.querySelector("script")).toBeNull();
    },
  );

  it("sends one manual GA event per visit without automatic initial page views", async () => {
    configuration.NEXT_PUBLIC_POSTHOG_KEY = "";
    granted();
    page("/ar/prices?phone=secret#access_token=secret");
    const { recordPageView } = await import("./analytics-runtime");
    await recordPageView("/prices", "ar");
    page("/ar/standards?token=secret");
    await recordPageView("/standards", "ar");
    const commands = (window.dataLayer ?? []).map((command) => [...command]);
    expect(commands.filter((command) => command[0] === "config")).toEqual([
      [
        "config",
        "G-TESTONLY",
        expect.objectContaining({ send_page_view: false }),
      ],
    ]);
    const events = commands.filter((command) => command[0] === "event");
    expect(events).toHaveLength(2);
    expect(events[0]).toEqual([
      "event",
      "page_view",
      expect.objectContaining({
        page: "/prices",
        locale: "ar",
        page_location: `${window.location.origin}/prices`,
        page_referrer: "",
      }),
    ]);
    expect(events[1]).toEqual([
      "event",
      "page_view",
      expect.objectContaining({ page: "/standards" }),
    ]);
    expect(JSON.stringify(commands)).not.toMatch(/secret|phone|access_token/);
    expect(document.head.querySelectorAll("script")).toHaveLength(1);
    expect(document.head.querySelector("script")?.referrerPolicy).toBe(
      "no-referrer",
    );
  });

  it("does not send a stale caller-supplied route", async () => {
    granted();
    const { recordPageView } = await import("./analytics-runtime");
    await recordPageView("/help", "en");
    expect(window.dataLayer).toEqual([]);
  });

  it("disables GA immediately when tracking stops", async () => {
    const { stopAnalytics } = await import("./analytics-runtime");
    stopAnalytics();
    expect(Reflect.get(window, "ga-disable-G-TESTONLY")).toBe(true);
  });
});

it("resumes a valid GA visit without queuing a duplicate page view", async () => {
  configuration.NEXT_PUBLIC_POSTHOG_KEY = "";
  granted();
  const { recordPageView, stopAnalytics, resumeAnalytics } =
    await import("./analytics-runtime");
  await recordPageView("/prices", "en");
  stopAnalytics();
  expect(Reflect.get(window, "ga-disable-G-TESTONLY")).toBe(true);
  resumeAnalytics();
  expect(Reflect.get(window, "ga-disable-G-TESTONLY")).toBe(false);
  expect(
    window.dataLayer?.filter((command) => command[0] === "event"),
  ).toHaveLength(1);
  localStorage.setItem("luma.analytics.v1", "denied");
  resumeAnalytics();
  expect(Reflect.get(window, "ga-disable-G-TESTONLY")).toBe(true);
});

describe("PostHog data minimization", () => {
  it("disables automatic collection and strips non-allowlisted properties", async () => {
    const vendor = fakePosthog();
    vi.doMock("posthog-js", () => ({ default: vendor.client }));
    granted();
    page("/prices?email=secret@example.com#token=secret");
    const { recordPageView } = await import("./analytics-runtime");
    await recordPageView("/prices", "en");
    expect(vendor.client.capture).toHaveBeenCalledExactlyOnceWith("$pageview", {
      page: "/prices",
      locale: "en",
    });
    const options = vendor.options();
    expect(options).toMatchObject({
      autocapture: false,
      capture_pageview: false,
      capture_pageleave: false,
      capture_exceptions: false,
      capture_performance: false,
      capture_heatmaps: false,
      capture_dead_clicks: false,
      disable_session_recording: true,
      disable_surveys: true,
      disable_external_dependency_loading: true,
      advanced_disable_flags: true,
      person_profiles: "never",
      persistence: "memory",
      save_referrer: false,
      save_campaign_params: false,
      ip: false,
      request_batching: false,
    });
    const sanitize = options.before_send;
    if (typeof sanitize !== "function")
      throw new Error("Missing send boundary");
    const event: CaptureResult = {
      uuid: "00000000-0000-4000-8000-000000000001",
      event: "$pageview",
      properties: {
        page: "/prices",
        locale: "en",
        distinct_id: "anonymous-test-id",
        email: "secret@example.com",
        $current_url: window.location.href,
        $referrer: "https://example.com/?token=secret",
        form_value: "customer secret",
      },
    };
    const result = sanitize(event);
    expect(result?.properties).toEqual({
      token: "phc_test_only",
      distinct_id: "anonymous-test-id",
      $process_person_profile: false,
      $current_url: `${window.location.origin}/prices`,
      page: "/prices",
      locale: "en",
    });
    expect(sanitize({ ...event, event: "$autocapture" })).toBeNull();
    expect(
      sanitize({
        ...event,
        properties: { ...event.properties, page: "/help" },
      }),
    ).toBeNull();
    localStorage.setItem("luma.analytics.v1", "denied");
    expect(sanitize(event)).toBeNull();
    granted();
    page("/admin");
    expect(sanitize(event)).toBeNull();
  });

  it.each(["withdrawn", "private", "different public page"])(
    "does not capture after delayed SDK loading when %s",
    async (change) => {
      const vendor = fakePosthog();
      const { promise: waiting, resolve: release } =
        Promise.withResolvers<undefined>();
      vi.doMock("posthog-js", async () => {
        await waiting;
        return { default: vendor.client };
      });
      granted();
      const { recordPageView } = await import("./analytics-runtime");
      const recording = recordPageView("/prices", "en");
      switch (change) {
        case "withdrawn": {
          localStorage.setItem("luma.analytics.v1", "denied");
          break;
        }
        case "private": {
          page("/app");
          break;
        }
        case "different public page": {
          {
            page("/help");
            // No default
          }
          break;
        }
      }
      release(undefined);
      await recording;
      expect(vendor.client.capture).not.toHaveBeenCalled();
      if (change !== "different public page")
        expect(vendor.client.init).not.toHaveBeenCalled();
      // A cancelled first initialization must not disable future valid visits.
      granted();
      page("/prices");
      await recordPageView("/prices", "en");
      expect(vendor.client.capture).toHaveBeenCalledExactlyOnceWith(
        "$pageview",
        {
          page: "/prices",
          locale: "en",
        },
      );
    },
  );
});

// The provider can fail to initialize even when the module was downloaded.
it("retries a failed PostHog initialization on the next permitted visit", async () => {
  const vendor = fakePosthog();
  vendor.client.init.mockImplementationOnce(() => {
    throw new Error("Provider initialization unavailable");
  });
  vi.doMock("posthog-js", () => ({ default: vendor.client }));
  granted();
  const { recordPageView } = await import("./analytics-runtime");
  await expect(recordPageView("/prices", "en")).rejects.toThrow(
    "Provider initialization unavailable",
  );
  expect(vendor.client.capture).not.toHaveBeenCalled();
  await recordPageView("/prices", "en");
  expect(vendor.client.capture).toHaveBeenCalledExactlyOnceWith("$pageview", {
    page: "/prices",
    locale: "en",
  });
});
