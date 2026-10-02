import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

import { Container } from "./container";

/** A restrained title and a clear reading order shared by public routes. */
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
    <div className="overflow-hidden border-b bg-background">
      <Container
        className={cn(
          "grid items-center gap-7 py-10 sm:py-12 lg:gap-14 lg:py-16",
          art && "lg:grid-cols-[minmax(0,1.3fr)_minmax(0,0.7fr)]",
        )}
      >
        <div className="min-w-0 space-y-4">
          {eyebrow ? (
            <p className="text-sm font-medium text-muted-foreground">
              {eyebrow}
            </p>
          ) : null}
          <h1 className="max-w-5xl font-display text-[2rem] leading-[1.15] font-medium tracking-tight text-balance sm:text-5xl lg:text-6xl">
            {title}
          </h1>
          <p className="max-w-2xl text-base leading-relaxed text-pretty text-muted-foreground sm:text-lg">
            {lead}
          </p>
        </div>
        {art ? <div className="min-w-0">{art}</div> : null}
      </Container>
    </div>
  );
}
