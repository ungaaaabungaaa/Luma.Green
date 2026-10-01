"use client";

import { useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import {
  CircleAlertIcon,
  CloudOffIcon,
  DownloadIcon,
  TagsIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";

import { useFormat } from "@/components/app/format";
import { EmptyState, StatusPill } from "@/components/app/page-parts";
import { isConvexConfigured } from "@/components/providers/convex-provider";
import { DataBoundary } from "@/components/site/data-boundary";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { api } from "../../../convex/_generated/api";
import { CSV_FILENAME, downloadCsv, materialCodesCsv } from "./csv";

export type Material = FunctionReturnType<
  typeof api.catalogue.materials
>[number];

/** The open material codes, live from the catalogue, with a CSV download. */
export function MaterialCodes() {
  const t = useTranslations("standards.codes");
  if (!isConvexConfigured) {
    return <EmptyState icon={CloudOffIcon} title={t("unavailable")} />;
  }
  return (
    <DataBoundary
      fallback={(retry) => (
        <EmptyState
          icon={CircleAlertIcon}
          title={t("error")}
          action={
            <Button variant="outline" className="mt-2 h-11" onClick={retry}>
              {t("retry")}
            </Button>
          }
        />
      )}
    >
      <LiveCodes />
    </DataBoundary>
  );
}

function LiveCodes() {
  const t = useTranslations("standards.codes");
  const common = useTranslations("common");
  const materials = useQuery(api.catalogue.materials);

  if (materials === undefined) {
    return (
      <div
        role="status"
        aria-busy="true"
        aria-label={common("loading")}
        className="flex flex-col gap-3"
      >
        <Skeleton className="h-11 w-full sm:w-64" />
        <Skeleton className="h-80 w-full rounded-xl" />
      </div>
    );
  }
  return materials.length === 0 ? (
    <EmptyState icon={TagsIcon} title={t("empty")} />
  ) : (
    <CodesTable materials={materials} />
  );
}

/** The code list itself, given the catalogue. */
export function CodesTable({ materials }: { materials: readonly Material[] }) {
  const t = useTranslations("standards.codes");
  const families = useTranslations("prices.families");
  const format = useFormat();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          {t("count", { count: materials.length })}
        </p>
        <Button
          variant="outline"
          size="default"
          onClick={() => {
            downloadCsv(CSV_FILENAME, materialCodesCsv(materials));
          }}
        >
          <DownloadIcon aria-hidden />
          {t("download")}
        </Button>
      </div>
      <div className="overflow-hidden rounded-xl border bg-card">
        <Table>
          <caption className="sr-only">{t("caption")}</caption>
          <TableHeader className="bg-muted/40">
            <TableRow>
              <TableHead className="ps-4">{t("columns.code")}</TableHead>
              <TableHead>{t("columns.name")}</TableHead>
              <TableHead className="hidden sm:table-cell">
                {t("columns.family")}
              </TableHead>
              <TableHead className="hidden pe-4 sm:table-cell">
                {t("columns.stage")}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {materials.map((material) => {
              const family = families(material.family);
              const stage = t(`stages.${material.stage}`);
              return (
                <TableRow key={material.code}>
                  <TableCell className="ps-4 align-top font-mono text-xs break-all whitespace-normal sm:text-sm">
                    {material.code}
                  </TableCell>
                  <TableCell className="align-top whitespace-normal">
                    <span className="block font-medium">
                      {format.material(material.names, material.code)}
                    </span>
                    <span className="block text-xs text-muted-foreground sm:hidden">
                      {family} · {stage}
                    </span>
                  </TableCell>
                  <TableCell className="hidden align-top sm:table-cell">
                    {family}
                  </TableCell>
                  <TableCell className="hidden pe-4 align-top sm:table-cell">
                    <StatusPill
                      tone={material.stage === "recycled" ? "good" : "neutral"}
                    >
                      {stage}
                    </StatusPill>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
