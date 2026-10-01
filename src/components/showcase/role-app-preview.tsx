import {
  ArrowDownToLineIcon,
  BoxesIcon,
  CalendarDaysIcon,
  ClipboardCheckIcon,
  FactoryIcon,
  FileCheck2Icon,
  FileTextIcon,
  HandshakeIcon,
  HouseIcon,
  LayersIcon,
  LeafIcon,
  MapPinIcon,
  PackageCheckIcon,
  PackageIcon,
  RecycleIcon,
  ScaleIcon,
  SearchIcon,
  ShieldCheckIcon,
  TruckIcon,
  UsersIcon,
  WarehouseIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";

import { site } from "@/lib/site";
import { cn } from "@/lib/utils";

const rolePreviews = {
  household: {
    phone: true,
    icon: HouseIcon,
    steps: [PackageIcon, CalendarDaysIcon, FileTextIcon],
  },
  kabadiwala: {
    phone: true,
    icon: ScaleIcon,
    steps: [TruckIcon, ScaleIcon, BoxesIcon],
  },
  yard: {
    phone: false,
    icon: WarehouseIcon,
    steps: [ArrowDownToLineIcon, LayersIcon, PackageCheckIcon],
  },
  recycler: {
    phone: false,
    icon: RecycleIcon,
    steps: [BoxesIcon, FactoryIcon, FileTextIcon],
  },
  manufacturer: {
    phone: false,
    icon: FactoryIcon,
    steps: [SearchIcon, HandshakeIcon, FileTextIcon],
  },
  saathi: {
    phone: true,
    icon: UsersIcon,
    steps: [MapPinIcon, CalendarDaysIcon, ClipboardCheckIcon],
  },
  admin: {
    phone: false,
    icon: ShieldCheckIcon,
    steps: [UsersIcon, FileCheck2Icon, ClipboardCheckIcon],
  },
} as const;

export type PreviewRole = keyof typeof rolePreviews;

const stepKeys = ["first", "second", "third"] as const;

function PreviewSteps({
  role,
  compact,
}: {
  role: PreviewRole;
  compact: boolean;
}) {
  const t = useTranslations("showcase.preview");
  const preview = rolePreviews[role];
  return (
    <ol className={cn("flex flex-col", compact ? "mt-2 gap-1" : "mt-5 gap-3")}>
      {stepKeys.map((key, index) => {
        const StepIcon = preview.steps[index] ?? PackageIcon;
        return (
          <li
            key={key}
            className={cn(
              "flex min-w-0 items-center gap-3 rounded-lg border border-border bg-background",
              compact ? "px-2 py-1.5" : "px-3 py-3.5",
            )}
          >
            <StepIcon
              aria-hidden="true"
              className={cn(
                "shrink-0 text-primary",
                compact ? "size-4" : "size-5",
              )}
              strokeWidth={1.5}
            />
            <span
              className={cn(
                "min-w-0 leading-relaxed",
                compact ? "text-xs" : "text-sm",
              )}
            >
              {t(`roles.${role}.${key}`)}
            </span>
            <span
              aria-hidden="true"
              className="ms-auto size-1.5 shrink-0 rounded-full bg-brand-300"
            />
          </li>
        );
      })}
    </ol>
  );
}

function DeviceChrome({
  phone,
  compact,
}: {
  phone: boolean;
  compact: boolean;
}) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "relative flex items-center gap-2 border-b border-border bg-muted/70 px-4",
        compact ? "py-2" : "py-3",
      )}
    >
      {phone ? (
        <span className="absolute inset-x-0 top-2 mx-auto h-1.5 w-10 rounded-full bg-brand-950/70" />
      ) : (
        <span className="flex gap-1">
          <span className="size-1.5 rounded-full bg-brand-700/50" />
          <span className="size-1.5 rounded-full bg-brand-700/30" />
          <span className="size-1.5 rounded-full bg-brand-700/20" />
        </span>
      )}
      <span className="me-auto text-[10px] font-semibold tracking-wide text-muted-foreground">
        {site.name}
      </span>
      <LeafIcon className="size-3 text-primary" />
    </div>
  );
}

/** An illustrative task overview, never a live record or an interactive app. */
export function RoleAppPreview({
  role,
  compact = false,
  className,
}: {
  role: PreviewRole;
  compact?: boolean;
  className?: string;
}) {
  const t = useTranslations("showcase.preview");
  const preview = rolePreviews[role];
  const RoleIcon = preview.icon;

  return (
    <figure
      aria-label={t(`roles.${role}.title`)}
      className={cn("mx-auto w-full min-w-0 text-start", className)}
    >
      <div
        className={cn(
          "relative mx-auto flex w-full flex-col overflow-hidden border-4 border-brand-950/90 bg-background text-foreground shadow-xl shadow-brand-950/10",
          preview.phone ? "max-w-72 rounded-3xl" : "max-w-xl rounded-xl",
          !compact && (preview.phone ? "min-h-100" : "min-h-84"),
        )}
      >
        <DeviceChrome phone={preview.phone} compact={compact} />

        <div className="flex flex-1">
          {!compact && !preview.phone ? (
            <div
              aria-hidden="true"
              className="flex w-10 shrink-0 flex-col items-center gap-6 border-e border-border bg-muted/50 py-6"
            >
              <RoleIcon className="size-4 text-primary" />
              <BoxesIcon className="size-4 text-muted-foreground/60" />
              <FileTextIcon className="size-4 text-muted-foreground/60" />
              <span className="mt-auto size-5 rounded-full bg-brand-100" />
            </div>
          ) : null}
          <div
            className={cn("min-w-0 flex-1 bg-card", compact ? "p-3" : "p-4")}
          >
            <div
              className={cn(
                "relative overflow-hidden rounded-lg bg-brand-950 text-primary-foreground",
                compact ? "px-3 py-3" : "px-4 py-6",
              )}
            >
              <RoleIcon
                aria-hidden="true"
                className={cn(
                  "absolute -end-4 -top-4 text-brand-100/10",
                  compact ? "size-24" : "size-36",
                )}
                strokeWidth={1}
              />
              <div className="relative flex items-center gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-brand-100/20 bg-brand-100/10">
                  <RoleIcon aria-hidden="true" className="size-5" />
                </span>
                <p
                  className={cn(
                    "min-w-0 leading-snug font-semibold",
                    compact ? "text-sm" : "text-lg",
                  )}
                >
                  {t(`roles.${role}.title`)}
                </p>
              </div>
            </div>

            <PreviewSteps role={role} compact={compact} />
          </div>
        </div>
        {preview.phone ? (
          <div
            aria-hidden="true"
            className={cn("flex justify-center", compact ? "pb-2" : "pb-3")}
          >
            <span className="h-1 w-14 rounded-full bg-brand-950/20" />
          </div>
        ) : null}
      </div>
      {!compact && !preview.phone ? (
        <div
          aria-hidden="true"
          className="mx-auto h-2 w-4/5 rounded-b-xl bg-brand-950/20"
        />
      ) : null}
      <figcaption
        className={cn(
          "mx-auto w-fit rounded-lg bg-background px-3 py-1.5 text-center text-xs leading-relaxed text-muted-foreground",
          compact ? "mt-2" : "mt-4",
        )}
      >
        {t("label")}
      </figcaption>
    </figure>
  );
}
