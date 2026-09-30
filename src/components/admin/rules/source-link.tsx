import { ExternalLinkIcon, FileTextIcon } from "lucide-react";

import { cn } from "@/lib/utils";

import { isWebSource, sourceLabel } from "./rule-format";

/**
 * Where a rule's number comes from: a link to the notification, or the
 * docs file in this repo that explains the decision.
 */
export function SourceLink({
  url,
  className,
}: {
  url: string | undefined;
  className?: string;
}) {
  if (!url) return <span className="text-muted-foreground">No source</span>;
  const base = cn(
    "inline-flex max-w-full items-center gap-1 text-xs",
    className,
  );
  if (!isWebSource(url)) {
    return (
      <span className={cn(base, "text-muted-foreground")}>
        <FileTextIcon aria-hidden className="size-3.5 shrink-0" />
        <span className="truncate font-mono">{sourceLabel(url)}</span>
      </span>
    );
  }
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className={cn(
        base,
        "rounded-sm text-primary underline-offset-4 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50",
      )}
    >
      <span className="truncate">{sourceLabel(url)}</span>
      <ExternalLinkIcon aria-hidden className="size-3.5 shrink-0" />
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}
