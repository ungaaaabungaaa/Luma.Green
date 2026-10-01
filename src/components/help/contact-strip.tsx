import { MessageCircleIcon, PencilLineIcon, PhoneIcon } from "lucide-react";
import { useTranslations } from "next-intl";

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
      className="flex flex-col gap-8 rounded-xl border border-border bg-muted px-6 py-10 text-foreground sm:px-10 lg:flex-row lg:items-center lg:justify-between"
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
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <Button
          asChild
          size="lg"
          variant="secondary"
          className="h-auto min-h-12 rounded-lg px-5 py-3 whitespace-normal"
        >
          <a href={`tel:${SUPPORT_CONTACT.tel}`}>
            <PhoneIcon aria-hidden />
            {t("contactStrip.call")}
            <span dir="ltr" className="font-normal">
              {SUPPORT_CONTACT.display}
            </span>
          </a>
        </Button>
        <Button
          asChild
          size="lg"
          variant="secondary"
          className="h-auto min-h-12 rounded-lg px-5 py-3 whitespace-normal"
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
          className="h-auto min-h-12 rounded-lg border-border bg-transparent px-5 py-3 whitespace-normal text-foreground hover:bg-accent hover:text-accent-foreground"
        >
          <Link href={contactHref(role, topic)}>
            <PencilLineIcon aria-hidden />
            {t("contactStrip.write")}
          </Link>
        </Button>
      </div>
    </section>
  );
}
