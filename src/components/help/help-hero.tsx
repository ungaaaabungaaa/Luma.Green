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
    <div className="border-b border-border/60 bg-muted/40">
      <Container className="flex flex-col gap-6 py-10 sm:py-14">
        {breadcrumbs}
        <div className="grid items-center gap-6 md:grid-cols-[1fr_auto] md:gap-10">
          <div className="flex min-w-0 flex-col gap-3">
            {eyebrow ? (
              <p className="text-sm font-medium text-primary">{eyebrow}</p>
            ) : null}
            <h1 className="max-w-3xl font-display text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
              {title}
            </h1>
            <p className="max-w-2xl text-lg text-pretty text-muted-foreground">
              {lead}
            </p>
          </div>
          {art ? (
            <div
              className={cn(
                "w-40 shrink-0 md:w-60",
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
