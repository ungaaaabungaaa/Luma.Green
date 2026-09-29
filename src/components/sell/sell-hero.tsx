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
    <header className="flex flex-col gap-3">
      <p className="text-sm font-medium text-primary">{t("eyebrow")}</p>
      <h1 className="font-display text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
        {t("title")}
      </h1>
      <p className="text-lg text-pretty text-muted-foreground">{t("lead")}</p>
      <ul
        aria-label={t("promises.label")}
        className="flex flex-wrap gap-2 pt-1"
      >
        {PROMISES.map(({ key, icon: Icon }) => (
          <li
            key={key}
            className="flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1.5 text-sm font-medium text-brand-900"
          >
            <Icon aria-hidden className="size-4" />
            {t(`promises.${key}`)}
          </li>
        ))}
      </ul>
    </header>
  );
}
