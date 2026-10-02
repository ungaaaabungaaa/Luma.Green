"use client";

import { MessageSquareWarningIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

import { normalizeIndianMobile } from "../../../convex/lib/phone";
import { SaveIndicator } from "./fields";
import type { SaveState } from "./use-autosave";

/** Role, title, step and the save state, at the top of every form. */
export function FormHeader({
  eyebrow,
  title,
  saveState,
  step,
}: {
  eyebrow: string;
  title: string;
  saveState: SaveState;
  step?: string;
}) {
  return (
    <div className="flex flex-col gap-4 border-b border-border pb-7">
      <p className="border-s-2 border-primary ps-3 text-sm font-medium text-primary">
        {eyebrow}
        {step ? <span className="text-muted-foreground"> · {step}</span> : null}
      </p>
      <h1 className="font-display text-3xl leading-tight font-semibold tracking-tight sm:text-4xl">
        {title}
      </h1>
      <SaveIndicator state={saveState} />
    </div>
  );
}

/** The admin's note when they've asked for changes. */
export function ChangesNote({ note }: { note: string | undefined }) {
  const t = useTranslations("join.form");
  if (!note) return null;
  return (
    <Alert>
      <MessageSquareWarningIcon aria-hidden />
      <AlertTitle>{t("changesTitle")}</AlertTitle>
      <AlertDescription className="whitespace-pre-line">
        {note}
      </AlertDescription>
    </Alert>
  );
}

/** The form's last row: what went wrong (if anything) and the main button. */
export function SubmitBar({
  label,
  busyLabel,
  isBusy,
  failure,
  secondary,
}: {
  label: string;
  busyLabel: string;
  isBusy: boolean;
  failure: "fixErrors" | "generic" | null;
  secondary?: ReactNode;
}) {
  const t = useTranslations("join");
  return (
    <div className="flex flex-col gap-4 border-t border-border pt-6">
      {failure ? (
        <p role="alert" className="text-sm text-destructive">
          {t(failure === "fixErrors" ? "form.fixErrors" : "errors.generic")}
        </p>
      ) : null}
      <Button
        type="submit"
        size="lg"
        className="h-12 text-base"
        disabled={isBusy}
      >
        {isBusy ? busyLabel : label}
      </Button>
      {secondary}
    </div>
  );
}

/** Extra numbers as the draft keeps them: E.164 once they're valid. */
export function cleanPhones(
  phones: readonly { number: string; label: string }[] | undefined,
) {
  return (phones ?? []).map((phone) => ({
    number: normalizeIndianMobile(phone.number) ?? phone.number,
    label: phone.label,
  }));
}

/** GSTIN as stored: uppercase, trimmed, and only if they said they have one. */
export function cleanGstin(
  gstRegistered: boolean | undefined,
  gstin: string | undefined,
): string | undefined {
  return gstRegistered ? gstin?.trim().toUpperCase() : undefined;
}
