import { NextIntlClientProvider } from "next-intl";
import type { ReactNode } from "react";

import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

import { AnalyticsProvider } from "./analytics-provider";
import { ConvexClientProvider } from "./convex-provider";

/**
 * The single provider stack for the app. Order matters:
 * intl → convex → optional analytics → UI primitives.
 */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <NextIntlClientProvider>
      <ConvexClientProvider>
        <AnalyticsProvider>
          <TooltipProvider>{children}</TooltipProvider>
          <Toaster richColors closeButton />
        </AnalyticsProvider>
      </ConvexClientProvider>
    </NextIntlClientProvider>
  );
}
