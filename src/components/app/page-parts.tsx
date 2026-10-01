import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/** Building blocks every app screen uses, so they all look alike. */

export function AppPageHeader({
  title,
  lead,
  actions,
}: {
  title: string;
  lead?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-5 border-b border-border/70 pb-7">
      <div className="flex min-w-0 flex-col gap-3">
        <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          {title}
        </h1>
        {lead ? (
          <p className="max-w-2xl leading-relaxed text-muted-foreground">
            {lead}
          </p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "neutral",
}: {
  label: string;
  value: string;
  hint?: string;
  icon?: LucideIcon;
  tone?: "neutral" | "good" | "warn";
}) {
  return (
    <div className="relative flex flex-col gap-4 overflow-hidden rounded-2xl border border-border/80 bg-card p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">{label}</p>
        {Icon ? (
          <Icon
            aria-hidden
            className={cn(
              "size-5",
              tone === "good" && "text-primary",
              tone === "warn" && "text-amber-600",
              tone === "neutral" && "text-muted-foreground",
            )}
          />
        ) : null}
      </div>
      <p className="font-display text-3xl font-semibold tracking-tight break-words tabular-nums sm:text-4xl">
        {value}
      </p>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export function Section({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  body,
  action,
}: {
  icon: LucideIcon;
  title: string;
  body?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-3xl border border-border/80 bg-card px-6 py-14 text-center shadow-sm">
      <span className="flex size-16 items-center justify-center rounded-2xl border border-brand-100 bg-brand-50 text-primary">
        <Icon aria-hidden className="size-6" />
      </span>
      <p className="text-lg font-semibold tracking-tight">{title}</p>
      {body ? (
        <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
          {body}
        </p>
      ) : null}
      {action}
    </div>
  );
}

export function ListSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-3" aria-busy="true">
      {Array.from({ length: rows }, (_, index) => (
        <Skeleton key={index} className="h-20 w-full rounded-2xl" />
      ))}
    </div>
  );
}

/** A small coloured pill for a status. */
export function StatusPill({
  tone,
  children,
}: {
  tone: "neutral" | "info" | "good" | "warn" | "bad";
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium whitespace-nowrap",
        tone === "neutral" && "bg-muted text-muted-foreground",
        tone === "info" && "bg-sky-50 text-sky-800",
        tone === "good" && "bg-brand-50 text-primary",
        tone === "warn" && "bg-amber-50 text-amber-800",
        tone === "bad" && "bg-destructive/10 text-destructive",
      )}
    >
      {children}
    </span>
  );
}

/** "Sample data" ribbon for prototype-only numbers. */
export function DemoNote({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-lg border border-dashed border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
      {children}
    </p>
  );
}
