import { Container } from "./container";

/** Shared editorial opening for public inner pages. Decoration is never copy. */
export function PageHeader({
  title,
  lead,
  eyebrow,
}: {
  title: string;
  lead: string;
  /** A short label above the title — the city, or what kind of page it is. */
  eyebrow?: string;
}) {
  return (
    <div
      data-parallax-scene
      className="relative isolate overflow-hidden border-b border-brand-900/10 bg-brand-50/60"
    >
      <div
        aria-hidden
        data-parallax="36"
        className="pointer-events-none absolute -end-24 -top-28 -z-10 size-96 rounded-full border-[3rem] border-brand-200/40 sm:end-8 sm:-top-40 sm:size-[36rem] sm:border-[5rem]"
      >
        <div className="absolute inset-10 rounded-full border border-brand-800/15" />
        <div className="absolute end-8 bottom-4 size-14 rounded-full bg-brand-800/10" />
      </div>
      <Container className="relative grid gap-8 py-16 sm:py-24 lg:grid-cols-[1.3fr_0.7fr] lg:items-end lg:gap-16 lg:py-28">
        <div data-reveal className="space-y-6">
          {eyebrow ? (
            <p className="inline-flex items-center gap-3 text-sm font-semibold text-brand-900">
              <span aria-hidden className="size-2 rounded-full bg-brand-700" />
              {eyebrow}
            </p>
          ) : (
            <span
              aria-hidden
              className="block h-1 w-14 rounded-full bg-brand-700"
            />
          )}
          <h1 className="max-w-4xl font-display text-4xl leading-tight font-semibold tracking-tight text-balance sm:text-5xl lg:text-6xl">
            {title}
          </h1>
        </div>
        <p
          data-reveal
          className="max-w-2xl border-s-2 border-brand-700/30 ps-5 text-lg leading-relaxed text-pretty text-brand-950/75 lg:mb-2 lg:ps-7"
        >
          {lead}
        </p>
      </Container>
    </div>
  );
}
