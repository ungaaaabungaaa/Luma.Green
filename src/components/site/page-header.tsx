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
          "grid items-center gap-10 py-16 lg:gap-16 lg:py-24",
          art && "lg:grid-cols-[minmax(0,1.3fr)_minmax(0,0.7fr)]",
        )}
      >
        <div className="min-w-0 space-y-6">
          {eyebrow ? (
            <p className="text-sm font-medium text-muted-foreground">
              {eyebrow}
            </p>
          ) : null}
          <h1 className="max-w-5xl font-display text-4xl leading-[1.12] font-medium tracking-tight text-balance sm:text-5xl lg:text-6xl">
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
