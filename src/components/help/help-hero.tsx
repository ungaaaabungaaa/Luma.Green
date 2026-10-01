import type { ReactNode } from "react";

import { Container } from "@/components/site/container";
import { cn } from "@/lib/utils";

/**
 * The title block at the top of every help page: breadcrumbs, the one `h1`,
 * a lead, an optional picture and whatever the page puts underneath (search,
 * quick actions, jump links).
 */
export function HelpHero({
  eyebrow,
  title,
  lead,
  breadcrumbs,
  art,
  artOnPhones = false,
  children,
}: {
  eyebrow?: string;
  title: string;
  lead: string;
  breadcrumbs?: ReactNode;
  /** A spot illustration, shown beside the title from tablet width up. */
  art?: ReactNode;
  /** Also show `art` on phones, above the title. */
  artOnPhones?: boolean;
  children?: ReactNode;
}) {
  return (
    <div
      data-parallax-scene
      className="relative isolate overflow-hidden border-b border-brand-900/10 bg-brand-50/60"
    >
      <Container className="relative flex flex-col gap-8 py-12 sm:py-20">
        {breadcrumbs}
        <div
          data-reveal
          className="grid items-center gap-8 md:grid-cols-[1fr_auto] md:gap-16"
        >
          <div className="flex min-w-0 flex-col gap-5">
            {eyebrow ? (
              <p className="text-sm font-semibold text-brand-900">{eyebrow}</p>
            ) : null}
            <h1 className="max-w-3xl font-display text-4xl leading-tight font-semibold tracking-tight text-balance sm:text-5xl lg:text-6xl">
              {title}
            </h1>
            <p className="max-w-2xl text-lg leading-relaxed text-pretty text-muted-foreground">
              {lead}
            </p>
          </div>
          {art ? (
            <div
              className={cn(
                "w-40 shrink-0 rounded-full border border-brand-900/10 bg-background/70 p-4 md:w-64 md:p-6",
                artOnPhones ? "-order-1 md:order-none" : "hidden md:block",
              )}
            >
              {art}
            </div>
          ) : null}
        </div>
        {children}
      </Container>
    </div>
  );
}
