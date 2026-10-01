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
  artLayout = "illustration",
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
  /** Photos keep the title first on phones and use a rectangular surface. */
  artLayout?: "illustration" | "photo";
  children?: ReactNode;
}) {
  return (
    <div
      data-parallax-scene
      className="relative isolate overflow-hidden border-b border-border bg-muted/60"
    >
      <Container className="relative flex flex-col gap-8 py-10 sm:py-14">
        {breadcrumbs}
        <div
          data-reveal
          className={cn(
            "grid items-center gap-8 md:gap-10",
            artLayout === "photo"
              ? "md:grid-cols-[minmax(0,1fr)_minmax(0,30rem)]"
              : "md:grid-cols-[1fr_auto]",
          )}
        >
          <div className="flex min-w-0 flex-col gap-5">
            {eyebrow ? (
              <p className="text-sm font-semibold text-primary">{eyebrow}</p>
            ) : null}
            <h1 className="max-w-3xl font-display text-4xl leading-tight font-medium tracking-tight text-balance sm:text-5xl lg:text-6xl">
              {title}
            </h1>
            <p className="max-w-2xl text-lg leading-relaxed text-pretty text-muted-foreground">
              {lead}
            </p>
          </div>
          {art ? (
            <div
              className={cn(
                artLayout === "photo"
                  ? "w-full max-w-lg min-w-0 justify-self-center"
                  : "w-40 shrink-0 rounded-full border border-border bg-background/70 p-4 md:w-64 md:p-6",
                !artOnPhones && "hidden md:block",
                artOnPhones &&
                  artLayout === "illustration" &&
                  "-order-1 md:order-none",
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
