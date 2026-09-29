import {
  type LucideIcon,
  ScrollTextIcon,
  SmartphoneIcon,
  UsersIcon,
} from "lucide-react";
import { getTranslations } from "next-intl/server";

import { Container } from "../container";
import { SectionHeading } from "../section-heading";

/** Three shifts in India that make this the moment — no invented numbers. */
const reasons = [
  { key: "epr", icon: ScrollTextIcon },
  { key: "informal", icon: UsersIcon },
  { key: "upi", icon: SmartphoneIcon },
] as const satisfies readonly { key: string; icon: LucideIcon }[];

export async function WhyNow() {
  const t = await getTranslations("home.whyNow");

  return (
    <section aria-labelledby="why-now-heading" className="py-20">
      <Container className="flex flex-col gap-10">
        <SectionHeading
          id="why-now-heading"
          title={t("heading")}
          intro={t("intro")}
        />
        <ul className="grid gap-4 md:grid-cols-3">
          {reasons.map(({ key, icon: Icon }) => (
            <li
              key={key}
              className="flex flex-col gap-3 rounded-2xl border bg-card p-6"
            >
              <span className="flex size-11 items-center justify-center rounded-xl bg-brand-50 text-primary">
                <Icon aria-hidden className="size-5" />
              </span>
              <h3 className="text-lg font-semibold">{t(`${key}.title`)}</h3>
              <p className="text-muted-foreground">{t(`${key}.body`)}</p>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
