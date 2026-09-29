import { useTranslations } from "next-intl";

import type { Guide } from "./content";
import { HelpArt, IconTile } from "./help-art";

/** A guide's steps: big numbers, one short line each, a picture or icon. */
export function GuideSteps({ guide }: { guide: Guide }) {
  const t = useTranslations("help");
  const total = guide.steps.length;
  return (
    <ol className="flex flex-col gap-4">
      {guide.steps.map((step, index) => {
        const base = `guides.${guide.key}.steps.${step.key}`;
        return (
          <li
            key={step.key}
            className="flex gap-4 rounded-2xl border bg-card p-4 sm:gap-5 sm:p-5"
          >
            <span
              aria-hidden
              className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-lg font-semibold text-primary-foreground tabular-nums"
            >
              {index + 1}
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-4 sm:flex-row sm:items-center">
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <p className="sr-only">
                  {t("guide.stepLabel", { number: index + 1, total })}
                </p>
                <h3 className="text-lg font-semibold">{t(`${base}.title`)}</h3>
                <p className="text-pretty text-muted-foreground">
                  {t(`${base}.body`)}
                </p>
              </div>
              {/* Picture first on phones: it carries the meaning. */}
              {step.art ? (
                <HelpArt
                  name={step.art}
                  className="-order-1 max-w-44 sm:order-none sm:max-w-40"
                />
              ) : (
                <IconTile
                  icon={step.icon}
                  className="-order-1 size-12 sm:order-none sm:size-14"
                />
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
