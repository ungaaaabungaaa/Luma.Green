"use client";

import dynamic from "next/dynamic";
import type { ReactNode } from "react";

import { clientEnv } from "@/lib/env";

// Keep the analytics SDK out of the initial bundle until a key is supplied.
const AnalyticsEnabled = dynamic(async () => {
  const module_ = await import("./analytics-enabled");
  return module_.AnalyticsEnabled;
});

export function AnalyticsProvider({ children }: { children: ReactNode }) {
  return clientEnv.NEXT_PUBLIC_POSTHOG_KEY ? (
    <AnalyticsEnabled>{children}</AnalyticsEnabled>
  ) : (
    <>{children}</>
  );
}
