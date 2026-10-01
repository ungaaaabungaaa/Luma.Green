import {
  LanguagesIcon,
  LockIcon,
  type LucideIcon,
  ReceiptTextIcon,
  ScaleIcon,
  ShieldCheckIcon,
} from "lucide-react";
import { getTranslations } from "next-intl/server";

import { locales } from "@/i18n/locales";

import { Container } from "../container";
import { SectionHeading } from "../section-heading";

const points = [
  { key: "verified", icon: ShieldCheckIcon },
  { key: "floor", icon: ScaleIcon },
  { key: "escrow", icon: LockIcon },
  { key: "receipts", icon: ReceiptTextIcon },
  { key: "languages", icon: LanguagesIcon },
] as const satisfies readonly { key: string; icon: LucideIcon }[];

/** The rules that make the platform trustworthy, in plain words. */
export async function TrustPoints() {
  const t = await getTranslations("home.trust");

  return (
    <section
      aria-labelledby="trust-heading"
      className="relative overflow-hidden bg-brand-950 py-20 text-brand-50 sm:py-28"
    >
      <Container className="relative grid gap-12 lg:grid-cols-[2fr_3fr] lg:gap-24">
        <SectionHeading
          inverse
          id="trust-heading"
          title={t("heading")}
          intro={t("intro")}
        />
        <ul className="grid gap-x-10 sm:grid-cols-2">
          {points.map(({ key, icon: Icon }) => (
            <li
              data-reveal
              key={key}
              className="flex flex-col items-start gap-5 border-t border-brand-100/20 py-7"
            >
              <span className="flex size-11 shrink-0 items-center justify-center rounded-full border border-brand-100/30 text-brand-200">
                <Icon aria-hidden className="size-5" />
              </span>
              <div className="flex flex-col gap-3">
                <h3 className="text-lg font-semibold">
                  {t(`${key}.title`, { count: locales.length })}
                </h3>
                <p className="text-sm leading-relaxed text-brand-100">
                  {t(`${key}.body`)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
