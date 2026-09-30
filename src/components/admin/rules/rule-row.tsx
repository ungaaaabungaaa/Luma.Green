"use client";

import { ChevronRightIcon } from "lucide-react";

import { StatusPill } from "@/components/app/page-parts";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { formatDay } from "../format";
import { formatRuleValue, UNIT_LABELS } from "./rule-format";
import type { RuleItem } from "./rule-types";
import { SourceLink } from "./source-link";

/** The grid every row and the column header share on wide screens. */
export const RULE_COLUMNS =
  "md:grid-cols-[minmax(0,1fr)_11rem_8rem_10rem_5.5rem]";

/** The column names, shown once above the rows on wide screens. */
export function RuleColumnHeader() {
  return (
    <div
      aria-hidden
      className={cn(
        "hidden gap-x-4 border-b px-4 pb-2 text-xs font-medium text-muted-foreground md:grid",
        RULE_COLUMNS,
      )}
    >
      <span>Rule</span>
      <span>In force</span>
      <span>Since</span>
      <span>Source</span>
      <span />
    </div>
  );
}

/** One rule: what's in force, since when, where it comes from. */
export function RuleRow({
  rule,
  onOpen,
}: {
  rule: RuleItem;
  onOpen: (rule: RuleItem) => void;
}) {
  const { active } = rule;
  const next = rule.upcoming.at(0);
  return (
    <div
      className={cn(
        "grid gap-x-4 gap-y-2 px-4 py-3 md:items-center",
        RULE_COLUMNS,
      )}
    >
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="flex flex-wrap items-center gap-2 font-medium">
          {rule.label}
          {active.byAdmin ? (
            <StatusPill tone="info">Changed by you</StatusPill>
          ) : null}
        </span>
        <span className="truncate font-mono text-xs text-muted-foreground">
          {rule.key}
        </span>
      </div>
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="text-lg font-semibold tracking-tight tabular-nums md:text-base">
          {formatRuleValue(active.value, rule.unit)}
        </span>
        <span className="text-xs text-muted-foreground">
          {UNIT_LABELS[rule.unit]}
          {next ? (
            <>
              {" · "}
              <span className="text-amber-800">
                {formatRuleValue(next.value, rule.unit)} from{" "}
                {formatDay(next.effectiveFrom)}
              </span>
            </>
          ) : null}
        </span>
      </div>
      <p className="text-sm text-muted-foreground">
        <span className="md:sr-only">Since </span>
        {formatDay(active.effectiveFrom)}
      </p>
      <div className="min-w-0">
        <SourceLink url={active.sourceUrl} />
      </div>
      <div className="flex md:justify-end">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-9 w-full md:h-7 md:w-auto"
          aria-label={`Open ${rule.label}`}
          onClick={() => {
            onOpen(rule);
          }}
        >
          Open
          <ChevronRightIcon aria-hidden />
        </Button>
      </div>
    </div>
  );
}
