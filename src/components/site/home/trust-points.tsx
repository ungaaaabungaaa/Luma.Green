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
      className="border-y border-border/60 bg-muted/40 py-20"
    >
      <Container className="grid gap-10 lg:grid-cols-[2fr_3fr] lg:gap-16">
        <SectionHeading
          id="trust-heading"
          title={t("heading")}
          intro={t("intro")}
        />
        <ul className="grid gap-x-8 gap-y-8 sm:grid-cols-2">
          {points.map(({ key, icon: Icon }) => (
            <li key={key} className="flex items-start gap-4">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-100 text-brand-900">
                <Icon aria-hidden className="size-5" />
              </span>
              <div className="flex flex-col gap-1">
                <h3 className="font-semibold">
                  {t(`${key}.title`, { count: locales.length })}
                </h3>
                <p className="text-muted-foreground">{t(`${key}.body`)}</p>
              </div>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
