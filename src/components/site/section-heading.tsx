import { cn } from "@/lib/utils";

/** A section's h2 and intro, with a high-contrast option for brand panels. */
export function SectionHeading({
  id,
  title,
  intro,
  className,
  inverse = false,
}: {
  id: string;
  title: string;
  intro?: string;
  className?: string;
  inverse?: boolean;
}) {
  return (
    <div data-reveal className={cn("max-w-3xl space-y-5", className)}>
      <span
        aria-hidden
        className={cn(
          "block h-1 w-12 rounded-full",
          inverse ? "bg-brand-300" : "bg-brand-700",
        )}
      />
      <h2
        id={id}
        className="scroll-mt-24 font-display text-3xl leading-tight font-semibold tracking-tight text-balance sm:text-4xl lg:text-5xl"
      >
        {title}
      </h2>
      {intro ? (
        <p
          className={cn(
            "max-w-2xl text-base leading-relaxed text-pretty sm:text-lg",
            inverse ? "text-brand-100" : "text-muted-foreground",
          )}
        >
          {intro}
        </p>
      ) : null}
    </div>
  );
}
