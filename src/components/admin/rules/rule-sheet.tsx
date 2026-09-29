"use client";

import { useMutation } from "convex/react";
import { HistoryIcon, PenLineIcon } from "lucide-react";
import { useId, useState } from "react";
import { toast } from "sonner";

import { StatusPill } from "@/components/app/page-parts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

import { api } from "../../../../convex/_generated/api";
import {
  indiaDate,
  isIsoDate,
  NOTE_MAX_CHARS,
  type RuleValue,
} from "../../../../convex/lib/rules";
import { adminErrorMessage } from "../convex-error";
import { formatDay, formatWhen } from "../format";
import {
  formatRuleValue,
  INPUT_PROBLEM_MESSAGES,
  parseRuleInput,
  ruleInputValue,
  SAVE_ERRORS,
  UNIT_LABELS,
} from "./rule-format";
import type { RuleItem, RuleRowData } from "./rule-types";
import { RuleValueField } from "./rule-value-field";
import { SourceLink } from "./source-link";

/**
 * One rule, opened from the table: why it exists, a form to change it from
 * a date, and every value it has had. Nothing is ever overwritten — a change
 * is a new dated row, and the history keeps the old one.
 */
export function RuleSheet({
  rule,
  onClose,
}: {
  rule: RuleItem | null;
  onClose: () => void;
}) {
  return (
    <Sheet
      open={rule !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <SheetContent className="overflow-y-auto data-[side=right]:sm:max-w-lg">
        {rule ? <RuleSheetBody rule={rule} onSaved={onClose} /> : null}
      </SheetContent>
    </Sheet>
  );
}

function RuleSheetBody({
  rule,
  onSaved,
}: {
  rule: RuleItem;
  onSaved: () => void;
}) {
  const { active } = rule;
  return (
    <>
      <SheetHeader className="pe-12">
        <SheetTitle className="text-lg">{rule.label}</SheetTitle>
        <SheetDescription>
          <span className="font-mono">{rule.key}</span> · {UNIT_LABELS[rule.unit]}
        </SheetDescription>
      </SheetHeader>
      <div className="flex flex-col gap-6 px-4 pb-6">
        <InForce rule={rule} />
        <section aria-labelledby="why" className="flex flex-col gap-1.5">
          <h3 id="why" className="text-sm font-medium">
            Why this rule
          </h3>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {active.note ?? rule.defaultNote}
          </p>
          <SourceLink url={active.sourceUrl} className="text-sm" />
        </section>
        <Tabs defaultValue="change">
          <TabsList className="w-full">
            <TabsTrigger value="change" className="flex-1">
              <PenLineIcon aria-hidden />
              Change
            </TabsTrigger>
            <TabsTrigger value="history" className="flex-1">
              <HistoryIcon aria-hidden />
              History ({rule.history.length})
            </TabsTrigger>
          </TabsList>
          <TabsContent value="change" className="pt-2">
            <ChangeForm key={rule.key} rule={rule} onSaved={onSaved} />
          </TabsContent>
          <TabsContent value="history" className="pt-2">
            <History rule={rule} />
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}

function InForce({ rule }: { rule: RuleItem }) {
  const { active } = rule;
  return (
    <div className="flex flex-col gap-2 rounded-xl bg-muted/60 p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-sm text-muted-foreground">In force today</span>
        <span className="text-2xl font-semibold tracking-tight tabular-nums">
          {formatRuleValue(active.value, rule.unit)}
        </span>
      </div>
      <p className="text-xs text-muted-foreground">
        Since {formatDay(active.effectiveFrom)}
        {active.byAdmin
          ? ` · changed by you ${formatWhen(active.updatedAt)}`
          : " · the seeded default"}
      </p>
      {rule.upcoming.map((row) => (
        <p
          key={row.id ?? row.effectiveFrom}
          className="flex flex-wrap items-center gap-2 text-sm"
        >
          <StatusPill tone="warn">Coming</StatusPill>
          <span>
            <span className="font-medium tabular-nums">
              {formatRuleValue(row.value, rule.unit)}
            </span>{" "}
            from {formatDay(row.effectiveFrom)}
          </span>
        </p>
      ))}
    </div>
  );
}

// --- Change ------------------------------------------------------------------

/** What the form proposes, or the first thing wrong with it. */
export function proposedChange(input: {
  rule: RuleItem;
  text: string;
  flag: boolean;
  effectiveFrom: string;
  note: string;
  sourceUrl: string;
}):
  | { ok: true; value: RuleValue; isDifferent: boolean }
  | { ok: false; message: string } {
  const { rule, effectiveFrom } = input;
  const parsed = parseRuleInput(
    rule.unit === "flag" ? String(input.flag) : input.text,
    rule.unit,
  );
  if (!parsed.ok) {
    return { ok: false, message: INPUT_PROBLEM_MESSAGES[parsed.problem] };
  }
  if (!isIsoDate(effectiveFrom)) {
    return { ok: false, message: SAVE_ERRORS.INVALID_DATE };
  }
  if (input.note.length > NOTE_MAX_CHARS) {
    return { ok: false, message: SAVE_ERRORS.NOTE_TOO_LONG };
  }
  const { active } = rule;
  const isDifferent =
    parsed.value !== active.value ||
    input.note.trim() !== (active.note ?? "") ||
    input.sourceUrl.trim() !== (active.sourceUrl ?? "");
  return { ok: true, value: parsed.value, isDifferent };
}

function ChangeForm({
  rule,
  onSaved,
}: {
  rule: RuleItem;
  onSaved: () => void;
}) {
  const saveRule = useMutation(api.rulebook.saveRule);
  const id = useId();
  const { active } = rule;
  const [text, setText] = useState(() =>
    ruleInputValue(active.value, rule.unit),
  );
  const [flag, setFlag] = useState(active.value === true);
  const [effectiveFrom, setEffectiveFrom] = useState(() =>
    indiaDate(Date.now()),
  );
  const [note, setNote] = useState(active.note ?? "");
  const [sourceUrl, setSourceUrl] = useState(active.sourceUrl ?? "");
  const [isSaving, setIsSaving] = useState(false);

  const change = proposedChange({
    rule,
    text,
    flag,
    effectiveFrom,
    note,
    sourceUrl,
  });
  const problemId = `${id}-problem`;
  const canSave = change.ok && change.isDifferent && !isSaving;

  async function save() {
    if (!change.ok || !change.isDifferent) return;
    setIsSaving(true);
    try {
      const result = await saveRule({
        key: rule.key,
        value: change.value,
        effectiveFrom,
        note: note.trim() || undefined,
        sourceUrl: sourceUrl.trim() || undefined,
      });
      const shown = formatRuleValue(change.value, rule.unit);
      if (result.id === null) {
        toast.info(
          `${rule.label} already says ${shown} from ${formatDay(effectiveFrom)}.`,
        );
      } else {
        toast.success(
          `${rule.label}: ${shown} from ${formatDay(effectiveFrom)}.`,
          { description: "The old value stays in the history." },
        );
      }
      onSaved();
    } catch (error) {
      toast.error(adminErrorMessage(error, SAVE_ERRORS));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form
      noValidate
      aria-label={`Change ${rule.label}`}
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        void save();
      }}
    >
      <RuleValueField
        id={`${id}-value`}
        unit={rule.unit}
        text={text}
        flag={flag}
        onText={setText}
        onFlag={setFlag}
        isInvalid={!change.ok}
        describedBy={change.ok ? undefined : problemId}
      />
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${id}-from`}>Effective from</Label>
        <Input
          id={`${id}-from`}
          type="date"
          value={effectiveFrom}
          onChange={(event) => {
            setEffectiveFrom(event.target.value);
          }}
          className="tabular-nums"
        />
        <p className="text-xs text-muted-foreground">
          A future date waits its turn; today's applies at once.
        </p>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${id}-note`}>Why this rule</Label>
        <Textarea
          id={`${id}-note`}
          value={note}
          rows={4}
          maxLength={NOTE_MAX_CHARS + 50}
          onChange={(event) => {
            setNote(event.target.value);
          }}
          placeholder="What it does here and where it comes from."
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${id}-source`}>Source</Label>
        <Input
          id={`${id}-source`}
          type="url"
          inputMode="url"
          value={sourceUrl}
          onChange={(event) => {
            setSourceUrl(event.target.value);
          }}
          placeholder="https://… or docs/…"
        />
      </div>
      {change.ok ? null : (
        <p id={problemId} role="alert" className="text-sm text-destructive">
          {change.message}
        </p>
      )}
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          {change.ok && !change.isDifferent ? "Nothing has changed yet." : null}
        </p>
        <Button type="submit" disabled={!canSave}>
          {isSaving ? "Saving…" : "Save from this date"}
        </Button>
      </div>
    </form>
  );
}

// --- History -----------------------------------------------------------------

function History({ rule }: { rule: RuleItem }) {
  if (rule.history.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Only the default so far. Changes you save appear here with their date.
      </p>
    );
  }
  return (
    <ol className="flex flex-col divide-y">
      {rule.history.map((row) => (
        <HistoryRow key={row.id ?? row.effectiveFrom} rule={rule} row={row} />
      ))}
    </ol>
  );
}

function HistoryRow({ rule, row }: { rule: RuleItem; row: RuleRowData }) {
  const isActive = row.id !== null && row.id === rule.active.id;
  return (
    <li className="flex flex-col gap-1 py-3 first:pt-0">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium tabular-nums">
          {formatRuleValue(row.value, rule.unit)}
        </span>
        <span className="text-sm text-muted-foreground">
          from {formatDay(row.effectiveFrom)}
        </span>
        {isActive ? <StatusPill tone="good">In force</StatusPill> : null}
      </div>
      <p className="text-xs text-muted-foreground">
        {row.byAdmin
          ? `Saved by you ${formatWhen(row.updatedAt)}`
          : "Seeded default"}
      </p>
      {row.note ? (
        <p className="line-clamp-3 text-sm text-muted-foreground">{row.note}</p>
      ) : null}
      <SourceLink url={row.sourceUrl} />
    </li>
  );
}
