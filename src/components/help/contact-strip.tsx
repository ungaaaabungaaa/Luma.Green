import { MessageCircleIcon, PencilLineIcon, PhoneIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { DemoNote } from "@/components/app/page-parts";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

import { contactHref, SUPPORT_CONTACT } from "./content";
import type { SupportRole, SupportTopic } from "./support-api";

/**
 * "Still need help?": call, WhatsApp or write, with the hours and how soon we
 * reply. `role` and `topic` pre-fill the contact form.
 */
export function ContactStrip({
  role,
  topic,
}: {
  role?: SupportRole;
  topic?: SupportTopic;
}) {
  const t = useTranslations("help");
  return (
    <section
      data-reveal
      aria-labelledby="contact-strip-heading"
      className="flex flex-col gap-6 border-y py-8 text-foreground lg:flex-row lg:items-center lg:justify-between lg:gap-10"
    >
      <div className="flex max-w-md flex-col gap-3">
        <h2
          id="contact-strip-heading"
          className="font-display text-3xl font-semibold tracking-tight"
        >
          {t("contactStrip.title")}
        </h2>
        <p className="leading-relaxed text-muted-foreground">
          {t("contactStrip.body")}
        </p>
        <p className="text-sm text-muted-foreground">{t("hours")}</p>
      </div>
      <div className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Button
            asChild
            size="lg"
            variant="secondary"
            className="min-h-12 rounded-lg px-5 py-3 whitespace-nowrap"
          >
            <a href={`tel:${SUPPORT_CONTACT.tel}`}>
              <PhoneIcon aria-hidden />
              {t("contactStrip.call")}
            </a>
          </Button>
          <Button
            asChild
            size="lg"
            variant="secondary"
            className="min-h-12 rounded-lg px-5 py-3 whitespace-nowrap"
          >
            <a href={SUPPORT_CONTACT.whatsapp} target="_blank" rel="noreferrer">
              <MessageCircleIcon aria-hidden />
              {t("contactStrip.whatsapp")}
            </a>
          </Button>
          <Button
            asChild
            size="lg"
            variant="outline"
            className="min-h-12 rounded-lg border-border bg-transparent px-5 py-3 whitespace-nowrap text-foreground hover:bg-accent hover:text-accent-foreground"
          >
            <Link href={contactHref(role, topic)}>
              <PencilLineIcon aria-hidden />
              {t("contactStrip.write")}
            </Link>
          </Button>
        </div>
        <p dir="ltr" className="w-fit text-sm font-medium tabular-nums">
          {SUPPORT_CONTACT.display}
        </p>
        <DemoNote>{t("contact.sampleNumbers")}</DemoNote>
      </div>
    </section>
  );
}
