import type { StoryScene } from "@/components/showcase/role-story-image";
import { cn } from "@/lib/utils";

import { Container } from "./container";
import { PageBanner } from "./page-banner";
import effects from "./public-effects.module.css";

/** A restrained title and a clear reading order shared by public routes. */
export function PageHeader({
  title,
  lead,
  eyebrow,
  scene,
  atmosphere = false,
}: {
  title: string;
  lead: string;
  eyebrow?: string;
  scene: StoryScene;
  atmosphere?: boolean;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden border-b bg-background",
        atmosphere && effects.mesh,
      )}
    >
      <Container className="grid min-w-0 gap-8 py-8 sm:py-12 lg:grid-cols-[1fr_0.8fr] lg:items-center lg:gap-16 lg:py-16">
        <div className="min-w-0 space-y-4 lg:space-y-6">
          {eyebrow ? (
            <p className="border-s-2 border-primary ps-3 text-sm font-medium text-muted-foreground">
              {eyebrow}
            </p>
          ) : null}
          <h1
            data-text-entrance={atmosphere || undefined}
            className={cn(
              "max-w-2xl font-display text-4xl leading-[1.1] font-semibold tracking-tight text-balance sm:text-5xl lg:text-6xl",
              atmosphere && effects.heading,
            )}
          >
            {title}
          </h1>
          <p className="max-w-2xl text-base leading-relaxed text-pretty text-muted-foreground sm:text-lg">
            {lead}
          </p>
        </div>
        <PageBanner scene={scene} split />
      </Container>
    </div>
  );
}
