import {
  CalendarClockIcon,
  type LucideIcon,
  MessageCircleIcon,
  PhoneIcon,
  ReplyIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

import { DemoNote } from "@/components/app/page-parts";
import { Button } from "@/components/ui/button";

import { SUPPORT_CONTACT } from "./content";

function Row({
  icon: Icon,
  title,
  children,
}: {
  icon: LucideIcon;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="flex gap-3">
      <span className="flex size-8 shrink-0 items-start justify-center pt-1 text-primary">
        <Icon aria-hidden className="size-5" />
      </span>
      <div className="flex min-w-0 flex-col gap-0.5">
        <h3 className="font-medium">{title}</h3>
        <div className="text-sm text-muted-foreground">{children}</div>
      </div>
    </div>
  );
}

/** Call and WhatsApp buttons, for the top of the contact page. */
export function QuickContact() {
  const t = useTranslations("help");
  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <Button asChild size="lg" className="h-12 px-5 text-base">
        <a href={`tel:${SUPPORT_CONTACT.tel}`}>
          <PhoneIcon aria-hidden />
          {t("contact.callTitle")}
          <span dir="ltr" className="font-normal">
            {SUPPORT_CONTACT.display}
          </span>
        </a>
      </Button>
      <Button
        asChild
        size="lg"
        variant="outline"
        className="h-12 px-5 text-base"
      >
        <a href={SUPPORT_CONTACT.whatsapp} target="_blank" rel="noreferrer">
          <MessageCircleIcon aria-hidden />
          {t("contact.whatsappTitle")}
        </a>
      </Button>
    </div>
  );
}

/** The side of the contact page: other ways in, hours and reply time. */
export function ContactPanel() {
  const t = useTranslations("help");
  return (
    <aside
      aria-labelledby="contact-other-ways"
      className="flex flex-col gap-6 self-start border-t py-6 md:border-s md:border-t-0 md:py-0 md:ps-6"
    >
      <h2 id="contact-other-ways" className="text-lg font-semibold">
        {t("contact.otherWays")}
      </h2>
      <Row icon={PhoneIcon} title={t("contact.callTitle")}>
        <a
          href={`tel:${SUPPORT_CONTACT.tel}`}
          dir="ltr"
          className="rounded-sm font-medium text-primary underline-offset-4 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          {SUPPORT_CONTACT.display}
        </a>
      </Row>
      <Row icon={MessageCircleIcon} title={t("contact.whatsappTitle")}>
        <a
          href={SUPPORT_CONTACT.whatsapp}
          target="_blank"
          rel="noreferrer"
          dir="ltr"
          className="rounded-sm font-medium text-primary underline-offset-4 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          {SUPPORT_CONTACT.display}
        </a>
      </Row>
      <Row icon={CalendarClockIcon} title={t("contact.hoursTitle")}>
        {t("hours")}
      </Row>
      <Row icon={ReplyIcon} title={t("contact.replyTitle")}>
        {t("replyTime")}
      </Row>
      <DemoNote>{t("contact.sampleNumbers")}</DemoNote>
    </aside>
  );
}
