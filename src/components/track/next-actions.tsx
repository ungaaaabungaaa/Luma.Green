"use client";

import { RecycleIcon, StoreIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Link, useRouter } from "@/i18n/navigation";

import { EMPTY_DRAFT } from "../sell/draft";
import { saveSellDraft } from "../sell/use-draft";
import type { TrackedBooking } from "./types";

/**
 * What to do next. A declined booking can go straight to another shop with
 * the same scrap list; otherwise, sell more.
 */
export function NextActions({ booking }: { booking: TrackedBooking }) {
  const t = useTranslations("track");
  const router = useRouter();

  if (booking.status === "declined") {
    return (
      <Button
        size="lg"
        className="h-12 text-base"
        onClick={() => {
          saveSellDraft({
            ...EMPTY_DRAFT,
            mode: booking.mode,
            items: booking.items.map((item) => ({
              materialCode: item.material.code,
              kg: item.estKg,
            })),
          });
          router.push("/sell?step=shop");
        }}
      >
        <StoreIcon aria-hidden />
        {t("tryAnother")}
      </Button>
    );
  }

  const isDone =
    booking.status === "completed" || booking.status === "cancelled";
  return (
    <Button
      asChild
      size="lg"
      variant={isDone ? "default" : "outline"}
      className="h-12 text-base"
    >
      <Link href="/sell">
        <RecycleIcon aria-hidden />
        {t("sellMore")}
      </Link>
    </Button>
  );
}
