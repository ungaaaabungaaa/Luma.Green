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
      aria-labelledby="contact-strip-heading"
      className="flex flex-col gap-5 rounded-2xl bg-primary px-5 py-6 text-primary-foreground sm:px-8 md:flex-row md:items-center md:justify-between"
    >
      <div className="flex max-w-md flex-col gap-1">
        <h2
          id="contact-strip-heading"
          className="font-display text-2xl font-semibold tracking-tight"
        >
          {t("contactStrip.title")}
        </h2>
        <p className="text-primary-foreground/85">{t("contactStrip.body")}</p>
        <p className="text-sm text-primary-foreground/85">{t("hours")}</p>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <Button asChild size="lg" variant="secondary" className="h-12 px-5">
          <a href={`tel:${SUPPORT_CONTACT.tel}`}>
            <PhoneIcon aria-hidden />
            {t("contactStrip.call")}
            <span dir="ltr" className="font-normal">
              {SUPPORT_CONTACT.display}
            </span>
          </a>
        </Button>
        <Button asChild size="lg" variant="secondary" className="h-12 px-5">
          <a href={SUPPORT_CONTACT.whatsapp} target="_blank" rel="noreferrer">
            <MessageCircleIcon aria-hidden />
            {t("contactStrip.whatsapp")}
          </a>
        </Button>
        <Button
          asChild
          size="lg"
          variant="outline"
          className="h-12 border-primary-foreground/40 bg-transparent px-5 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
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
