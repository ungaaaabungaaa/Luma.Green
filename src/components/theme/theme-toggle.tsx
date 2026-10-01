"use client";

import { MonitorIcon, MoonIcon, SunIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

import { parseTheme } from "./theme";
import { useTheme } from "./theme-provider";

interface ThemeLabels {
  label: string;
  light: string;
  dark: string;
  system: string;
}

export function ThemeToggleControl({
  labels,
  className,
}: {
  labels: ThemeLabels;
  className?: string;
}) {
  const { preference, setPreference } = useTheme();
  const icons = { light: SunIcon, dark: MoonIcon, system: MonitorIcon };
  const Icon = icons[preference];
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn("rounded-full", className)}
          aria-label={labels.label}
        >
          <Icon aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-44">
        <DropdownMenuLabel>{labels.label}</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={preference}
          onValueChange={(value) => {
            setPreference(parseTheme(value));
          }}
        >
          <DropdownMenuRadioItem value="light">
            <SunIcon aria-hidden="true" />
            {labels.light}
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="dark">
            <MoonIcon aria-hidden="true" />
            {labels.dark}
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="system">
            <MonitorIcon aria-hidden="true" />
            {labels.system}
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function ThemeToggle({ className }: { className?: string }) {
  const t = useTranslations("theme");
  return (
    <ThemeToggleControl
      className={className}
      labels={{
        label: t("label"),
        light: t("light"),
        dark: t("dark"),
        system: t("system"),
      }}
    />
  );
}
