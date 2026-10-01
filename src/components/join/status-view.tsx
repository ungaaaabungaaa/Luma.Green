"use client";

import { useMutation } from "convex/react";
import {
  BadgeCheckIcon,
  CircleCheckIcon,
  ClockIcon,
  FilePenLineIcon,
  PauseCircleIcon,
  XCircleIcon,
} from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { type ReactNode, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Link, useRouter } from "@/i18n/navigation";

import { api } from "../../../convex/_generated/api";
import {
  type ApplicationKind,
  isBusinessKind,
} from "../../../convex/lib/onboarding";
import { FormSkeleton } from "./join-gate";
import { RoleCards } from "./role-cards";
import { type Application, useMine } from "./use-mine";

/** Where someone continues their form: step 1 for businesses. */
function formPath(kind: ApplicationKind): string {
  return `/join/${kind}`;
}

function StatusCard({
  icon,
  tone = "neutral",
  title,
  lead,
  children,
}: {
  icon: ReactNode;
  tone?: "neutral" | "good" | "bad";
  title: string;
  lead: string;
  children?: ReactNode;
}) {
  const toneClass = {
    neutral: "bg-primary/10 text-primary",
    good: "bg-primary/10 text-primary",
    bad: "bg-destructive/10 text-destructive",
  }[tone];
  return (
    <section className="flex flex-col gap-6 rounded-xl border border-border bg-card p-6 sm:p-8">
      <span
        className={`flex size-12 items-center justify-center rounded-lg ${toneClass}`}
      >
        {icon}
      </span>
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-3xl leading-tight font-semibold tracking-tight">
          {title}
        </h1>
        <p className="text-muted-foreground">{lead}</p>
      </div>
      {children}
    </section>
  );
}

function Note({ text }: { text: string | undefined }) {
  if (!text) return null;
  return (
    <blockquote className="rounded-xl border-s-4 border-primary bg-muted/60 p-4 whitespace-pre-line">
      {text}
    </blockquote>
  );
}

/**
 * `/join/status`: the one place an applicant always lands. No application →
 * pick a role; otherwise where it stands and what happens next.
 */
export function StatusView() {
  const t = useTranslations("join.status");
  const mine = useMine();
  const router = useRouter();

  useEffect(() => {
    if (mine === null) {
      router.replace({ pathname: "/login", query: { next: "/join/status" } });
    }
  }, [mine, router]);

  if (mine === undefined || mine === null) return <FormSkeleton />;
  const { application } = mine;

  if (!application) {
    return (
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-1">
          <h1 className="font-display text-3xl leading-tight font-semibold tracking-tight">
            {t("none.title")}
          </h1>
          <p className="text-muted-foreground">{t("none.lead")}</p>
        </div>
        <RoleCards />
      </div>
    );
  }
  return <ApplicationStatus application={application} />;
}

function ApplicationStatus({ application }: { application: Application }) {
  const t = useTranslations("join");
  const format = useFormatter();
  const role = t(`roles.${application.kind}.title`);
  const roleLine = (
    <p className="text-sm font-medium text-primary">
      {t("status.roleLabel", { role })}
    </p>
  );

  switch (application.status) {
    case "draft": {
      return (
        <StatusCard
          icon={<FilePenLineIcon aria-hidden className="size-6" />}
          title={t("status.draft.title")}
          lead={t("status.draft.lead")}
        >
          {roleLine}
          <Button asChild size="lg" className="h-12 text-base">
            <Link href={formPath(application.kind)}>
              {t("status.draft.continue")}
            </Link>
          </Button>
          {application.version === 0 ? <ChangeRole /> : null}
        </StatusCard>
      );
    }
    case "submitted": {
      const checks = isBusinessKind(application.kind)
        ? "business"
        : application.kind;
      return (
        <StatusCard
          icon={<ClockIcon aria-hidden className="size-6" />}
          title={t("status.submitted.title")}
          lead={t("status.submitted.lead")}
        >
          {roleLine}
          {application.submittedAt === undefined ? null : (
            <p className="text-sm text-muted-foreground">
              {t("status.submitted.sentAt", {
                when: format.dateTime(new Date(application.submittedAt), {
                  dateStyle: "medium",
                  timeStyle: "short",
                }),
              })}
            </p>
          )}
          <div className="flex flex-col gap-2">
            <h2 className="font-medium">{t("status.submitted.whatWeCheck")}</h2>
            <ul className="flex flex-col gap-2">
              {(["one", "two", "three"] as const).map((key) => (
                <li key={key} className="flex gap-2 text-sm">
                  <CircleCheckIcon
                    aria-hidden
                    className="mt-0.5 size-4 shrink-0 text-primary"
                  />
                  {t(`status.checks.${checks}.${key}`)}
                </li>
              ))}
            </ul>
          </div>
        </StatusCard>
      );
    }
    case "changes_requested": {
      return (
        <StatusCard
          icon={<FilePenLineIcon aria-hidden className="size-6" />}
          title={t("status.changes_requested.title")}
          lead={t("status.changes_requested.lead")}
        >
          <Note text={application.note} />
          <Button asChild size="lg" className="h-12 text-base">
            <Link href={formPath(application.kind)}>
              {t("status.changes_requested.fix")}
            </Link>
          </Button>
        </StatusCard>
      );
    }
    case "approved": {
      return (
        <StatusCard
          tone="good"
          icon={<BadgeCheckIcon aria-hidden className="size-6" />}
          title={t("status.approved.title")}
          lead={t("status.approved.lead")}
        >
          {roleLine}
          <Button asChild size="lg" className="h-12 text-base">
            <Link href="/app">{t("status.approved.open")}</Link>
          </Button>
        </StatusCard>
      );
    }
    case "rejected": {
      return (
        <StatusCard
          tone="bad"
          icon={<XCircleIcon aria-hidden className="size-6" />}
          title={t("status.rejected.title")}
          lead={t("status.rejected.lead")}
        >
          <Note text={application.note} />
          <Button asChild variant="outline" size="lg" className="h-12">
            <Link href="/contact">{t("status.rejected.contact")}</Link>
          </Button>
        </StatusCard>
      );
    }
    case "suspended": {
      return (
        <StatusCard
          tone="bad"
          icon={<PauseCircleIcon aria-hidden className="size-6" />}
          title={t("status.suspended.title")}
          lead={t("status.suspended.lead")}
        >
          <Button asChild variant="outline" size="lg" className="h-12">
            <Link href="/contact">{t("status.suspended.contact")}</Link>
          </Button>
        </StatusCard>
      );
    }
  }
}

/** Throw the unsent draft away and pick again — after a clear warning. */
function ChangeRole() {
  const t = useTranslations("join");
  const discard = useMutation(api.applications.discard);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isWorking, setIsWorking] = useState(false);

  if (!isConfirming) {
    return (
      <Button
        variant="ghost"
        onClick={() => {
          setIsConfirming(true);
        }}
      >
        {t("status.draft.changeRole")}
      </Button>
    );
  }
  return (
    <div
      role="alertdialog"
      className="flex flex-col gap-3 rounded-xl border p-4"
    >
      <p>{t("status.draft.confirmChange")}</p>
      <div className="flex gap-2">
        <Button
          variant="destructive"
          disabled={isWorking}
          onClick={() => {
            setIsWorking(true);
            void discard({}).finally(() => {
              setIsWorking(false);
              setIsConfirming(false);
            });
          }}
        >
          {t("form.yes")}
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            setIsConfirming(false);
          }}
        >
          {t("form.no")}
        </Button>
      </div>
    </div>
  );
}
