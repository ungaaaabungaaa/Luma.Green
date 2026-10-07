"use client";

import { useQuery } from "convex/react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";

import { isConvexConfigured } from "@/components/providers/convex-provider";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { defaultLocale, isLocale, localeDirection } from "@/i18n/locales";

import { api } from "../../../convex/_generated/api";
import { EmailForm } from "./email-form";
import { LanguageChoice } from "./language-choice";
import { PhoneForm } from "./phone-form";
import { isLanguageChosen, useStoredValue } from "./storage";

/** `/login`: language first (once per browser), then phone or email sign-in. */
export function LoginFlow() {
  return isConvexConfigured ? (
    <ConfiguredLogin />
  ) : (
    <LoginSteps canSend={false} canSendEmail={false} />
  );
}

function ConfiguredLogin() {
  const options = useQuery(api.identity.signInOptions);
  return options === undefined ? (
    <LoginSkeleton />
  ) : (
    <LoginSteps canSend={options.phone} canSendEmail={options.email} />
  );
}

function LoginSteps({
  canSend,
  canSendEmail,
}: {
  canSend: boolean;
  canSendEmail: boolean;
}) {
  const t = useTranslations("emailAuth");
  const locale = useLocale();
  const storedChoice = useStoredValue(isLanguageChosen);
  const [choseJustNow, setChoseJustNow] = useState(false);

  if (storedChoice === undefined) {
    return <LoginSkeleton />;
  }
  if (!storedChoice && !choseJustNow) {
    return (
      <LanguageChoice
        onDone={() => {
          setChoseJustNow(true);
        }}
      />
    );
  }
  return (
    <Tabs
      defaultValue="phone"
      dir={localeDirection(isLocale(locale) ? locale : defaultLocale)}
      className="gap-6"
    >
      <TabsList variant="line" className="w-full">
        <TabsTrigger value="phone">{t("phone")}</TabsTrigger>
        <TabsTrigger value="email">{t("email")}</TabsTrigger>
      </TabsList>
      <TabsContent value="phone">
        <PhoneForm canSend={canSend} />
      </TabsContent>
      <TabsContent value="email">
        <EmailForm canSend={canSendEmail} />
      </TabsContent>
    </Tabs>
  );
}

export function LoginSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-busy="true">
      <Skeleton className="h-8 w-3/4" />
      <Skeleton className="h-5 w-full" />
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-12 w-full" />
    </div>
  );
}
