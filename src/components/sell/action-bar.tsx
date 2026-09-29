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
    <div className="sticky bottom-0 z-20 -mx-4 border-t bg-background/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur supports-backdrop-filter:bg-background/85 sm:bottom-4 sm:mx-0 sm:rounded-2xl sm:border sm:pb-3 sm:shadow-lg">
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1" aria-live="polite">
          {summary}
        </div>
        {children}
      </div>
    </div>
  );
}
