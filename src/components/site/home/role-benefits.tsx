import {
  ArrowRightIcon,
  CheckIcon,
  FactoryIcon,
  HandHelpingIcon,
  HouseIcon,
  type LucideIcon,
  RecycleIcon,
  StoreIcon,
  WarehouseIcon,
} from "lucide-react";
import { getTranslations } from "next-intl/server";

import { RoleStoryImage } from "@/components/showcase/role-story-image";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

import { Container } from "../container";
import { SectionHeading } from "../section-heading";

/** Households sell; everyone else joins as their role. */
const roles = [
  { key: "household", icon: HouseIcon, href: "/sell" },
  { key: "kabadiwala", icon: StoreIcon, href: "/join/kabadiwala" },
  { key: "yard", icon: WarehouseIcon, href: "/join/yard" },
  { key: "recycler", icon: RecycleIcon, href: "/join/recycler" },
  { key: "manufacturer", icon: FactoryIcon, href: "/join/manufacturer" },
  { key: "saathi", icon: HandHelpingIcon, href: "/join/saathi" },
] as const satisfies readonly { key: string; icon: LucideIcon; href: string }[];

const points = ["one", "two", "three"] as const;

/** What each role gets from Luma.Green, with a way in for each. */
export async function RoleBenefits() {
  const t = await getTranslations("home.roles");

  return (
    <section
      aria-labelledby="roles-heading"
      className="bg-muted/50 py-12 sm:py-20"
    >
      <Container className="flex flex-col gap-8 sm:gap-10">
        <SectionHeading
          id="roles-heading"
          title={t("heading")}
          intro={t("intro")}
        />
        <ul className="grid gap-4 md:grid-cols-2 lg:gap-5 xl:grid-cols-3">
          {roles.map(({ key, icon: Icon, href }, index) => (
            <li
              key={key}
              data-reveal
              className={cn(
                "group relative flex flex-col gap-5 rounded-2xl border p-5 sm:p-6",
                index === 0
                  ? "border-brand-950 bg-brand-950 text-brand-50"
                  : "border-border bg-card",
              )}
            >
              <RoleStoryImage scene={key} compact />
              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    "flex size-12 shrink-0 items-center justify-center rounded-full border",
                    index === 0
                      ? "border-brand-100/25 text-brand-200"
                      : "border-border text-primary",
                  )}
                >
                  <Icon aria-hidden className="size-5" />
                </span>
                <h3 className="text-xl font-semibold tracking-tight sm:text-2xl">
                  {t(`${key}.title`)}
                </h3>
              </div>
              <ul className="flex flex-col gap-2.5">
                {points.map((point) => (
                  <li key={point} className="flex items-start gap-2.5">
                    <CheckIcon
                      aria-hidden
                      className={cn(
                        "mt-0.5 size-4 shrink-0",
                        index === 0 ? "text-brand-300" : "text-primary",
                      )}
                    />
                    <span
                      className={cn(
                        "text-sm leading-relaxed sm:text-base",
                        index === 0
                          ? "text-brand-100"
                          : "text-muted-foreground",
                      )}
                    >
                      {t(`${key}.${point}`)}
                    </span>
                  </li>
                ))}
              </ul>
              <Link
                href={href}
                className={cn(
                  "mt-auto inline-flex min-h-11 w-full items-center justify-between gap-4 border-t pt-5 font-semibold underline-offset-4 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50",
                  index === 0
                    ? "border-brand-100/20 text-brand-100"
                    : "border-border text-primary",
                )}
              >
                {t(`${key}.cta`)}
                <ArrowRightIcon
                  aria-hidden
                  className="size-5 shrink-0 rtl:rotate-180"
                />
              </Link>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
