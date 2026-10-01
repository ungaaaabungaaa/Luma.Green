import { ArrowRightIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

import { HELP_ROLES, type HelpRole, ROLE_HELP } from "./content";
import { HelpArt } from "./help-art";

/**
 * One card per role, each with its picture, leading to its help page. A
 * compact row on phones, so all six fit in a couple of screens.
 */
export function RoleCards() {
  const t = useTranslations("help");
  return (
    <ul className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
      {HELP_ROLES.map((role) => (
        <li
          key={role}
          data-reveal
          className="group relative flex overflow-hidden rounded-2xl border border-brand-900/10 bg-card transition-colors hover:border-primary has-[a:focus-visible]:ring-3 has-[a:focus-visible]:ring-ring/50 sm:flex-col"
        >
          <div className="flex w-24 shrink-0 items-center justify-center border-e border-brand-900/10 bg-brand-50/70 p-2 sm:w-auto sm:border-e-0 sm:border-b sm:p-5">
            <HelpArt name={ROLE_HELP[role].art} className="sm:max-w-44" />
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-3 p-4 sm:p-6">
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
            <p className="mt-auto flex items-center justify-between gap-3 border-t border-brand-900/10 pt-4 text-sm font-semibold text-brand-900">
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
              "inline-flex min-h-11 items-center rounded-full border bg-card px-4 text-sm font-medium outline-none",
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
