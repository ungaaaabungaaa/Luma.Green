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
              className="group flex h-full flex-col gap-4 rounded-xl border border-border bg-card p-4 transition-colors outline-none hover:border-primary/50 focus-visible:ring-3 focus-visible:ring-ring/50 sm:p-6"
            >
              <RoleStoryImage
                scene={kind}
                compact
                frameClassName="aspect-16/9 rounded-lg"
              />
              <span className="flex items-start gap-4">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-muted text-primary">
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
