import { ClockIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

/**
 * Shown instead of the phone form when this deployment can't send SMS codes
 * yet — production before the MSG91 DLT templates are approved.
 */
export function SignInUnavailable() {
  const t = useTranslations("auth");

  return (
    <Card role="status" className="border-border/80 bg-card shadow-sm">
      <CardHeader className="gap-5 p-7 sm:p-9">
        <span className="flex size-16 items-center justify-center rounded-2xl border border-brand-100 bg-brand-50 text-primary">
          <ClockIcon aria-hidden className="size-6" />
        </span>
        <CardTitle className="font-display text-3xl leading-tight tracking-tight">
          <h1>{t("unavailableTitle")}</h1>
        </CardTitle>
        <CardDescription className="text-base leading-relaxed">
          {t("unavailableBody")}
        </CardDescription>
      </CardHeader>
    </Card>
  );
}
