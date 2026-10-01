import {
  BadgeCheckIcon,
  HandCoinsIcon,
  UserRoundCheckIcon,
} from "lucide-react";
import { getTranslations } from "next-intl/server";

const PROMISES = [
  { key: "noAccount", icon: UserRoundCheckIcon },
  { key: "payAtDoor", icon: HandCoinsIcon },
  { key: "verified", icon: BadgeCheckIcon },
] as const;

/** The top of /sell: what this is, in one line, and three reasons to trust it. */
export async function SellHero() {
  const t = await getTranslations("sell");
  return (
    <header className="flex flex-col gap-6 border-b border-border pb-8 text-foreground">
      <div className="min-w-0">
        <div className="flex min-w-0 flex-col gap-3">
          <p className="text-sm font-medium text-primary">{t("eyebrow")}</p>
          <h1 className="max-w-xl font-display text-3xl leading-tight font-semibold tracking-tight text-balance sm:text-4xl">
            {t("title")}
          </h1>
          <p className="max-w-xl text-base leading-relaxed text-pretty text-muted-foreground sm:text-lg">
            {t("lead")}
          </p>
        </div>
      </div>
      <ul
        aria-label={t("promises.label")}
        className="flex flex-wrap gap-x-4 gap-y-3 pt-1"
      >
        {PROMISES.map(({ key, icon: Icon }) => (
          <li
            key={key}
            className="flex items-center gap-2 text-sm font-medium text-muted-foreground"
          >
            <Icon aria-hidden className="size-4" />
            {t(`promises.${key}`)}
          </li>
        ))}
      </ul>
    </header>
  );
}
