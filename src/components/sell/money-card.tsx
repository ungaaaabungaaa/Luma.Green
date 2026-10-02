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
    <div className="flex flex-col gap-3 border-y border-primary/25 py-5 text-foreground">
      {label ? <p className="text-sm text-muted-foreground">{label}</p> : null}
      <p className="text-3xl leading-tight font-semibold tracking-tight tabular-nums">
        {amount}
      </p>
      {points ? (
        <p className="flex items-center gap-1.5 self-start rounded-md bg-background px-3 py-1 text-sm font-semibold text-accent-foreground">
          <LeafIcon aria-hidden className="size-4" />
          {points}
        </p>
      ) : null}
      {note ? <p className="text-sm text-muted-foreground">{note}</p> : null}
    </div>
  );
}
