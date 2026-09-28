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
    <Card role="status">
      <CardHeader className="gap-3">
        <span className="flex size-12 items-center justify-center rounded-full bg-brand-50 text-primary">
          <ClockIcon aria-hidden className="size-6" />
        </span>
        <CardTitle className="text-xl">
          <h1>{t("unavailableTitle")}</h1>
        </CardTitle>
        <CardDescription className="text-base leading-relaxed">
          {t("unavailableBody")}
        </CardDescription>
      </CardHeader>
    </Card>
  );
}
