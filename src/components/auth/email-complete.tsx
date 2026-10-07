"use client";

import { useMutation } from "convex/react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";

import { isConvexConfigured } from "@/components/providers/convex-provider";
import { useVerifiedSession } from "@/components/providers/use-signed-in-query";
import { Button } from "@/components/ui/button";
import { Link, useRouter } from "@/i18n/navigation";
import { reloadCurrentPage } from "@/lib/reload-current-page";
import { safeNextPath } from "@/lib/safe-next";

import { api } from "../../../convex/_generated/api";

export function EmailComplete() {
  return isConvexConfigured ? <FinishSession /> : <Restart />;
}
function Restart() {
  const t = useTranslations("emailAuth");
  return <Link href="/login">{t("signin")}</Link>;
}
function FinishSession() {
  const { isReady: isAuthenticated } = useVerifiedSession();
  const ensureProfile = useMutation(api.identity.ensureProfile);
  const locale = useLocale();
  const router = useRouter();
  const params = useSearchParams();
  const t = useTranslations("common");
  const [failed, setFailed] = useState(false);
  const pending = useRef(false);
  const next = safeNextPath(params.get("next"), "/app");
  useEffect(() => {
    if (isAuthenticated) return;
    const timer = setTimeout(() => {
      setFailed(true);
    }, 20_000);
    return () => {
      clearTimeout(timer);
    };
  }, [isAuthenticated]);
  useEffect(() => {
    if (!isAuthenticated || pending.current) return;
    pending.current = true;
    void ensureProfile({ locale })
      .then(() => {
        router.replace(next);
      })
      .catch(() => {
        pending.current = false;
        setFailed(true);
      });
  }, [isAuthenticated, ensureProfile, locale, next, router]);
  return (
    <div className="flex flex-col gap-4">
      <p role={failed ? "alert" : "status"}>
        {t(failed ? "error" : "loading")}
      </p>
      {failed ? (
        <>
          <Button onClick={reloadCurrentPage}>{t("retry")}</Button>
          <Restart />
        </>
      ) : null}
    </div>
  );
}
