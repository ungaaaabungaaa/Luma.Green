"use client";

import { MenuIcon, XIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";

import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { isLocale, localeDirection } from "@/i18n/locales";
import { Link } from "@/i18n/navigation";

import { SiteNav } from "./site-nav";

export function MobileNav({ className }: { className?: string }) {
  const t = useTranslations("nav");
  const auth = useTranslations("auth");
  const locale = useLocale();
  const [open, setOpen] = useState(false);

  // The sheet only knows physical sides; open it from the inline end.
  const side =
    isLocale(locale) && localeDirection(locale) === "rtl" ? "left" : "right";
  const close = () => {
    setOpen(false);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon-lg"
          className={className}
          aria-label={t("openMenu")}
        >
          <MenuIcon />
        </Button>
      </SheetTrigger>
      <SheetContent
        side={side}
        className="w-[min(24rem,100%)] gap-6 overflow-y-auto pb-[env(safe-area-inset-bottom)]"
        showCloseButton={false}
        aria-describedby={undefined}
      >
        <SheetHeader className="flex-row items-center justify-between">
          <SheetTitle className="sr-only">{t("label")}</SheetTitle>
          <Logo idPrefix="mobile-menu" />
          <SheetClose asChild>
            <Button variant="ghost" size="icon-lg" aria-label={t("closeMenu")}>
              <XIcon />
            </Button>
          </SheetClose>
        </SheetHeader>
        <SiteNav
          className="flex flex-col divide-y px-5 [&>a]:rounded-none [&>a]:px-0 [&>a]:py-4 [&>a]:text-lg"
          onNavigate={close}
        />
        <div className="mt-auto grid gap-3 border-t p-4">
          <Button
            asChild
            variant="outline"
            size="lg"
            className="h-12 w-full text-base"
          >
            <Link href="/login" onClick={close}>
              {auth("metaTitle")}
            </Link>
          </Button>
          <Button asChild size="lg" className="h-12 w-full text-base">
            <Link href="/sell" onClick={close}>
              {t("sellScrap")}
            </Link>
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
