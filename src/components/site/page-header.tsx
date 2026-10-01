import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

import { Container } from "./container";

/** One editorial opening for public pages, with theme-aware layered surfaces. */
export function PageHeader({
  title,
  lead,
  eyebrow,
  art,
}: {
  title: string;
  lead: string;
  eyebrow?: string;
  art?: ReactNode;
}) {
  return (
    <div
      data-parallax-scene
      className="relative isolate overflow-hidden border-b bg-muted/50"
    >
      <div
        aria-hidden
        className="surface-grid pointer-events-none absolute inset-0 opacity-40"
      />
      <Container
        className={cn(
          "relative grid items-center gap-10 py-12 sm:py-16 lg:gap-16 lg:py-20",
          art ? "lg:grid-cols-[1.1fr_0.9fr]" : "lg:grid-cols-[1.15fr_0.85fr]",
        )}
      >
        <div data-reveal className="min-w-0 space-y-5">
          {eyebrow ? (
            <p className="inline-flex items-center gap-3 rounded-full border bg-card px-4 py-2 text-xs font-semibold text-primary">
              <span aria-hidden className="size-1.5 rounded-full bg-primary" />
              {eyebrow}
            </p>
          ) : (
            <span
              aria-hidden
              className="block h-1 w-12 rounded-full bg-primary"
            />
          )}
          <h1 className="max-w-4xl font-display text-4xl leading-tight font-medium tracking-tight text-balance sm:text-5xl lg:text-6xl">
            {title}
          </h1>
          {art ? (
            <p className="max-w-xl text-base leading-relaxed text-pretty text-muted-foreground sm:text-lg">
              {lead}
            </p>
          ) : null}
        </div>
        {art ? (
          <div data-reveal className="min-w-0">
            {art}
          </div>
        ) : (
          <p
            data-reveal
            className="max-w-xl border-s-2 border-primary/30 ps-6 text-base leading-relaxed text-pretty text-muted-foreground sm:text-lg"
          >
            {lead}
          </p>
        )}
      </Container>
    </div>
  );
}
