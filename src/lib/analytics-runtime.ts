import type { PostHog } from "posthog-js";

import {
  analyticsPage,
  analyticsProperties,
  readAnalyticsChoice,
} from "./analytics";
import { clientEnv } from "./env";

type TagCommand = [string, ...unknown[]];
declare global {
  interface Window {
    dataLayer?: (ArrayLike<unknown> & Iterable<unknown>)[];
  }
}
const runtime: { posthog?: Promise<PostHog>; google?: HTMLScriptElement } = {};

function isPermitted() {
  return (
    clientEnv.NEXT_PUBLIC_TELEMETRY_ENABLED &&
    readAnalyticsChoice() === "granted" &&
    analyticsPage(window.location.pathname) !== undefined
  );
}

function tag(..._command: TagCommand) {
  // The Google tag consumes this documented browser-global queue.
  // eslint-disable-next-line unicorn/no-global-object-property-assignment
  window.dataLayer ??= [];
  // gtag.js identifies commands by the documented IArguments shape.
  // eslint-disable-next-line prefer-rest-params
  window.dataLayer.push(arguments);
}

export function resumeAnalytics() {
  const id = clientEnv.NEXT_PUBLIC_GA_MEASUREMENT_ID;
  if (id) Reflect.set(window, `ga-disable-${id}`, !isPermitted());
}

export function stopAnalytics() {
  const id = clientEnv.NEXT_PUBLIC_GA_MEASUREMENT_ID;
  if (id) Reflect.set(window, `ga-disable-${id}`, true);
}

async function initializePosthog() {
  const { default: posthog } = await import("posthog-js");
  const key = clientEnv.NEXT_PUBLIC_POSTHOG_KEY;
  if (key && isPermitted() && !posthog.__loaded) {
    posthog.init(key, {
      api_host:
        clientEnv.NEXT_PUBLIC_POSTHOG_HOST ?? "https://eu.i.posthog.com",
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
      before_send(event) {
        const page = analyticsPage(window.location.pathname);
        if (
          !page ||
          !isPermitted() ||
          event?.event !== "$pageview" ||
          event.properties.page !== page ||
          typeof event.properties.distinct_id !== "string"
        )
          return null;
        return {
          ...event,
          properties: {
            token: key,
            distinct_id: event.properties.distinct_id,
            $process_person_profile: false,
            $current_url: window.location.origin + page,
            ...analyticsProperties(page, String(event.properties.locale)),
          },
        };
      },
    });
  }
  return posthog;
}

async function posthogClient() {
  runtime.posthog ??= initializePosthog();
  try {
    const client = await runtime.posthog;
    // A cancelled first load must be allowed to initialize on a later visit.
    if (!client.__loaded) runtime.posthog = undefined;
    return client;
  } catch (error) {
    // A rejected import or initialization must not poison every later visit.
    runtime.posthog = undefined;
    throw error;
  }
}

function googlePage(page: string, locale: string) {
  const id = clientEnv.NEXT_PUBLIC_GA_MEASUREMENT_ID;
  if (!id || !isPermitted()) return;
  Reflect.set(window, `ga-disable-${id}`, false);
  const pageLocation = window.location.origin + page;
  if (!runtime.google) {
    tag("consent", "default", {
      analytics_storage: "granted",
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
    });
    tag("js", new Date());
    tag("config", id, {
      send_page_view: false,
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
      page_location: pageLocation,
      page_referrer: "",
      page_title: "Luma.Green",
    });
    const script = document.createElement("script");
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
    script.referrerPolicy = "no-referrer";
    script.addEventListener(
      "error",
      () => {
        console.warn("Google Analytics could not load.");
      },
      { once: true },
    );
    runtime.google = script;
    document.head.append(script);
  }
  tag("event", "page_view", {
    send_to: id,
    page_location: pageLocation,
    page_referrer: "",
    page_title: "Luma.Green",
    ...analyticsProperties(page, locale),
  });
}

/** Manual page views only. Recheck consent/path after the asynchronous SDK load. */
export async function recordPageView(page: string, locale: string) {
  if (!isPermitted() || analyticsPage(window.location.pathname) !== page)
    return;
  googlePage(page, locale);
  if (!clientEnv.NEXT_PUBLIC_POSTHOG_KEY) return;
  const posthog = await posthogClient();
  if (
    isPermitted() &&
    analyticsPage(window.location.pathname) === page &&
    posthog.__loaded
  ) {
    posthog.capture("$pageview", analyticsProperties(page, locale));
  }
}
