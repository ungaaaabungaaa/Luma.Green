import { ArrowRightIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { RoleStoryImage } from "@/components/showcase/role-story-image";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

import { actionName } from "./action-name";
import { Container } from "./container";

const preparationSteps = ["paper", "bottles", "metal", "ewaste"] as const;

/** Useful preparation detail after the chain overview, using the maintained guide. */
export function SortingGuide() {
  const t = useTranslations("help");
  return (
    <section
      aria-labelledby="sorting-guide-heading"
      className="border-t py-8 sm:py-10 lg:py-16"
    >
      <Container className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-center lg:gap-12">
        <RoleStoryImage
          scene="electronics"
          sizes="(min-width: 1280px) 512px, (min-width: 1024px) 45vw, (min-width: 640px) calc(100vw - 64px), calc(100vw - 40px)"
          frameClassName="aspect-[3/2] lg:aspect-[4/5]"
        />
        <div className="min-w-0 space-y-5">
          <div className="space-y-2">
            <h2
              id="sorting-guide-heading"
              className="font-display text-3xl font-medium tracking-tight text-balance sm:text-4xl"
            >
              {t("guides.getReady.title")}
            </h2>
            <p className="text-base leading-relaxed text-muted-foreground">
              {t("guides.getReady.summary")}
            </p>
          </div>
          <dl className="divide-y border-y">
            {preparationSteps.map((step) => (
              <div key={step} className="space-y-1 py-4">
                <dt className="font-semibold">
                  {t(`guides.getReady.steps.${step}.title`)}
                </dt>
                <dd className="text-sm leading-relaxed text-muted-foreground">
                  {t(`guides.getReady.steps.${step}.body`)}
                </dd>
              </div>
            ))}
          </dl>
          <Button asChild variant="outline" size="lg">
            <Link
              href="/help/household/get-ready"
              aria-label={actionName(
                t("training.openGuide"),
                t("guides.getReady.title"),
              )}
            >
              {t("training.openGuide")}
              <ArrowRightIcon aria-hidden className="rtl:rotate-180" />
            </Link>
          </Button>
        </div>
      </Container>
    </section>
  );
}
