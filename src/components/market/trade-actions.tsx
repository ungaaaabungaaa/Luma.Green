"use client";

import { useMutation } from "convex/react";
import {
  CircleCheckIcon,
  HandshakeIcon,
  type LucideIcon,
  ShieldCheckIcon,
  TruckIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useId, useState } from "react";
import { toast } from "sonner";

import { useFormat } from "@/components/app/format";
import { Button } from "@/components/ui/button";

import { api } from "../../../convex/_generated/api";
import { type MarketErrorKey, marketErrorKey } from "./errors";
import type { TradeAction, TradeView } from "./types";

type ForwardAction = Exclude<TradeAction, "decline">;

const ICONS: Record<ForwardAction, LucideIcon> = {
  accept: HandshakeIcon,
  pay: ShieldCheckIcon,
  dispatch: TruckIcon,
  confirm: CircleCheckIcon,
};

/**
 * The step a trade is waiting for from me, as one big button — plus
 * "Decline" for a new order, which asks first because it can't be undone.
 */
export function TradeActions({ trade }: { trade: TradeView }) {
  const t = useTranslations("market");
  const format = useFormat();
  const act = useMutation(api.market.act);
  const questionId = useId();
  const [busy, setBusy] = useState<TradeAction | null>(null);
  const [isConfirmingDecline, setIsConfirmingDecline] = useState(false);
  const [failure, setFailure] = useState<MarketErrorKey | null>(null);

  const forward = trade.actions.find(
    (action): action is ForwardAction => action !== "decline",
  );
  const canDecline = trade.actions.includes("decline");
  if (!forward && !canDecline) return null;

  async function run(action: TradeAction) {
    setBusy(action);
    setFailure(null);
    try {
      const result = await act({ tradeId: trade.id, action });
      toast.success(
        t(`trades.done.${action}`, { number: result.invoiceNo ?? "" }),
      );
    } catch (error) {
      const key = marketErrorKey(error);
      setFailure(key);
      toast.error(t(`errors.${key}`));
    } finally {
      setBusy(null);
      setIsConfirmingDecline(false);
    }
  }

  const ForwardIcon = forward ? ICONS[forward] : null;

  return (
    <div className="flex flex-col gap-2">
      {isConfirmingDecline ? (
        <div
          role="alertdialog"
          aria-labelledby={questionId}
          className="flex flex-col gap-3 border-s-2 border-destructive ps-4"
        >
          <p id={questionId}>
            {t("trades.declineConfirm", { name: trade.counterparty.name })}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="destructive"
              size="lg"
              className="h-11"
              disabled={busy !== null}
              onClick={() => void run("decline")}
            >
              {t(busy === "decline" ? "trades.busy" : "trades.declineYes")}
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="h-11"
              disabled={busy !== null}
              onClick={() => {
                setIsConfirmingDecline(false);
              }}
            >
              {t("trades.declineNo")}
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2 sm:flex-row">
          {forward && ForwardIcon ? (
            <Button
              size="lg"
              className="h-auto min-h-12 py-2 text-base whitespace-normal sm:flex-1"
              disabled={busy !== null}
              onClick={() => void run(forward)}
            >
              <ForwardIcon aria-hidden />
              {busy === forward
                ? t("trades.busy")
                : t(`trades.action.${forward}`, {
                    amount: format.money(trade.totalPaise),
                  })}
            </Button>
          ) : null}
          {canDecline ? (
            <Button
              variant="outline"
              size="lg"
              className="h-12 text-base"
              disabled={busy !== null}
              onClick={() => {
                setIsConfirmingDecline(true);
              }}
            >
              {t("trades.action.decline")}
            </Button>
          ) : null}
        </div>
      )}
      {failure ? (
        <p role="alert" className="text-sm text-destructive">
          {t(`errors.${failure}`)}
        </p>
      ) : null}
    </div>
  );
}
