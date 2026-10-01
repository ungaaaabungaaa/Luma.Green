"use client";

import { CheckIcon } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import { isLocale, type Locale, localeMeta, locales } from "@/i18n/locales";
import { usePathname, useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

import { markLanguageChosen } from "./storage";

/** Kannada, Hindi and English lead for the Bengaluru pilot; then the rest. */
const PILOT_ORDER: ReadonlySet<Locale> = new Set(["kn", "hi", "en"]);
const ordered: readonly Locale[] = [
  ...PILOT_ORDER,
  ...locales.filter((code) => !PILOT_ORDER.has(code)),
];

/**
 * The first screen for anyone signing in: every language in its own script,
 * big enough to tap. Picking one reloads the page in that language.
 */
export function LanguageChoice({ onDone }: { onDone: () => void }) {
  const t = useTranslations("auth");
  const current = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  function choose(code: Locale) {
    markLanguageChosen();
    if (code === current) {
      onDone();
      return;
    }
    const query = Object.fromEntries(searchParams.entries());
    startTransition(() => {
      router.replace({ pathname, query }, { locale: code });
    });
  }

  return (
    <section aria-labelledby="choose-language" className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h1
          id="choose-language"
          className="font-display text-3xl leading-tight font-semibold tracking-tight"
        >
          {t("chooseLanguage")}
        </h1>
        <p className="text-muted-foreground">{t("chooseLanguageHint")}</p>
      </div>
      <ul className="grid grid-cols-2 gap-2">
        {ordered.map((code) => {
          const isSelected = code === current;
          return (
            <li key={code}>
              <button
                type="button"
                onClick={() => {
                  choose(code);
                }}
                disabled={isPending}
                aria-pressed={isSelected}
                lang={localeMeta[code].hreflang}
                dir={localeMeta[code].dir}
                className={cn(
                  "flex min-h-16 w-full items-center justify-between gap-2 rounded-lg border bg-card px-4 text-start transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-60",
                  isSelected ? "border-primary bg-accent" : "border-border",
                )}
              >
                <span className="flex flex-col">
                  <span className="text-lg font-semibold">
                    {localeMeta[code].label}
                  </span>
                  <span className="text-xs text-muted-foreground" lang="en">
                    {localeMeta[code].english}
                  </span>
                </span>
                {isSelected ? (
                  <CheckIcon aria-hidden className="size-5 text-primary" />
                ) : null}
              </button>
            </li>
          );
        })}
      </ul>
      <Button
        size="lg"
        className="h-12 text-base"
        onClick={() => {
          if (isLocale(current)) choose(current);
        }}
      >
        {t("continue")}
      </Button>
    </section>
  );
}
