import { ArrowRightIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { RoleStoryImage } from "@/components/showcase/role-story-image";
import { actionName } from "@/components/site/action-name";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

const weighingSteps = ["zero", "each", "amount", "receipt"] as const;

/** The board is a price reference; measured weight still determines payment. */
export function PriceGuide() {
  const help = useTranslations("help");
  const prices = useTranslations("prices");
  const sell = useTranslations("sell");
  return (
    <section
      aria-labelledby="price-guide-heading"
      className="grid gap-6 border-t pt-8 lg:grid-cols-2 lg:gap-12 lg:pt-12"
    >
      <div className="min-w-0 space-y-5">
        <RoleStoryImage
          scene="sorting"
          frameClassName="aspect-[3/2]"
          sizes="(min-width: 1280px) 568px, (min-width: 1024px) 48vw, (min-width: 640px) calc(100vw - 64px), calc(100vw - 40px)"
        />
        <p className="max-w-prose text-base leading-relaxed">
          {prices("floorHelp")}
        </p>
        <p className="max-w-prose text-sm leading-relaxed text-muted-foreground">
          {sell("basket.weighNote")}
        </p>
      </div>
      <div className="min-w-0 space-y-5">
        <div className="space-y-2">
          <h2
            id="price-guide-heading"
            className="font-display text-3xl font-medium tracking-tight text-balance sm:text-4xl"
          >
            {help("guides.weighingAtDoor.title")}
          </h2>
          <p className="text-muted-foreground">
            {help("guides.weighingAtDoor.summary")}
          </p>
        </div>
        <ol className="divide-y border-y">
          {weighingSteps.map((step) => (
            <li key={step} className="space-y-1 py-4">
              <h3 className="font-semibold">
                {help(`guides.weighingAtDoor.steps.${step}.title`)}
              </h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {help(`guides.weighingAtDoor.steps.${step}.body`)}
              </p>
            </li>
          ))}
        </ol>
        <Button asChild variant="outline" size="lg">
          <Link
            href="/help/household/weighing-at-door"
            aria-label={actionName(
              help("training.openGuide"),
              help("guides.weighingAtDoor.title"),
            )}
          >
            {help("training.openGuide")}
            <ArrowRightIcon aria-hidden className="rtl:rotate-180" />
          </Link>
        </Button>
      </div>
    </section>
  );
}
