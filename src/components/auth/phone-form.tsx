"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { HomeIcon, LockIcon } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link, useRouter } from "@/i18n/navigation";
import { requestPhoneCode } from "@/lib/phone-auth";

import { normalizeIndianMobile } from "../../../convex/lib/phone";
import { rememberPhone } from "./storage";

const schema = z.object({
  phone: z
    .string()
    .refine((value) => normalizeIndianMobile(value) !== null, "mobileInvalid"),
});

type Values = z.infer<typeof schema>;

/** Step one of signing in: a mobile number, then an SMS code is sent. */
export function PhoneForm() {
  const t = useTranslations("auth");
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { phone: "" },
  });

  async function onSubmit(values: Values) {
    const phone = normalizeIndianMobile(values.phone);
    if (!phone) return;
    const error = await requestPhoneCode(phone);
    if (error) {
      setError("root", { message: error });
      return;
    }
    rememberPhone(phone);
    const next = searchParams.get("next");
    router.push({
      pathname: "/login/verify",
      query: next ? { next } : undefined,
    });
  }

  const fieldError = errors.phone?.message ?? errors.root?.message;

  return (
    <div className="flex flex-col gap-7">
      <div className="flex flex-col gap-3">
        <h1 className="font-display text-3xl leading-tight font-semibold tracking-tight sm:text-4xl">
          {t("title")}
        </h1>
        <p className="leading-relaxed text-muted-foreground">{t("lead")}</p>
      </div>

      <form
        noValidate
        onSubmit={(event) => {
          void handleSubmit(onSubmit)(event);
        }}
        className="flex flex-col gap-4"
      >
        <div className="flex flex-col gap-2">
          <Label htmlFor="phone" className="text-base">
            {t("mobileLabel")}
          </Label>
          <div className="flex gap-2" dir="ltr">
            <span className="flex h-14 items-center rounded-xl border bg-muted px-4 text-lg font-medium tabular-nums">
              +91
            </span>
            <Input
              id="phone"
              type="tel"
              inputMode="numeric"
              autoComplete="tel-national"
              placeholder="98765 43210"
              aria-invalid={fieldError ? true : undefined}
              aria-describedby="phone-hint"
              className="h-14 rounded-xl text-lg tracking-wide"
              {...register("phone")}
            />
          </div>
          <p
            id="phone-hint"
            role={fieldError ? "alert" : undefined}
            className={
              fieldError
                ? "text-sm text-destructive"
                : "text-sm text-muted-foreground"
            }
          >
            {t(
              fieldError &&
                ["mobileInvalid", "sendFailed", "sendRateLimited"].includes(
                  fieldError,
                )
                ? fieldError
                : "mobileHint",
            )}
          </p>
        </div>
        <Button
          type="submit"
          size="lg"
          className="h-14 text-base"
          disabled={isSubmitting}
        >
          {t(isSubmitting ? "sending" : "sendCode")}
        </Button>
      </form>

      <div className="flex flex-col gap-3 rounded-2xl border border-brand-100 bg-brand-50/60 p-5">
        <p className="flex items-start gap-2 font-medium">
          <HomeIcon aria-hidden className="mt-1 size-4 shrink-0 text-primary" />
          {t("homeTitle")}
        </p>
        <Link
          href="/how-it-works"
          className="inline-flex min-h-11 items-center text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          {t("homeLink")}
        </Link>
      </div>

      <p className="flex gap-2 text-sm text-muted-foreground">
        <LockIcon aria-hidden className="mt-0.5 size-4 shrink-0 text-primary" />
        {t("privacy")}
      </p>
    </div>
  );
}
