import {
  LockIcon,
  type LucideIcon,
  ScaleIcon,
  ScrollTextIcon,
} from "lucide-react";
import { getTranslations } from "next-intl/server";

import { Container } from "./container";

const principles = [
  { key: "auditable", icon: ScrollTextIcon },
  { key: "exact", icon: ScaleIcon },
  { key: "frozen", icon: LockIcon },
] as const satisfies readonly { key: string; icon: LucideIcon }[];

/** The three ledger guarantees from AGENTS.md §1, in user-facing words. */
export async function Principles() {
  const t = await getTranslations("principles");

  return (
    <section aria-labelledby="principles-heading" className="py-20">
      <Container className="space-y-10">
        <div className="max-w-2xl space-y-3">
          <h2
            id="principles-heading"
            className="font-display text-3xl font-semibold tracking-tight text-balance"
          >
            {t("heading")}
          </h2>
          <p className="text-muted-foreground">{t("intro")}</p>
        </div>
        <ul className="grid gap-8 md:grid-cols-3">
          {principles.map(({ key, icon: Icon }) => (
            <li key={key} className="space-y-3">
              <span className="inline-flex size-10 items-center justify-center rounded-lg bg-brand-100 text-brand-900 dark:bg-brand-950 dark:text-brand-200">
                <Icon aria-hidden className="size-5" />
              </span>
              <h3 className="font-semibold">{t(`${key}.title`)}</h3>
              <p className="text-sm text-muted-foreground">
                {t(`${key}.body`)}
              </p>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
