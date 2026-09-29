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
    <ul className="grid gap-3 sm:grid-cols-2">
      {APPLICATION_KINDS.map((kind) => {
        const Icon = icons[kind];
        return (
          <li key={kind}>
            <Link
              href={`/join/${kind}`}
              className="group flex h-full flex-col gap-3 rounded-2xl border bg-card p-5 transition-colors outline-none hover:border-primary focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <span className="flex items-center gap-3">
                <span className="flex size-11 items-center justify-center rounded-full bg-brand-50 text-primary">
                  <Icon aria-hidden className="size-5" />
                </span>
                <span className="text-lg font-semibold">
                  {t(`roles.${kind}.title`)}
                </span>
              </span>
              <span className="text-muted-foreground">
                {t(`roles.${kind}.body`)}
              </span>
              <span className="text-sm">
                <span className="font-medium">{t("youNeed")}: </span>
                {t(`roles.${kind}.needs`)}
              </span>
              <span className="mt-auto inline-flex items-center gap-1 font-medium text-primary">
                {t("start")}
                <ArrowRightIcon
                  aria-hidden
                  className="size-4 transition-transform group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5"
                />
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
