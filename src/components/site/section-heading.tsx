import { cn } from "@/lib/utils";

/** A section's h2 and its one-line intro, aligned the same on every page. */
export function SectionHeading({
  id,
  title,
  intro,
  className,
}: {
  id: string;
  title: string;
  intro?: string;
  className?: string;
}) {
  return (
    <div className={cn("max-w-2xl space-y-3", className)}>
      <h2
        id={id}
        className="font-display text-3xl font-semibold tracking-tight text-balance"
      >
        {title}
      </h2>
      {intro ? (
        <p className="text-lg text-pretty text-muted-foreground">{intro}</p>
      ) : null}
    </div>
  );
}
