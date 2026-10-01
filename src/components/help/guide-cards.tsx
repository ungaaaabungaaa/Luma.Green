import { ArrowRightIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";

import { guidesFor, type HelpRole } from "./content";
import { IconTile } from "./help-art";

/** A role's guides as cards: icon, title, what it covers, how many steps. */
export function GuideCards({ role }: { role: HelpRole }) {
  const t = useTranslations("help");
  return (
    <ul className="grid grid-flow-dense gap-4 md:grid-cols-2">
      {guidesFor(role).map(({ key, slug, icon, steps }) => (
        <li
          key={key}
          data-reveal
          className="group relative flex gap-4 rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary has-[a:focus-visible]:ring-3 has-[a:focus-visible]:ring-ring/50 sm:p-6"
        >
          <IconTile icon={icon} size="sm" />
          <div className="flex min-w-0 flex-1 flex-col gap-3">
            <h3 className="text-lg font-semibold tracking-tight">
              <Link
                href={`/help/${role}/${slug}`}
                className="outline-none after:absolute after:inset-0"
              >
                {t(`guides.${key}.title`)}
              </Link>
            </h3>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {t(`guides.${key}.summary`)}
            </p>
            <p className="mt-auto flex items-center justify-between gap-3 border-t border-border pt-4 text-sm font-semibold text-primary">
              {t("role.steps", { count: steps.length })}
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
