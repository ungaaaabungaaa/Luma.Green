import { useFormatter, useTranslations } from "next-intl";

import type { Guide } from "./content";
import { IconTile } from "./help-art";

/** Ordered instructions keep their number, action and icon together. */
export function GuideSteps({ guide }: { guide: Guide }) {
  const t = useTranslations("help");
  const format = useFormatter();
  const total = guide.steps.length;
  return (
    <ol className="divide-y border-y">
      {guide.steps.map((step, index) => {
        const base = `guides.${guide.key}.steps.${step.key}`;
        return (
          <li key={step.key} className="flex gap-4 py-7 sm:gap-6">
            <span
              aria-hidden
              className="w-9 shrink-0 pt-1 font-mono text-xl text-muted-foreground tabular-nums"
            >
              {format.number(index + 1, { minimumIntegerDigits: 2 })}
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <p className="sr-only">
                {t("guide.stepLabel", { number: index + 1, total })}
              </p>
              <h3 className="text-lg font-semibold">{t(`${base}.title`)}</h3>
              <p className="leading-relaxed text-pretty text-muted-foreground">
                {t(`${base}.body`)}
              </p>
            </div>
            <IconTile icon={step.icon} size="sm" className="hidden sm:flex" />
          </li>
        );
      })}
    </ol>
  );
}
