"use client";

import { useConvexAuth, useMutation } from "convex/react";
import { LoaderCircleIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";

import { useSignOut } from "@/components/auth/use-sign-out";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { api } from "../../../convex/_generated/api";
import { sellErrorKey } from "../sell/errors";
import { PhoneSignIn } from "../sell/phone-sign-in";
import { useAuthReady } from "../sell/use-auth-ready";
import type { TrackedBooking } from "./types";

/**
 * "Cancel booking", free until the shop is on the way. Only the household
 * that booked can cancel: someone with just the link first confirms the
 * number it was booked with, by SMS code, right in the dialog.
 */
export function CancelBooking({ booking }: { booking: TrackedBooking }) {
  const t = useTranslations("track.cancel");
  const { isLoading, isAuthenticated } = useConvexAuth();
  const [isOpen, setOpen] = useState(false);

  if (isLoading || !booking.canCancel) return null;
  // Signed in as someone else: this isn't theirs to cancel.
  const isSomeoneElse = isAuthenticated && !booking.isMine;
  if (!isOpen && isSomeoneElse) return null;

  return (
    <div className="flex flex-col items-center gap-1 text-center">
      <Button
        variant="ghost"
        className="h-12 text-base text-destructive hover:text-destructive"
        onClick={() => {
          setOpen(true);
        }}
      >
        {t("button")}
      </Button>
      <p className="text-sm text-muted-foreground">{t("free")}</p>
      <Dialog open={isOpen} onOpenChange={setOpen}>
        <DialogContent closeLabel={t("close")} className="max-w-md">
          <CancelDialogBody
            booking={booking}
            onDone={() => {
              setOpen(false);
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CancelDialogBody({
  booking,
  onDone,
}: {
  booking: TrackedBooking;
  onDone: () => void;
}) {
  const t = useTranslations("track.cancel");
  const tErrors = useTranslations("sell.errors");
  const common = useTranslations("common");
  const { signOut, isSigningOut } = useSignOut(common("error"));
  const locale = useLocale();
  const { isAuthenticated } = useConvexAuth();
  const cancel = useMutation(api.households.cancel);
  const ensureProfile = useMutation(api.identity.ensureProfile);
  const waitForAuth = useAuthReady();
  const [status, setStatus] = useState<"idle" | "signingIn" | "cancelling">(
    "idle",
  );

  async function afterCode() {
    setStatus("signingIn");
    try {
      await waitForAuth();
      await ensureProfile({ locale });
    } catch {
      toast.error(tErrors("generic"));
    } finally {
      setStatus("idle");
    }
  }

  async function confirm() {
    setStatus("cancelling");
    try {
      await cancel({ token: booking.token });
      toast.success(t("done"));
      onDone();
    } catch (error) {
      toast.error(tErrors(sellErrorKey(error)));
      setStatus("idle");
    }
  }

  if (status === "signingIn") {
    return (
      <>
        <DialogTitle className="sr-only">{t("signInTitle")}</DialogTitle>
        <p role="status" className="flex items-center gap-2 py-6">
          <LoaderCircleIcon aria-hidden className="size-5 animate-spin" />
          {t("checking")}
        </p>
      </>
    );
  }

  if (booking.isMine) {
    return (
      <>
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("body")}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2">
          <Button variant="outline" className="h-11" onClick={onDone}>
            {t("keep")}
          </Button>
          <Button
            variant="destructive"
            className="h-11"
            disabled={status === "cancelling"}
            onClick={() => {
              void confirm();
            }}
          >
            {t(status === "cancelling" ? "cancelling" : "confirm")}
          </Button>
        </DialogFooter>
      </>
    );
  }

  if (isAuthenticated) {
    return (
      <>
        <DialogHeader>
          <DialogTitle>{t("signInTitle")}</DialogTitle>
          <DialogDescription>{t("notYours")}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            className="h-11"
            disabled={isSigningOut}
            onClick={() => {
              void signOut();
            }}
          >
            {t("otherNumber")}
          </Button>
          <Button className="h-11" onClick={onDone}>
            {t("close")}
          </Button>
        </DialogFooter>
      </>
    );
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>{t("signInTitle")}</DialogTitle>
        <DialogDescription>{t("signInBody")}</DialogDescription>
      </DialogHeader>
      <PhoneSignIn
        verifyLabel={t("confirmNumber")}
        onVerified={() => {
          void afterCode();
        }}
      />
    </>
  );
}
