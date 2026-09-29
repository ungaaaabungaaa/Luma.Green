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

import { Link } from "@/i18n/navigation";

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
    <section aria-labelledby="roles-heading" className="pb-20">
      <Container className="flex flex-col gap-10">
        <SectionHeading
          id="roles-heading"
          title={t("heading")}
          intro={t("intro")}
        />
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {roles.map(({ key, icon: Icon, href }) => (
            <li
              key={key}
              className="flex flex-col gap-5 rounded-2xl border bg-card p-6"
            >
              <div className="flex items-center gap-3">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-brand-50 text-primary">
                  <Icon aria-hidden className="size-5" />
                </span>
                <h3 className="text-lg font-semibold">{t(`${key}.title`)}</h3>
              </div>
              <ul className="flex flex-col gap-2.5">
                {points.map((point) => (
                  <li key={point} className="flex items-start gap-2.5">
                    <CheckIcon
                      aria-hidden
                      className="mt-0.5 size-5 shrink-0 text-primary"
                    />
                    <span>{t(`${key}.${point}`)}</span>
                  </li>
                ))}
              </ul>
              <Link
                href={href}
                className="mt-auto inline-flex min-h-11 items-center gap-1.5 self-start rounded-sm font-medium text-primary underline-offset-4 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                {t(`${key}.cta`)}
                <ArrowRightIcon aria-hidden className="size-4 rtl:rotate-180" />
              </Link>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
