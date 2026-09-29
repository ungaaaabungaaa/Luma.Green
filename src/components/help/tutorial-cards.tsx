import { ClockIcon, PlayIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { type HelpRole, tutorialsFor } from "./content";

/**
 * Tutorial slots. The videos are still being made, so each card says so
 * plainly instead of offering a play button that does nothing. A compact row
 * on phones, a card with a 16:9 poster from tablet width up.
 */
export function TutorialCards({ role }: { role: HelpRole }) {
  const t = useTranslations("help");
  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {tutorialsFor(role).map(({ key, minutes }) => (
        <li
          key={key}
          className="flex overflow-hidden rounded-2xl border bg-card sm:flex-col"
        >
          <div className="flex aspect-video w-32 shrink-0 items-center justify-center bg-brand-50 sm:w-full">
            <span className="flex size-10 items-center justify-center rounded-full bg-background/90 text-primary shadow-sm sm:size-14">
              <PlayIcon
                aria-hidden
                className="size-5 translate-x-0.5 sm:size-6"
              />
            </span>
          </div>
          <div className="flex min-w-0 flex-col justify-center gap-1 p-3 sm:p-4">
            <p className="text-xs font-medium text-primary">
              {t("tutorial.comingSoon")}
            </p>
            <h3 className="font-medium">{t(`tutorials.${key}`)}</h3>
            <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <ClockIcon aria-hidden className="size-4" />
              {t("tutorial.minutes", { minutes })}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}
