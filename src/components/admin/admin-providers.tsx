import type { ReactNode } from "react";

import { NotificationRevocationProvider } from "@/components/notifications/device-provider";
import { ConvexClientProvider } from "@/components/providers/convex-provider";
import { ThemeProvider, ThemeToaster } from "@/components/theme/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";

/**
 * Providers for the admin console. No next-intl: the console is English only
 * and lives outside the `[locale]` segment.
 */
export function AdminProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <ConvexClientProvider>
        <NotificationRevocationProvider>
          <TooltipProvider>{children}</TooltipProvider>
          <ThemeToaster />
        </NotificationRevocationProvider>
      </ConvexClientProvider>
    </ThemeProvider>
  );
}
