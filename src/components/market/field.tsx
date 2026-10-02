import type { ReactNode } from "react";

import { Label } from "@/components/ui/label";

/**
 * The id that describes an input for `aria-describedby`: its error when
 * there is one, else its hint when there is one.
 */
export function helpId(
  id: string,
  error: string | undefined,
  hasHint: boolean,
): string | undefined {
  if (error) return `${id}-error`;
  return hasHint ? `${id}-hint` : undefined;
}

/** A labelled input with a hint, replaced by the error when there is one. */
export function Field({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string;
  label: ReactNode;
  hint?: ReactNode;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id} className="flex-wrap text-base leading-normal">
        {label}
      </Label>
      {children}
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      {!error && hint ? (
        <div id={`${id}-hint`} className="text-sm text-muted-foreground">
          {hint}
        </div>
      ) : null}
    </div>
  );
}
