import {
  BadgeCheckIcon,
  HandCoinsIcon,
  UserRoundCheckIcon,
} from "lucide-react";
import { getTranslations } from "next-intl/server";

import { RoleStoryImage } from "@/components/showcase/role-story-image";

const householdRole = "household";

const PROMISES = [
  { key: "noAccount", icon: UserRoundCheckIcon },
  { key: "payAtDoor", icon: HandCoinsIcon },
  { key: "verified", icon: BadgeCheckIcon },
] as const;

/** The top of /sell: what this is, in one line, and three reasons to trust it. */
export async function SellHero() {
  const t = await getTranslations("sell");
  return (
    <header className="relative isolate flex flex-col gap-5 overflow-hidden rounded-3xl border border-border bg-card p-5 text-foreground shadow-xs sm:p-7">
      <div
        aria-hidden
        className="pointer-events-none absolute -end-20 -top-20 -z-10 size-72 rounded-full border border-primary/10"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -end-8 -top-8 -z-10 size-48 rounded-full border border-primary/15"
      />
      <div className="grid items-center gap-5 sm:grid-cols-[minmax(0,1fr)_200px]">
        <div className="flex min-w-0 flex-col gap-3">
          <p className="text-sm font-medium text-primary">{t("eyebrow")}</p>
          <h1 className="max-w-xl font-display text-3xl leading-tight font-semibold tracking-tight text-balance sm:text-4xl">
            {t("title")}
          </h1>
          <p className="max-w-xl text-base leading-relaxed text-pretty text-muted-foreground sm:text-lg">
            {t("lead")}
          </p>
        </div>
        <RoleStoryImage
          sizes="(min-width: 640px) 200px, 92vw"
          scene={householdRole}
          compact
          className="rounded-2xl border border-border bg-muted p-1.5"
          frameClassName="h-28 aspect-auto rounded-xl sm:h-52"
        />
      </div>
      <ul
        aria-label={t("promises.label")}
        className="flex flex-wrap gap-x-4 gap-y-3 border-t border-primary/10 pt-5"
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
