import { NextIntlClientProvider } from "next-intl";
import type { ReactNode } from "react";

import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

import { AnalyticsProvider } from "./analytics-provider";
import { ConvexClientProvider } from "./convex-provider";
import { QueryProvider } from "./query-provider";

/**
 * The single provider stack for the app. Order matters:
 * intl → convex → query → analytics → UI primitives.
 */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <NextIntlClientProvider>
      <ConvexClientProvider>
        <QueryProvider>
          <AnalyticsProvider>
            <TooltipProvider>{children}</TooltipProvider>
            <Toaster richColors closeButton />
          </AnalyticsProvider>
        </QueryProvider>
      </ConvexClientProvider>
    </NextIntlClientProvider>
  );
}
