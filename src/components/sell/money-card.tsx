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
    <div className="flex flex-col gap-2 rounded-2xl bg-amber-50 p-4 text-amber-950">
      {label ? <p className="text-sm text-amber-900">{label}</p> : null}
      <p className="text-2xl leading-tight font-semibold tracking-tight tabular-nums">
        {amount}
      </p>
      {points ? (
        <p className="flex items-center gap-1.5 self-start rounded-full bg-brand-50 px-2.5 py-1 text-sm font-semibold text-brand-900">
          <LeafIcon aria-hidden className="size-4" />
          {points}
        </p>
      ) : null}
      {note ? <p className="text-sm text-amber-900">{note}</p> : null}
    </div>
  );
}
