"use client";

import { LogOutIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { useRouter } from "@/i18n/navigation";
import { authClient } from "@/lib/auth-client";

export function SignOutButton() {
  const t = useTranslations("join.shell");
  const router = useRouter();
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => {
        void authClient.signOut().then(() => {
          router.replace("/login");
        });
      }}
    >
      <LogOutIcon aria-hidden />
      {t("signOut")}
    </Button>
  );
}
