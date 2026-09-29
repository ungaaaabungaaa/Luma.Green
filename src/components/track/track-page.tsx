"use client";

import { useQuery } from "convex/react";
import { SearchXIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { EmptyState } from "@/components/app/page-parts";
import { isConvexConfigured } from "@/components/providers/convex-provider";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "@/i18n/navigation";

import { api } from "../../../convex/_generated/api";
import { ErrorBoundary, LoadError, SellUnavailable } from "../sell/states";
import { TrackView } from "./track-view";

/** `/t/{token}`: a booking, live, for anyone holding the link. */
export function TrackPage({ token }: { token: string }) {
  if (!isConvexConfigured) return <SellUnavailable />;
  return (
    <ErrorBoundary fallback={(reset) => <LoadError onRetry={reset} />}>
      <LiveTrack token={token} />
    </ErrorBoundary>
  );
}

function LiveTrack({ token }: { token: string }) {
  const booking = useQuery(api.households.track, { token });
  if (booking === undefined) return <TrackSkeleton />;
  return booking === null ? <TrackNotFound /> : <TrackView booking={booking} />;
}

export function TrackSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-busy="true">
      <Skeleton className="h-40 w-full rounded-2xl" />
      <Skeleton className="h-24 w-full rounded-2xl" />
      <Skeleton className="h-32 w-full rounded-2xl" />
      <Skeleton className="h-28 w-full rounded-2xl" />
    </div>
  );
}

export function TrackNotFound() {
  const t = useTranslations("track.notFound");
  return (
    <div className="flex flex-col gap-4">
      <h1 className="sr-only">{t("title")}</h1>
      <EmptyState
        icon={SearchXIcon}
        title={t("title")}
        body={t("body")}
        action={
          <Button asChild size="lg" className="mt-2 h-12 text-base">
            <Link href="/sell">{t("sell")}</Link>
          </Button>
        }
      />
    </div>
  );
}
