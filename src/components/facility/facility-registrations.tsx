"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { useLocale, useTranslations } from "next-intl";
import { useId, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { EvidenceDialog, LotField } from "@/components/lots/form-parts";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCanOperate } from "@/components/workspace/permissions";
import { isLocale, localeDirection } from "@/i18n/locales";

import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { REGISTRATION_KINDS } from "../../../convex/lib/industrialClassification";

type Registration = FunctionReturnType<
  typeof api.industrialProfiles.registrations
>["rows"][number];
const schema = z
  .object({
    reference: z.string().trim().min(1).max(500),
    issuedAt: z.iso.date(),
    validUntil: z.iso.date(),
  })
  .refine((row) => row.issuedAt <= row.validUntil);

export function FacilityRegistrations({
  facilityId,
}: {
  facilityId: Id<"industrialFacilities">;
}) {
  const t = useTranslations("facility.registration");
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <div className="min-w-0">
      <Button
        type="button"
        variant="outline"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => {
          setOpen(!open);
        }}
      >
        {t("title")}
      </Button>
      {open ? (
        <div id={id} className="mt-4">
          <RegistrationList facilityId={facilityId} />
        </div>
      ) : null}
    </div>
  );
}
function RegistrationList({
  facilityId,
}: {
  facilityId: Id<"industrialFacilities">;
}) {
  const t = useTranslations("facility.registration");
  const common = useTranslations("common");
  const lots = useTranslations("lots");
  const canOperate = useCanOperate();
  const result = useQuery(api.industrialProfiles.registrations, { facilityId });
  return (
    <section
      className="flex min-w-0 flex-col gap-4 border-s-2 ps-4"
      aria-label={t("title")}
    >
      <p className="text-sm text-muted-foreground">{t("lead")}</p>
      {canOperate ? <RegistrationForm facilityId={facilityId} /> : null}
      {result === undefined ? <p role="status">{common("loading")}</p> : null}
      {result?.rows.length === 0 ? <p>{t("empty")}</p> : null}
      {result ? (
        <ul className="divide-y">
          {result.rows.map((row) => (
            <li key={row.id} className="space-y-2 py-3">
              <h3 className="font-medium">{t(`kinds.${row.kind}`)}</h3>
              <p className="break-words">{row.reference}</p>
              <dl className="flex flex-wrap gap-4 text-sm">
                <div>
                  <dt>{t("issuedAt")}</dt>
                  <dd>
                    <time dateTime={row.issuedAt}>{row.issuedAt}</time>
                  </dd>
                </div>
                <div>
                  <dt>{t("validUntil")}</dt>
                  <dd>
                    <time dateTime={row.validUntil}>{row.validUntil}</time>
                  </dd>
                </div>
              </dl>
              <p className="text-sm text-muted-foreground">
                {t(row.dateStatus)}
                {Boolean(row.supersededById) ? ` · ${t("superseded")}` : ""}
              </p>
              {canOperate && !Boolean(row.supersededById) ? (
                <RegistrationForm facilityId={facilityId} original={row} />
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
      {result?.hasMore ? <p>{lots("limit")}</p> : null}
    </section>
  );
}
function RegistrationForm({
  facilityId,
  original,
}: {
  facilityId: Id<"industrialFacilities">;
  original?: Registration;
}) {
  const t = useTranslations("facility.registration");
  const lots = useTranslations("lots");
  const common = useTranslations("common");
  const locale = useLocale();
  const id = useId();
  const [open, setOpen] = useState(false);
  const [failed, setFailed] = useState(false);
  const [kind, setKind] = useState<(typeof REGISTRATION_KINDS)[number]>(
    original?.kind ?? "consent_to_operate",
  );
  const save = useMutation(api.industrialProfiles.recordRegistration);
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      reference: original?.reference ?? "",
      issuedAt: original?.issuedAt ?? "",
      validUntil: original?.validUntil ?? "",
    },
  });
  return (
    <EvidenceDialog
      title={t(original ? "correct" : "add")}
      hint={t("lead")}
      open={open}
      onOpen={() => {
        setOpen(true);
      }}
      onClose={() => {
        if (!form.formState.isSubmitting) setOpen(false);
      }}
    >
      <form
        onSubmit={(event) => {
          void form.handleSubmit(async (values) => {
            setFailed(false);
            try {
              await save({
                ...values,
                facilityId,
                kind,
                supersedesId: original?.id,
              });
              setOpen(false);
              form.reset();
              toast.success(lots("saved"));
            } catch {
              setFailed(true);
              toast.error(common("error"));
            }
          })(event);
        }}
      >
        <fieldset
          disabled={form.formState.isSubmitting}
          className="flex flex-col gap-4"
        >
          <div className="flex flex-col gap-2">
            <label htmlFor={id}>{t("kind")}</label>
            <Select
              value={kind}
              disabled={Boolean(original)}
              dir={isLocale(locale) ? localeDirection(locale) : "ltr"}
              onValueChange={(value) => {
                const next = REGISTRATION_KINDS.find((item) => item === value);
                if (next) setKind(next);
              }}
            >
              <SelectTrigger id={id} className="min-h-11 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REGISTRATION_KINDS.map((value) => (
                  <SelectItem key={value} value={value}>
                    {t(`kinds.${value}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <LotField
            label={t("reference")}
            maxLength={500}
            registration={form.register("reference")}
            invalid={Boolean(form.formState.errors.reference)}
          />
          <LotField
            label={t("issuedAt")}
            type="date"
            registration={form.register("issuedAt")}
            invalid={Boolean(form.formState.errors.issuedAt)}
          />
          <LotField
            label={t("validUntil")}
            type="date"
            registration={form.register("validUntil")}
            invalid={Boolean(form.formState.errors.validUntil)}
          />
          {failed || Object.keys(form.formState.errors).length > 0 ? (
            <p role="alert" className="text-sm text-destructive">
              {common("error")}
            </p>
          ) : null}
          <Button
            type="submit"
            disabled={form.formState.isSubmitting}
            className="self-start"
          >
            {lots(form.formState.isSubmitting ? "saving" : "save")}
          </Button>
        </fieldset>
      </form>
    </EvidenceDialog>
  );
}
