import { ArrowRightIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";

import { guidesFor, type HelpRole } from "./content";
import { IconTile } from "./help-art";

/** A role's guides as cards: icon, title, what it covers, how many steps. */
export function GuideCards({ role }: { role: HelpRole }) {
  const t = useTranslations("help");
  return (
    <ul className="grid gap-3 md:grid-cols-2">
      {guidesFor(role).map(({ key, slug, icon, steps }) => (
        <li
          key={key}
          className="group relative flex gap-4 rounded-2xl border bg-card p-4 transition-colors hover:border-primary has-[a:focus-visible]:ring-3 has-[a:focus-visible]:ring-ring/50"
        >
          <IconTile icon={icon} size="sm" />
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <h3 className="font-semibold">
              <Link
                href={`/help/${role}/${slug}`}
                className="outline-none after:absolute after:inset-0"
              >
                {t(`guides.${key}.title`)}
              </Link>
            </h3>
            <p className="text-sm text-muted-foreground">
              {t(`guides.${key}.summary`)}
            </p>
            <p className="mt-1 flex items-center gap-1 text-sm font-medium text-primary">
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
