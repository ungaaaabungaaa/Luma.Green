"use client";

import { ArrowLeftIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { type ReactNode, useEffect, useRef } from "react";

import { Button } from "@/components/ui/button";

/**
 * One step of /sell: its question as a heading, a way back, the content.
 * When the household moves to a step, focus lands on its heading so screen
 * readers announce the new question and the page scrolls to it.
 */
export function StepFrame({
  title,
  lead,
  onBack,
  shouldFocus,
  children,
}: {
  title: string;
  lead?: string;
  onBack?: () => void;
  shouldFocus: boolean;
  children: ReactNode;
}) {
  const t = useTranslations("sell");
  const heading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (shouldFocus) heading.current?.focus();
  }, [shouldFocus]);

  return (
    <section aria-labelledby="sell-step-title" className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        {onBack ? (
          <Button
            variant="ghost"
            onClick={onBack}
            className="-ms-2 h-11 self-start px-2 text-muted-foreground"
          >
            <ArrowLeftIcon aria-hidden className="rtl:rotate-180" />
            {t("back")}
          </Button>
        ) : null}
        <h2
          id="sell-step-title"
          ref={heading}
          tabIndex={-1}
          className="scroll-mt-24 text-2xl font-semibold tracking-tight outline-none"
        >
          {title}
        </h2>
        {lead ? <p className="text-muted-foreground">{lead}</p> : null}
      </div>
      {children}
    </section>
  );
}
