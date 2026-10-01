"use client";

import { CloudOffIcon, RecycleIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { Component, type ReactNode, useEffect, useState } from "react";

import { EmptyState } from "@/components/app/page-parts";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

/** Loading and failure states the /sell and /t pages share. */

export function SellSkeleton() {
  return (
    <div className="flex flex-col gap-5" aria-busy="true">
      <Skeleton className="h-8 w-full rounded-full" />
      <Skeleton className="h-8 w-2/3" />
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {Array.from({ length: 6 }, (_, index) => (
          <Skeleton key={index} className="h-28 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

/** Shown when this build has no Convex deployment to book against. */
export function SellUnavailable() {
  const t = useTranslations("sell.unavailable");
  return <EmptyState icon={RecycleIcon} title={t("title")} body={t("body")} />;
}

export function LoadError({ onRetry }: { onRetry: () => void }) {
  const t = useTranslations("sell");
  return (
    <EmptyState
      icon={CloudOffIcon}
      title={t("loadError")}
      action={
        <Button variant="outline" className="mt-2" onClick={onRetry}>
          {t("retry")}
        </Button>
      }
    />
  );
}

/**
 * Catches a failed query below it and shows `fallback` instead of a blank
 * page. `reset` renders the children again.
 */
export class ErrorBoundary extends Component<
  { fallback: (reset: () => void) => ReactNode; children: ReactNode },
  { hasError: boolean }
> {
  static getDerivedStateFromError() {
    return { hasError: true };
  }

  override state = { hasError: false };

  reset = () => {
    this.setState({ hasError: false });
  };

  override render() {
    return this.state.hasError
      ? this.props.fallback(this.reset)
      : this.props.children;
  }
}

/** The time now, refreshed every minute, for what can still be booked. */
export function useNow(intervalMs = 60_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, intervalMs);
    return () => {
      clearInterval(timer);
    };
  }, [intervalMs]);
  return now;
}
