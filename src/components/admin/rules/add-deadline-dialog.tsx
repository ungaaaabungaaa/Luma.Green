"use client";

import { useMutation } from "convex/react";
import { useId, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import {
  type CalendarKind,
  isIsoDate,
  NOTE_MAX_CHARS,
} from "../../../../convex/lib/rules";
import { adminErrorMessage } from "../convex-error";
import { formatDay } from "../format";
import { KIND_LABELS } from "../labels";
import { CALENDAR_ERRORS, KIND_LOOK, KIND_ORDER } from "./calendar-kinds";
import type { CalendarOrgRef } from "./rule-types";

const TITLE_MAX_CHARS = 120;

/** The value the business select uses for the platform's own duties. */
const PLATFORM = "platform";

export interface DeadlineDraft {
  who: string;
  kind: CalendarKind;
  title: string;
  dueAt: string;
  note: string;
}

/** The first thing wrong with a draft, in the admin's words, or null. */
export function draftProblem(draft: DeadlineDraft): string | null {
  const title = draft.title.trim();
  if (title.length === 0 || title.length > TITLE_MAX_CHARS) {
    return CALENDAR_ERRORS.INVALID_TITLE;
  }
  if (!isIsoDate(draft.dueAt)) return CALENDAR_ERRORS.INVALID_DATE;
  return draft.note.length > NOTE_MAX_CHARS
    ? CALENDAR_ERRORS.NOTE_TOO_LONG
    : null;
}

/**
 * The admin puts a dated duty on a business's calendar (or the platform's):
 * a stamp booked, a licence renewal, anything with a date.
 */
export function AddDeadlineDialog({
  isOpen,
  onOpenChange,
  orgs,
  defaultDate,
}: {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  orgs: readonly CalendarOrgRef[];
  /** The day to start from: the one picked on the grid, else today. */
  defaultDate: string;
}) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {isOpen ? (
          <DraftForm
            orgs={orgs}
            defaultDate={defaultDate}
            onSaved={() => {
              onOpenChange(false);
            }}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function DraftForm({
  orgs,
  defaultDate,
  onSaved,
}: {
  orgs: readonly CalendarOrgRef[];
  defaultDate: string;
  onSaved: () => void;
}) {
  const schedule = useMutation(api.rulebook.scheduleDeadline);
  const id = useId();
  const [draft, setDraft] = useState<DeadlineDraft>({
    who: PLATFORM,
    kind: "custom",
    title: "",
    dueAt: defaultDate,
    note: "",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [showProblem, setShowProblem] = useState(false);

  const problem = draftProblem(draft);
  const problemId = `${id}-problem`;

  function update(patch: Partial<DeadlineDraft>) {
    setDraft((current) => ({ ...current, ...patch }));
  }

  async function save() {
    if (problem) {
      setShowProblem(true);
      return;
    }
    setIsSaving(true);
    try {
      await schedule({
        orgId: draft.who === PLATFORM ? undefined : (draft.who as Id<"orgs">),
        kind: draft.kind,
        title: draft.title.trim(),
        dueAt: draft.dueAt,
        note: draft.note.trim() || undefined,
      });
      const org = orgs.find((candidate) => candidate.id === draft.who);
      toast.success(
        `${draft.title.trim()} is on the calendar for ${formatDay(draft.dueAt)}.`,
        {
          description: org
            ? `${org.name} sees it on their deadlines.`
            : undefined,
        },
      );
      onSaved();
    } catch (error) {
      toast.error(adminErrorMessage(error, CALENDAR_ERRORS));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form
      noValidate
      className="grid gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        void save();
      }}
    >
      <DialogHeader>
        <DialogTitle>Add a deadline</DialogTitle>
        <DialogDescription>
          A dated duty for one business, or for the platform. They see it on
          their deadlines and can tick it off themselves.
        </DialogDescription>
      </DialogHeader>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${id}-who`}>Whose</Label>
        <Select
          value={draft.who}
          onValueChange={(who) => {
            update({ who });
          }}
        >
          <SelectTrigger id={`${id}-who`} className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={PLATFORM}>The platform</SelectItem>
            {orgs.map((org) => (
              <SelectItem key={org.id} value={org.id}>
                {org.name}
                <span className="text-muted-foreground">
                  {" "}
                  · {KIND_LABELS[org.kind]}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${id}-kind`}>Kind</Label>
        <Select
          value={draft.kind}
          onValueChange={(kind) => {
            update({ kind: kind as CalendarKind });
          }}
        >
          <SelectTrigger id={`${id}-kind`} className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {KIND_ORDER.map((kind) => (
              <SelectItem key={kind} value={kind}>
                {KIND_LOOK[kind].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${id}-title`}>What</Label>
        <Input
          id={`${id}-title`}
          value={draft.title}
          maxLength={TITLE_MAX_CHARS}
          placeholder="Trade licence renewal"
          autoComplete="off"
          aria-invalid={showProblem && problem ? true : undefined}
          aria-describedby={showProblem && problem ? problemId : undefined}
          onChange={(event) => {
            update({ title: event.target.value });
          }}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${id}-due`}>Due on</Label>
        <Input
          id={`${id}-due`}
          type="date"
          value={draft.dueAt}
          className="tabular-nums"
          onChange={(event) => {
            update({ dueAt: event.target.value });
          }}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${id}-note`}>Note</Label>
        <Textarea
          id={`${id}-note`}
          value={draft.note}
          rows={3}
          maxLength={NOTE_MAX_CHARS}
          placeholder="What to do and where. The business reads this."
          onChange={(event) => {
            update({ note: event.target.value });
          }}
        />
      </div>
      {showProblem && problem ? (
        <p id={problemId} role="alert" className="text-sm text-destructive">
          {problem}
        </p>
      ) : null}
      <DialogFooter>
        <DialogClose asChild>
          <Button type="button" variant="outline" disabled={isSaving}>
            Cancel
          </Button>
        </DialogClose>
        <Button type="submit" disabled={isSaving}>
          {isSaving ? "Adding…" : "Add to the calendar"}
        </Button>
      </DialogFooter>
    </form>
  );
}
