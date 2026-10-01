"use client";

import { useMutation } from "convex/react";
import { CheckIcon, TruckIcon, XIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { actionErrorKey } from "./bookings";

/**
 * Accept or decline a new request. The two differ in fill and icon, not only
 * colour; declining can't be undone, so it asks once more.
 */
export function AcceptDecline({ bookingId }: { bookingId: Id<"bookings"> }) {
  const t = useTranslations("shop");
  const respond = useMutation(api.shop.respond);
  const [pending, setPending] = useState<"accept" | "decline" | null>(null);
  const [isAsking, setIsAsking] = useState(false);

  async function answer(isAccepting: boolean) {
    setPending(isAccepting ? "accept" : "decline");
    try {
      await respond({ bookingId, accept: isAccepting });
      toast.success(t(isAccepting ? "requests.accepted" : "requests.declined"));
    } catch (error) {
      toast.error(t(`errors.${actionErrorKey(error)}`));
    } finally {
      setPending(null);
      setIsAsking(false);
    }
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      <Button
        type="button"
        variant="outline"
        size="lg"
        className="h-12 text-base"
        disabled={pending !== null}
        onClick={() => {
          setIsAsking(true);
        }}
      >
        <XIcon aria-hidden className="size-5" />
        {t("requests.decline")}
      </Button>
      <Button
        type="button"
        size="lg"
        className="h-12 text-base"
        disabled={pending !== null}
        onClick={() => void answer(true)}
      >
        <CheckIcon aria-hidden className="size-5" />
        {t("requests.accept")}
      </Button>

      <Dialog open={isAsking} onOpenChange={setIsAsking}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle className="text-lg">
              {t("requests.confirmDecline.title")}
            </DialogTitle>
            <DialogDescription className="text-base">
              {t("requests.confirmDecline.body")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" size="lg" className="h-12 text-base">
                {t("requests.confirmDecline.cancel")}
              </Button>
            </DialogClose>
            <Button
              variant="destructive"
              size="lg"
              className="h-12 text-base"
              disabled={pending !== null}
              onClick={() => void answer(false)}
            >
              <XIcon aria-hidden className="size-5" />
              {t("requests.confirmDecline.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** "I'm on the way": the household's tracking page shows it at once. */
export function StartTripButton({
  bookingId,
  className,
}: {
  bookingId: Id<"bookings">;
  className?: string;
}) {
  const t = useTranslations("shop");
  const startTrip = useMutation(api.shop.startTrip);
  const [isBusy, setIsBusy] = useState(false);

  async function start() {
    setIsBusy(true);
    try {
      await startTrip({ bookingId });
      toast.success(t("requests.onTheWay"));
    } catch (error) {
      toast.error(t(`errors.${actionErrorKey(error)}`));
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="lg"
      className={className ?? "h-12 text-base"}
      disabled={isBusy}
      onClick={() => void start()}
    >
      <TruckIcon aria-hidden className="size-5" />
      {t("requests.startTrip")}
    </Button>
  );
}
