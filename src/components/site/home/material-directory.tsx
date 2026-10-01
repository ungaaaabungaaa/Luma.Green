import { ArrowRightIcon } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";

import { MATERIAL_FAMILY_ICONS } from "@/components/app/material-family";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

import {
  CATALOGUE,
  type Family,
  materialName,
} from "../../../../convex/lib/catalogue";
import { Container } from "../container";
import { SectionHeading } from "../section-heading";

const families = [
  "paper",
  "plastic",
  "metal",
  "glass",
  "ewaste",
  "other",
] as const satisfies readonly Family[];

/** Examples come from the product catalogue, never from an invented price list. */
export async function MaterialDirectory() {
  const [home, prices, sell, help, locale] = await Promise.all([
    getTranslations("home"),
    getTranslations("prices.families"),
    getTranslations("sell"),
    getTranslations("help.modules.sortOnce"),
    getLocale(),
  ]);

  return (
    <section
      aria-labelledby="materials-heading"
      className="border-b py-16 lg:py-24"
    >
      <Container className="space-y-10">
        <div className="flex min-w-0 flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <SectionHeading
            id="materials-heading"
            title={home("expansion.materialsTitle")}
            intro={sell("shop.lead")}
          />
          <Button
            asChild
            variant="outline"
            className="h-auto min-h-11 max-w-full min-w-0 self-start py-3 text-start wrap-anywhere whitespace-normal lg:shrink-0"
          >
            <Link href="/sell">
              {sell("basket.next")}
              <ArrowRightIcon aria-hidden className="rtl:rotate-180" />
            </Link>
          </Button>
        </div>
        <ul className="grid min-w-0 grid-flow-dense grid-cols-1 gap-px overflow-hidden rounded-xl border bg-border sm:grid-cols-2 lg:grid-cols-3">
          {families.map((family) => {
            const Icon = MATERIAL_FAMILY_ICONS[family];
            const examples = CATALOGUE.filter(
              (item) => item.stage === "scrap" && item.family === family,
            ).slice(0, 3);
            return (
              <li
                key={family}
                data-reveal
                className="flex min-w-0 flex-col gap-5 bg-card p-6 sm:p-8"
              >
                <Icon aria-hidden className="size-7 text-primary" />
                <div className="space-y-2">
                  <h3 className="font-display text-xl font-semibold tracking-tight">
                    {prices(family)}
                  </h3>
                  <ul className="space-y-1 text-sm leading-relaxed text-muted-foreground">
                    {examples.map((item) => (
                      <li key={item.code}>
                        {materialName(item.names, locale, item.code)}
                      </li>
                    ))}
                  </ul>
                </div>
              </li>
            );
          })}
        </ul>
        <div className="flex min-w-0 flex-col gap-3 border-s-2 border-primary ps-5 sm:flex-row sm:items-baseline sm:gap-8">
          <h3 className="shrink-0 font-semibold">{help("title")}</h3>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {help("p1")} {help("p2")}
          </p>
        </div>
      </Container>
    </section>
  );
}
