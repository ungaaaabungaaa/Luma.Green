"use client";

import { LogOutIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { useSignOut } from "@/components/auth/use-sign-out";
import { Button } from "@/components/ui/button";
import { useRouter } from "@/i18n/navigation";

export function SignOutButton() {
  const t = useTranslations("join.shell");
  const router = useRouter();
  const common = useTranslations("common");
  const { signOut, isSigningOut } = useSignOut(common("error"), () => {
    router.replace("/login");
  });
  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={isSigningOut}
      onClick={() => {
        void signOut();
      }}
    >
      <LogOutIcon aria-hidden />
      {t("signOut")}
    </Button>
  );
}
