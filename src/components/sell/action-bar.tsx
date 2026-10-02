import type { ReactNode } from "react";

/**
 * The step's main button, always in reach of a thumb: stuck to the bottom of
 * the screen with a one-line summary beside it.
 */
export function ActionBar({
  summary,
  children,
}: {
  summary: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="sticky bottom-0 z-20 -mx-4 border-t bg-background/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur supports-backdrop-filter:bg-background/85 sm:mx-0 sm:px-0 sm:pt-4 sm:pb-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center [&>button]:min-h-12 [&>button]:w-full [&>button]:max-w-full [&>button]:whitespace-nowrap sm:[&>button]:w-auto">
        <div className="min-w-32 flex-1" aria-live="polite">
          {summary}
        </div>
        {children}
      </div>
    </div>
  );
}
