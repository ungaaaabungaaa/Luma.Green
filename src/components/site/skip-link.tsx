"use client";

import { useTranslations } from "next-intl";

/** The main region is focusable so keyboard users can bypass each shell. */
export function SkipLink() {
  const t = useTranslations("nav");
  return (
    <a
      href="#main"
      className="sr-only rounded-md bg-background px-4 py-3 font-medium shadow focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:z-50"
    >
      {t("skipToContent")}
    </a>
  );
}
