import { cva } from "class-variance-authority";

import {
  RoleStoryImage,
  type StoryScene,
} from "@/components/showcase/role-story-image";
import { cn } from "@/lib/utils";

import { Container } from "./container";
import { PageBanner } from "./page-banner";
import effects from "./public-effects.module.css";

const headerLayout = cva("grid min-w-0 lg:items-center", {
  variants: {
    variant: {
      editorial:
        "gap-8 py-8 sm:py-12 lg:grid-cols-[1fr_0.8fr] lg:gap-16 lg:py-16",
      task: "gap-5 py-6 sm:py-8 lg:grid-cols-[minmax(0,1fr)_16rem] lg:gap-10",
    },
  },
  defaultVariants: { variant: "editorial" },
});

const headerTitle = cva(
  "max-w-2xl font-display leading-[1.1] font-semibold tracking-tight text-balance",
  {
    variants: {
      variant: {
        editorial: "text-4xl sm:text-5xl lg:text-6xl",
        task: "text-3xl sm:text-4xl",
      },
    },
    defaultVariants: { variant: "editorial" },
  },
);

/** A restrained title and a clear reading order shared by public routes. */
export function PageHeader({
  title,
  lead,
  eyebrow,
  scene,
  atmosphere = false,
  variant = "editorial",
}: {
  title: string;
  lead: string;
  eyebrow?: string;
  scene: StoryScene;
  atmosphere?: boolean;
  variant?: "editorial" | "task";
}) {
  return (
    <div
      className={cn(
        "overflow-hidden border-b bg-background",
        atmosphere && effects.mesh,
      )}
    >
      <Container className={headerLayout({ variant })}>
        <div className="min-w-0 space-y-4 lg:space-y-6">
          {eyebrow ? (
            <p className="border-s-2 border-primary ps-3 text-sm font-medium text-muted-foreground">
              {eyebrow}
            </p>
          ) : null}
          <h1
            data-text-entrance={atmosphere || undefined}
            className={cn(
              headerTitle({ variant }),
              atmosphere && effects.heading,
            )}
          >
            {title}
          </h1>
          <p className="max-w-2xl text-base leading-relaxed text-pretty text-muted-foreground sm:text-lg">
            {lead}
          </p>
        </div>
        {variant === "task" ? (
          <RoleStoryImage
            scene={scene}
            frameClassName="h-24 aspect-auto sm:h-28 lg:h-40"
            sizes="(min-width: 1024px) 256px, 100vw"
          />
        ) : (
          <PageBanner scene={scene} split />
        )}
      </Container>
    </div>
  );
}
