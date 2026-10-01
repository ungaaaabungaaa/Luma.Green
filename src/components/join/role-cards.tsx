import {
  ArrowRightIcon,
  FactoryIcon,
  HandHelpingIcon,
  type LucideIcon,
  RecycleIcon,
  StoreIcon,
  WarehouseIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";

import { RoleStoryImage } from "@/components/showcase/role-story-image";
import { Link } from "@/i18n/navigation";

import {
  APPLICATION_KINDS,
  type ApplicationKind,
} from "../../../convex/lib/onboarding";

const icons: Record<ApplicationKind, LucideIcon> = {
  kabadiwala: StoreIcon,
  yard: WarehouseIcon,
  recycler: RecycleIcon,
  manufacturer: FactoryIcon,
  saathi: HandHelpingIcon,
};

/** Every role someone can join as, each with what it needs and a way in. */
export function RoleCards() {
  const t = useTranslations("join");
  return (
    <ul className="grid gap-4 sm:grid-cols-2">
      {APPLICATION_KINDS.map((kind) => {
        const Icon = icons[kind];
        return (
          <li key={kind}>
            <Link
              href={`/join/${kind}`}
              className="group flex h-full flex-col gap-4 rounded-2xl border border-border/80 bg-card p-4 shadow-xs transition-[border-color,box-shadow,transform] duration-200 outline-none hover:border-primary/40 hover:shadow-md focus-visible:ring-3 focus-visible:ring-ring/50 motion-safe:hover:-translate-y-1 sm:p-5"
            >
              <RoleStoryImage scene={kind} compact />
              <span className="flex items-start gap-4">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-primary/15 bg-primary/10 text-primary">
                  <Icon aria-hidden className="size-5" />
                </span>
                <span className="pt-1 text-lg font-semibold tracking-tight">
                  {t(`roles.${kind}.title`)}
                </span>
              </span>
              <span className="text-sm leading-relaxed text-muted-foreground">
                {t(`roles.${kind}.body`)}
              </span>
              <span className="border-t border-border/70 pt-4 text-sm leading-relaxed">
                <span className="font-medium">{t("youNeed")}: </span>
                {t(`roles.${kind}.needs`)}
              </span>
              <span className="mt-auto inline-flex min-h-11 items-center justify-between gap-3 font-semibold text-primary">
                {t("start")}
                <ArrowRightIcon
                  aria-hidden
                  className="size-5 transition-transform motion-safe:group-hover:translate-x-0.5 rtl:rotate-180 rtl:motion-safe:group-hover:-translate-x-0.5"
                />
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
