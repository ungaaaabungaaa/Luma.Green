"use client";

import posthog from "posthog-js";
import { PostHogProvider } from "posthog-js/react";
import { type ReactNode, useEffect } from "react";

import { clientEnv } from "@/lib/env";

const key = clientEnv.NEXT_PUBLIC_POSTHOG_KEY;

/**
 * PostHog, initialised only when a key exists. No key (local dev, CI, forks)
 * means no network calls and no provider in the tree.
 *
 * The provider mounts immediately with the module-level client; `init` lands in
 * an effect on the same commit, so nothing renders twice waiting for it.
 */
export function AnalyticsEnabled({ children }: { children: ReactNode }) {
  useEffect(() => {
    if (!key || posthog.__loaded) return;

    posthog.init(key, {
      api_host:
        clientEnv.NEXT_PUBLIC_POSTHOG_HOST ?? "https://eu.i.posthog.com",
      // Route changes are captured from history events so locale-prefixed URLs
      // are normalised before they reach the event stream.
      capture_pageview: "history_change",
      capture_pageleave: true,
      person_profiles: "identified_only",
      // Operators handle KYC and payout data — keep autocapture narrow.
      autocapture: { dom_event_allowlist: ["click", "submit"] },
    });
  }, []);

  return key ? (
    <PostHogProvider client={posthog}>{children}</PostHogProvider>
  ) : (
    <>{children}</>
  );
}
