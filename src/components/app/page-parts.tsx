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
    <div className="flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <h1 className="font-display text-3xl leading-tight font-semibold tracking-tight">
          {title}
        </h1>
        {lead ? (
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            {lead}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {actions}
        </div>
      ) : null}
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
    <div className="relative flex min-w-0 flex-col gap-3 border-t border-border py-4 pe-4 sm:py-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        {Icon ? (
          <Icon
            aria-hidden
            className={cn(
              "size-5",
              tone === "good" && "text-primary",
              tone === "warn" && "text-amber-700 dark:text-amber-300",
              tone === "neutral" && "text-muted-foreground",
            )}
          />
        ) : null}
      </div>
      <p className="font-display text-2xl font-semibold tracking-tight break-words tabular-nums sm:text-3xl">
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
    <section className="flex min-w-0 flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
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
    <div className="flex flex-col items-start gap-3 border-y border-dashed border-border py-8 sm:py-10">
      <span className="mb-1 text-muted-foreground">
        <Icon aria-hidden className="size-9" strokeWidth={1.25} />
      </span>
      <p className="text-lg font-semibold tracking-tight">{title}</p>
      {body ? (
        <p className="max-w-lg text-sm leading-relaxed text-muted-foreground">
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
        <Skeleton key={index} className="h-16 w-full rounded-none" />
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
        "inline-flex max-w-full items-center rounded-md px-2 py-1 text-xs leading-5 font-medium",
        tone === "neutral" && "bg-muted text-muted-foreground",
        tone === "info" && "bg-sky-500/10 text-sky-800 dark:text-sky-300",
        tone === "good" && "bg-primary/10 text-primary",
        tone === "warn" && "bg-amber-500/10 text-amber-800 dark:text-amber-300",
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
    <p className="border-s-2 border-amber-500/50 ps-3 text-xs leading-relaxed text-muted-foreground">
      {children}
    </p>
  );
}
