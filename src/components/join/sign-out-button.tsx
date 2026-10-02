"use client";

import { LogOutIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { useSignOut } from "@/components/account/use-sign-out";
import { Button } from "@/components/ui/button";
import { useRouter } from "@/i18n/navigation";

export function SignOutButton() {
  const t = useTranslations("join.shell");
  const router = useRouter();
  const { signOut, busy } = useSignOut(() => {
    router.replace("/login");
  });
  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={busy}
      onClick={() => void signOut()}
    >
      <LogOutIcon aria-hidden />
      {t("signOut")}
    </Button>
  );
}
