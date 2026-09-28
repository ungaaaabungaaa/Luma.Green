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
        showCloseButton={false}
        aria-describedby={undefined}
      >
        <SheetHeader className="flex-row items-center justify-between">
          <SheetTitle className="sr-only">{t("label")}</SheetTitle>
          <Logo />
          <SheetClose asChild>
            <Button variant="ghost" size="icon-lg" aria-label={t("closeMenu")}>
              <XIcon />
            </Button>
          </SheetClose>
        </SheetHeader>
        <SiteNav className="flex flex-col px-2" onNavigate={close} />
        <div className="mt-auto p-4">
          <Button asChild size="lg" className="w-full">
            <Link href="/contact" onClick={close}>
              {t("getStarted")}
            </Link>
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
