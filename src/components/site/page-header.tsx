import { Container } from "./container";

/** Title block at the top of every inner page. */
export function PageHeader({ title, lead }: { title: string; lead: string }) {
  return (
    <div className="border-b border-border/60 bg-muted/40">
      <Container className="space-y-4 py-16 sm:py-20">
        <h1 className="max-w-3xl font-display text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
          {title}
        </h1>
        <p className="max-w-2xl text-lg text-pretty text-muted-foreground">
          {lead}
        </p>
      </Container>
    </div>
  );
}
