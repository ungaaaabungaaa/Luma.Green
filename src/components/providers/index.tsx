import { NextIntlClientProvider } from "next-intl";
import type { ReactNode } from "react";

import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

import { AnalyticsProvider } from "./analytics-provider";
import { ConvexClientProvider } from "./convex-provider";
import { QueryProvider } from "./query-provider";
import { ThemeProvider } from "./theme-provider";

/**
 * The single provider stack for the app. Order matters:
 * intl → theme → convex → query → analytics → UI primitives.
 */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <NextIntlClientProvider>
      <ThemeProvider>
        <ConvexClientProvider>
          <QueryProvider>
            <AnalyticsProvider>
              <TooltipProvider>{children}</TooltipProvider>
              <Toaster richColors closeButton />
            </AnalyticsProvider>
          </QueryProvider>
        </ConvexClientProvider>
      </ThemeProvider>
    </NextIntlClientProvider>
  );
}
