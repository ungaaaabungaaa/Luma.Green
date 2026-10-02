"use client";

import { useMutation } from "convex/react";
import { CircleCheckIcon, HandIcon, LoaderCircleIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";

import { useFormat } from "@/components/app/format";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import { api } from "../../../convex/_generated/api";
import { jobLabelledBy } from "./job-card";
import { type JobErrorKey, jobErrorKey } from "./job-errors";
import type { Job } from "./job-meta";

const BIG = "h-12 text-base";

function InlineError({ error }: { error: JobErrorKey | null }) {
  const t = useTranslations("saathi.errors");
  if (!error) return null;
  return (
    <p role="alert" className="text-sm text-destructive">
      {t(error)}
    </p>
  );
}

/**
 * Runs a job mutation: a pending state while it's out, and when it fails, a
 * toast plus the reason next to the button.
 */
function useJobAction(run: (args: { jobId: Job["id"] }) => Promise<null>) {
  const t = useTranslations("saathi.errors");
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<JobErrorKey | null>(null);

  const perform = async (jobId: Job["id"], onDone: () => void) => {
    setIsPending(true);
    setError(null);
    try {
      await run({ jobId });
      onDone();
    } catch (error_) {
      const key = jobErrorKey(error_);
      setError(key);
      toast.error(t(key));
    } finally {
      setIsPending(false);
    }
  };
  return {
    isPending,
    error,
    perform,
    clearError: () => {
      setError(null);
    },
  };
}

export function TakeJobButton({ job }: { job: Job }) {
  const t = useTranslations("saathi");
  const action = useTranslations("shop.requests");
  const take = useMutation(api.saathi.take);
  const { isPending, error, perform } = useJobAction(take);

  return (
    <div className="flex flex-col gap-2">
      <Button
        size="lg"
        className={`${BIG} w-full`}
        disabled={isPending}
        aria-label={
          isPending ? t("taking") : `${action("accept")}: ${t("take")}`
        }
        aria-describedby={jobLabelledBy(job)}
        onClick={() => void perform(job.id, () => toast.success(t("taken")))}
      >
        {isPending ? (
          <LoaderCircleIcon aria-hidden className="animate-spin" />
        ) : (
          <HandIcon aria-hidden />
        )}
        {isPending ? t("taking") : action("accept")}
      </Button>
      <InlineError error={error} />
    </div>
  );
}

/** "Mark done", asked once more — finishing can't be undone, and it's paid. */
export function FinishJobButton({ job }: { job: Job }) {
  const t = useTranslations("saathi");
  const format = useFormat();
  const finish = useMutation(api.saathi.finish);
  const { isPending, error, perform, clearError } = useJobAction(finish);
  const [isOpen, setIsOpen] = useState(false);
  const pay = format.money(job.payPaise);

  const onOpenChange = (isNextOpen: boolean) => {
    if (isNextOpen) clearError();
    setIsOpen(isNextOpen);
  };
  const confirm = () =>
    perform(job.id, () => {
      setIsOpen(false);
      toast.success(t("doneToast", { pay }));
    });

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button
          size="lg"
          className={`${BIG} w-full`}
          aria-describedby={jobLabelledBy(job)}
        >
          <CircleCheckIcon aria-hidden />
          {t("markDone")}
        </Button>
      </DialogTrigger>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle className="text-lg">{t("confirm.title")}</DialogTitle>
          <DialogDescription className="text-base">
            {t("confirm.body", { title: job.title, area: job.area, pay })}
          </DialogDescription>
        </DialogHeader>
        <InlineError error={error} />
        <DialogFooter>
          <Button
            variant="outline"
            size="lg"
            className={BIG}
            onClick={() => {
              onOpenChange(false);
            }}
          >
            {t("confirm.no")}
          </Button>
          <Button
            size="lg"
            className={BIG}
            disabled={isPending}
            aria-label={
              isPending ? t("saving") : `${t("markDone")}: ${t("confirm.yes")}`
            }
            onClick={() => void confirm()}
          >
            {isPending ? (
              <LoaderCircleIcon aria-hidden className="animate-spin" />
            ) : (
              <CircleCheckIcon aria-hidden />
            )}
            {t(isPending ? "saving" : "markDone")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
