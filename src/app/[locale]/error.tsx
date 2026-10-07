"use client";

import { RotateCwIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { reloadCurrentPage } from "@/lib/reload-current-page";

/** A failed auth check reveals no private route content and can be retried. */
export default function LocaleError() {
  const t = useTranslations("common");
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col items-start justify-center gap-6 px-4 py-16 sm:px-8">
      <h1 className="font-display text-2xl leading-tight font-semibold tracking-tight sm:text-3xl">
        {t("error")}
      </h1>
      <Button size="lg" onClick={reloadCurrentPage}>
        <RotateCwIcon aria-hidden />
        {t("retry")}
      </Button>
    </main>
  );
}
