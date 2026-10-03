import type { ReactNode } from "react";

import type { StoryScene } from "@/components/showcase/role-story-image";
import { Container } from "@/components/site/container";
import { PageBanner } from "@/components/site/page-banner";
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
  banner,
  children,
}: {
  eyebrow?: string;
  title: string;
  lead: string;
  breadcrumbs?: ReactNode;
  /** A spot illustration, shown beside the title from tablet width up. */
  art?: ReactNode;
  /** Public directories show a full-width image after their main controls. */
  banner?: StoryScene;
  children?: ReactNode;
}) {
  return (
    <div
      data-parallax-scene
      className="relative isolate overflow-hidden border-b border-border bg-background"
    >
      <Container className="relative flex flex-col gap-8 py-8 sm:py-12 lg:py-16">
        {breadcrumbs}
        <div
          data-reveal
          className={cn(
            "grid items-center gap-6 md:gap-10",
            art && "md:grid-cols-[1fr_auto]",
          )}
        >
          <div className="flex min-w-0 flex-col gap-3 lg:gap-5">
            {eyebrow ? (
              <p className="border-s-2 border-primary ps-3 text-sm font-medium text-muted-foreground">
                {eyebrow}
              </p>
            ) : null}
            <h1 className="max-w-3xl font-display text-4xl leading-[1.1] font-semibold tracking-tight text-balance sm:text-5xl lg:text-6xl">
              {title}
            </h1>
            <p className="max-w-2xl text-base leading-relaxed text-pretty text-muted-foreground sm:text-lg">
              {lead}
            </p>
          </div>
          {art ? (
            <div className="hidden w-24 shrink-0 md:block md:w-32">{art}</div>
          ) : null}
        </div>
        {children}
        {banner ? <PageBanner scene={banner} /> : null}
      </Container>
    </div>
  );
}
