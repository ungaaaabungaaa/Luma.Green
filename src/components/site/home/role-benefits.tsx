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

import { Container } from "../container";
import { SectionHeading } from "../section-heading";

const roles = [
  { key: "household", icon: HouseIcon, href: "/sell" },
  { key: "kabadiwala", icon: StoreIcon, href: "/join/kabadiwala" },
  { key: "yard", icon: WarehouseIcon, href: "/join/yard" },
  { key: "recycler", icon: RecycleIcon, href: "/join/recycler" },
  { key: "manufacturer", icon: FactoryIcon, href: "/join/manufacturer" },
  { key: "saathi", icon: HandHelpingIcon, href: "/join/saathi" },
] as const satisfies readonly { key: string; icon: LucideIcon; href: string }[];

const points = ["one", "two", "three"] as const;

/** A compact directory puts every role on equal footing. */
export async function RoleBenefits() {
  const t = await getTranslations("home.roles");
  return (
    <section
      aria-labelledby="roles-heading"
      className="border-y bg-muted/30 py-10 sm:py-12 lg:py-24"
    >
      <Container className="space-y-12">
        <SectionHeading
          id="roles-heading"
          title={t("heading")}
          intro={t("intro")}
        />
        <ul className="divide-y border-y">
          {roles.map(({ key, icon: Icon, href }) => (
            <li
              key={key}
              data-reveal
              className="group grid min-w-0 grid-cols-1 items-center gap-4 py-6 md:grid-cols-2 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)_minmax(0,11rem)] xl:gap-10"
            >
              <div className="flex min-w-0 items-center gap-4">
                <RoleStoryImage
                  scene={key}
                  compact
                  className="w-16 shrink-0 sm:w-20"
                  frameClassName="aspect-square"
                />
                <div className="min-w-0 space-y-2 wrap-anywhere">
                  <Icon aria-hidden className="size-5 text-primary" />
                  <h3 className="font-display text-xl font-semibold tracking-tight">
                    {t(`${key}.title`)}
                  </h3>
                </div>
              </div>
              <ul className="min-w-0 space-y-2 wrap-anywhere">
                {points.map((point) => (
                  <li key={point} className="flex min-w-0 items-start gap-2.5">
                    <CheckIcon
                      aria-hidden
                      className="mt-0.5 size-4 shrink-0 text-primary"
                    />
                    <span className="min-w-0 text-sm leading-relaxed text-muted-foreground">
                      {t(`${key}.${point}`)}
                    </span>
                  </li>
                ))}
              </ul>
              <Link
                href={href}
                className="inline-flex min-h-11 max-w-full min-w-0 items-center justify-between gap-4 rounded-lg py-2 text-sm font-semibold wrap-anywhere underline-offset-4 outline-none hover:text-primary hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 md:col-start-2 xl:col-start-auto"
              >
                <span className="min-w-0">{t(`${key}.cta`)}</span>
                <ArrowRightIcon
                  aria-hidden
                  className="size-5 shrink-0 transition-transform group-hover:translate-x-1 motion-reduce:transition-none rtl:rotate-180 rtl:group-hover:-translate-x-1"
                />
              </Link>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
