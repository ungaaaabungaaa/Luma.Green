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
      <Container className="flex flex-col gap-6 py-8 sm:py-10 lg:gap-8 lg:py-12">
        <div className="min-w-0 space-y-3 lg:space-y-4">
          {eyebrow ? (
            <p className="text-sm font-medium text-muted-foreground">
              {eyebrow}
            </p>
          ) : null}
          <h1
            data-text-entrance={atmosphere || undefined}
            className={cn(
              "max-w-5xl font-display text-[2rem] leading-[1.15] font-medium tracking-tight text-balance sm:text-5xl lg:text-6xl",
              atmosphere && effects.heading,
            )}
          >
            {title}
          </h1>
          <p className="max-w-2xl text-base leading-relaxed text-pretty text-muted-foreground sm:text-lg">
            {lead}
          </p>
        </div>
        <PageBanner scene={scene} />
      </Container>
    </div>
  );
}
