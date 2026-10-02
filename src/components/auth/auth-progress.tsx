import { CheckIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";

/** Compact progress remains readable at narrow widths and in RTL scripts. */
export function AuthProgress({ step }: { step: "phone" | "code" }) {
  const t = useTranslations("auth");
  return (
    <ol className="flex items-center gap-3 border-b border-border pb-5 text-sm">
      <li
        aria-current={step === "phone" ? "step" : undefined}
        className="flex min-w-0 items-center gap-2 font-medium"
      >
        {step === "code" ? (
          <CheckIcon aria-hidden className="size-4 shrink-0 text-primary" />
        ) : (
          <span
            aria-hidden
            className="size-2 shrink-0 rounded-full bg-primary"
          />
        )}
        {t("mobileLabel")}
      </li>
      <li aria-hidden className="h-px min-w-4 flex-1 bg-border" />
      <li
        aria-current={step === "code" ? "step" : undefined}
        className={cn(
          "min-w-0",
          step === "code" ? "font-medium" : "text-muted-foreground",
        )}
      >
        {t("codeLabel")}
      </li>
    </ol>
  );
}
