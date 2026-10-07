"use client";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useId, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { isLocale, localeDirection } from "@/i18n/locales";
import { authClient } from "@/lib/auth-client";
import { convexSiteUrlFrom } from "@/lib/convex-urls";
import { clientEnv } from "@/lib/env";

export function Choice({
  label,
  value,
  onChange,
  options,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { id: string; label: string }[];
  disabled?: boolean;
}) {
  const id = useId();
  const locale = useLocale();
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Select
        value={value}
        onValueChange={onChange}
        disabled={disabled}
        dir={isLocale(locale) ? localeDirection(locale) : "ltr"}
      >
        <SelectTrigger id={id} className="min-h-11 w-full">
          <SelectValue placeholder={label} />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem value={o.id} key={o.id}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
export function useQualityAction() {
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const running = useRef(false);
  return {
    busy,
    failed,
    run: async (action: () => Promise<void>) => {
      if (running.current) return;
      running.current = true;
      setBusy(true);
      setFailed(false);
      try {
        await action();
      } catch {
        setFailed(true);
      } finally {
        running.current = false;
        setBusy(false);
      }
    },
  };
}
export function Download({
  id,
  name,
  reportId,
}: {
  id: string;
  name: string;
  reportId?: string;
}) {
  const t = useTranslations("qualityDocuments");
  const action = useQualityAction();
  const controller = useRef<AbortController | null>(null);
  useEffect(
    () => () => {
      controller.current?.abort();
    },
    [],
  );
  return (
    <div>
      <Button
        variant="outline"
        className="min-h-11"
        disabled={action.busy}
        onClick={() => {
          void action.run(async () => {
            const abort = new AbortController();
            controller.current = abort;
            const { data } = await authClient.convex.token({
              fetchOptions: { throw: false },
            });
            abort.signal.throwIfAborted();
            if (!data?.token) throw new Error("AUTH_REQUIRED");
            const site =
              clientEnv.NEXT_PUBLIC_CONVEX_SITE_URL ??
              (clientEnv.NEXT_PUBLIC_CONVEX_URL
                ? convexSiteUrlFrom(clientEnv.NEXT_PUBLIC_CONVEX_URL)
                : undefined);
            if (!site) throw new Error("UNAVAILABLE");
            const url = new URL(
              `/quality-files/${encodeURIComponent(id)}`,
              site,
            );
            if (reportId) url.searchParams.set("report", reportId);
            const response = await fetch(url, {
              headers: { Authorization: `Bearer ${data.token}` },
              cache: "no-store",
              signal: abort.signal,
            });
            if (!response.ok) throw new Error("DENIED");
            const blob = await response.blob();
            abort.signal.throwIfAborted();
            const local = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = local;
            link.download = name;
            link.click();
            setTimeout(() => {
              URL.revokeObjectURL(local);
            }, 1000);
          });
        }}
      >
        {t("download")}
      </Button>
      {action.failed ? (
        <p role="alert" className="text-sm text-destructive">
          {t("error")}
        </p>
      ) : null}
    </div>
  );
}
