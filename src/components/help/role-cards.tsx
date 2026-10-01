import {
  ArrowRightIcon,
  FactoryIcon,
  HandHelpingIcon,
  HouseIcon,
  RecycleIcon,
  StoreIcon,
  WarehouseIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

import { HELP_ROLES, type HelpRole, ROLE_HELP } from "./content";
import { IconTile } from "./help-art";

const roleIcons = {
  household: HouseIcon,
  kabadiwala: StoreIcon,
  yard: WarehouseIcon,
  recycler: RecycleIcon,
  manufacturer: FactoryIcon,
  saathi: HandHelpingIcon,
} as const;

/**
 * One card per role, each with its role icon, leading to its help page. A
 * compact row on phones, so all six fit in a couple of screens.
 */
export function RoleCards() {
  const t = useTranslations("help");
  return (
    <ul className="grid grid-flow-dense gap-4 md:grid-cols-2">
      {HELP_ROLES.map((role) => (
        <li
          key={role}
          data-reveal
          className="group relative flex gap-4 overflow-hidden rounded-xl border border-border bg-card transition-colors hover:border-primary has-[a:focus-visible]:ring-3 has-[a:focus-visible]:ring-ring/50"
        >
          <div className="ps-5 pt-5 sm:ps-6 sm:pt-6">
            <IconTile icon={roleIcons[role]} size="sm" />
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-3 p-5 ps-0 sm:p-6 sm:ps-0">
            <h3 className="text-lg font-semibold tracking-tight sm:text-xl">
              <Link
                href={`/help/${role}`}
                className="outline-none after:absolute after:inset-0"
              >
                {t(`roles.${role}.name`)}
              </Link>
            </h3>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {t(`roles.${role}.who`)}
            </p>
            <p className="mt-auto flex items-center justify-between gap-3 border-t border-border pt-4 text-sm font-semibold text-primary">
              {t("guideCount", { count: ROLE_HELP[role].guides.length })}
              <ArrowRightIcon
                aria-hidden
                className="size-4 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none rtl:rotate-180 rtl:group-hover:-translate-x-0.5"
              />
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Compact links to every other role's help, at the foot of a role page. */
export function OtherRoleLinks({ current }: { current: HelpRole }) {
  const t = useTranslations("help");
  return (
    <ul className="flex flex-wrap gap-2">
      {HELP_ROLES.filter((role) => role !== current).map((role) => (
        <li key={role}>
          <Link
            href={`/help/${role}`}
            className={cn(
              "inline-flex min-h-11 items-center rounded-lg border bg-card px-4 text-sm font-medium outline-none",
              "hover:border-primary hover:text-primary focus-visible:ring-3 focus-visible:ring-ring/50",
            )}
          >
            {t(`roles.${role}.name`)}
          </Link>
        </li>
      ))}
    </ul>
  );
}
