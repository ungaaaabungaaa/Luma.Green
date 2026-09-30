"use client";

import { useQuery } from "convex/react";
import { BookOpenIcon, SearchIcon } from "lucide-react";
import { useId, useState } from "react";

import {
  AppPageHeader,
  EmptyState,
  ListSkeleton,
} from "@/components/app/page-parts";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { api } from "../../../../convex/_generated/api";
import type { RuleGroup } from "../../../../convex/lib/rules";
import { GROUP_LABELS, GROUP_ORDER } from "./rule-format";
import { RuleColumnHeader, RuleRow } from "./rule-row";
import { RuleSheet } from "./rule-sheet";
import type { RuleItem } from "./rule-types";

/** Rules whose name, key or note mentions every word of the search. */
export function isSearchMatch(rule: RuleItem, search: string): boolean {
  const words = search.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  const haystack =
    `${rule.label} ${rule.key} ${rule.active.note ?? rule.defaultNote}`.toLowerCase();
  return words.every((word) => haystack.includes(word));
}

/** How many rules the admin has changed, and how many changes are waiting. */
export function ruleTally(rules: readonly RuleItem[]): string {
  const changed = rules.filter((rule) => rule.active.byAdmin).length;
  const upcoming = rules.filter((rule) => rule.upcoming.length > 0).length;
  return [
    `${String(rules.length)} rules`,
    `${String(changed)} changed by you`,
    `${String(upcoming)} with a change coming`,
  ].join(" · ");
}

/**
 * `/admin/rules`: every legal threshold, rate and deadline the platform
 * uses, grouped by law, with the value in force and a drawer to change it
 * from a date. Every other area reads these values, so a notification
 * changes a row here and never the code.
 */
export function Rulebook() {
  const rules = useQuery(api.rulebook.listRules);
  const [search, setSearch] = useState("");
  const [openKey, setOpenKey] = useState<string | null>(null);
  const searchId = useId();

  const header = (
    <AppPageHeader
      title="Rules"
      lead="Every legal threshold, rate and deadline the platform uses, as dated data. Change a value from a date and the old one stays in the history."
    />
  );
  if (rules === undefined) {
    return (
      <div className="flex max-w-5xl flex-col gap-6">
        {header}
        <ListSkeleton rows={4} />
      </div>
    );
  }

  const shown = rules.filter((rule) => isSearchMatch(rule, search));
  const openRule = rules.find((rule) => rule.key === openKey) ?? null;

  return (
    <div className="flex max-w-5xl flex-col gap-6">
      {header}
      <p className="text-sm text-muted-foreground">
        Research, not legal advice: a lawyer and a CA review these numbers
        before real money moves. Each rule links to the notification or document
        it comes from.
      </p>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Label htmlFor={searchId} className="sr-only">
            Search rules
          </Label>
          <SearchIcon
            aria-hidden
            className="pointer-events-none absolute inset-y-0 start-3 my-auto size-4 text-muted-foreground"
          />
          <Input
            id={searchId}
            type="search"
            value={search}
            placeholder="Search rules"
            onChange={(event) => {
              setSearch(event.target.value);
            }}
            className="ps-9"
          />
        </div>
        <p className="text-sm text-muted-foreground">{ruleTally(rules)}</p>
      </div>
      {shown.length === 0 ? (
        <EmptyState
          icon={BookOpenIcon}
          title="No rule matches"
          body="Try a shorter word, or the rule's key, like ewayBill."
        />
      ) : (
        GROUP_ORDER.map((group) => (
          <RuleGroupSection
            key={group}
            group={group}
            rules={shown.filter((rule) => rule.group === group)}
            onOpen={(rule) => {
              setOpenKey(rule.key);
            }}
          />
        ))
      )}
      <RuleSheet
        rule={openRule}
        onClose={() => {
          setOpenKey(null);
        }}
      />
    </div>
  );
}

function RuleGroupSection({
  group,
  rules,
  onOpen,
}: {
  group: RuleGroup;
  rules: readonly RuleItem[];
  onOpen: (rule: RuleItem) => void;
}) {
  if (rules.length === 0) return null;
  const { title, lead } = GROUP_LABELS[group];
  const headingId = `rules-${group}`;
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-3">
      <div className="flex flex-col gap-0.5">
        <h2 id={headingId} className="text-lg font-semibold">
          {title}
        </h2>
        <p className="text-sm text-muted-foreground">{lead}</p>
      </div>
      <div className="rounded-xl bg-card pt-3 ring-1 ring-foreground/10 md:pt-2">
        <RuleColumnHeader />
        <div className="divide-y">
          {rules.map((rule) => (
            <RuleRow key={rule.key} rule={rule} onOpen={onOpen} />
          ))}
        </div>
      </div>
    </section>
  );
}
