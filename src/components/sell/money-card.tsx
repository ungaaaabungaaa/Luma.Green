import { LeafIcon } from "lucide-react";
import type { ReactNode } from "react";

/**
 * The money, big and warm: what the household gets, the recycle points that
 * come with it, and one line on how they're paid.
 */
export function MoneyCard({
  label,
  amount,
  points,
  note,
}: {
  label?: string;
  amount: string;
  points?: string;
  note?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-amber-200/60 bg-amber-50 p-5 text-amber-950 dark:border-amber-800/40 dark:bg-amber-950/40 dark:text-amber-100">
      {label ? (
        <p className="text-sm text-amber-900 dark:text-amber-200">{label}</p>
      ) : null}
      <p className="text-2xl leading-tight font-semibold tracking-tight tabular-nums">
        {amount}
      </p>
      {points ? (
        <p className="flex items-center gap-1.5 self-start rounded-full bg-accent px-2.5 py-1 text-sm font-semibold text-accent-foreground">
          <LeafIcon aria-hidden className="size-4" />
          {points}
        </p>
      ) : null}
      {note ? (
        <p className="text-sm text-amber-900 dark:text-amber-200">{note}</p>
      ) : null}
    </div>
  );
}
