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
    <div className="sticky bottom-0 z-20 -mx-4 border-t bg-background/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur supports-backdrop-filter:bg-background/85 sm:bottom-4 sm:mx-0 sm:rounded-xl sm:border sm:border-border sm:px-5 sm:pt-4 sm:pb-4 sm:shadow-sm">
      <div className="flex flex-wrap items-center gap-4 [&>button]:max-w-full [&>button]:whitespace-normal">
        <div className="min-w-32 flex-1" aria-live="polite">
          {summary}
        </div>
        {children}
      </div>
    </div>
  );
}
