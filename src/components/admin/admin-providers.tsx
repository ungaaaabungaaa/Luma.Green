import type { ReactNode } from "react";

import { ConvexClientProvider } from "@/components/providers/convex-provider";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

/**
 * Providers for the admin console. No next-intl: the console is English only
 * and lives outside the `[locale]` segment.
 */
export function AdminProviders({ children }: { children: ReactNode }) {
  return (
    <ConvexClientProvider>
      <TooltipProvider>{children}</TooltipProvider>
      <Toaster richColors closeButton />
    </ConvexClientProvider>
  );
}
