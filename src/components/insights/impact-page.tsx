"use client";

import { useQuery } from "convex/react";
import { useTranslations } from "next-intl";

import { AppPageHeader, ListSkeleton } from "@/components/app/page-parts";
import { useWorkspace } from "@/components/app/use-workspace";
import { Skeleton } from "@/components/ui/skeleton";

import { api } from "../../../convex/_generated/api";
import { OrgImpactView } from "./org-impact";
import { QueryBoundary } from "./query-boundary";
import { SaathiEarnings } from "./saathi-earnings";

function ImpactSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-24 rounded-xl" />
        ))}
      </div>
      <ListSkeleton rows={3} />
    </div>
  );
}

function ImpactBody() {
  const impact = useQuery(api.insights.impact);
  if (impact === undefined) return <ImpactSkeleton />;
  return impact.kind === "org" ? (
    <OrgImpactView impact={impact} />
  ) : (
    <SaathiEarnings impact={impact} />
  );
}

/**
 * `/app/impact`. A business sees what it has kept in the recycling loop and
 * why that record is credit-ready; a Saathi sees their earnings.
 */
export function ImpactPage() {
  const t = useTranslations("impact");
  const workspace = useWorkspace();
  const isSaathi = workspace?.kind === "saathi";

  return (
    <>
      <AppPageHeader
        title={t(isSaathi ? "saathi.title" : "title")}
        lead={t(isSaathi ? "saathi.lead" : "lead")}
      />
      <QueryBoundary>
        <ImpactBody />
      </QueryBoundary>
    </>
  );
}
