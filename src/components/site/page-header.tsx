import type { StoryRole } from "@/components/showcase/role-story-image";

import { Container } from "./container";
import { PageBanner } from "./page-banner";

/** A restrained title and a clear reading order shared by public routes. */
export function PageHeader({
  title,
  lead,
  eyebrow,
  scene,
}: {
  title: string;
  lead: string;
  eyebrow?: string;
  scene: StoryRole;
}) {
  return (
    <div className="overflow-hidden border-b bg-background">
      <Container className="flex flex-col gap-8 py-8 sm:py-10 lg:gap-10 lg:py-12">
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
        <PageBanner scene={scene} />
      </Container>
    </div>
  );
}
