"use client";

import { useMutation } from "convex/react";
import { HandshakeIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useId, useState } from "react";
import { toast } from "sonner";

import { useFormat } from "@/components/app/format";
import { Button } from "@/components/ui/button";
import { useCanOperate } from "@/components/workspace/permissions";

import { api } from "../../../convex/_generated/api";
import { type MarketErrorKey, marketErrorKey } from "./errors";
import type { TradeView } from "./types";

type DecisionAction = "accept" | "decline";

/**
 * Only an order decision is available before gateway checkout is connected.
 */
export function TradeActions({ trade }: { trade: TradeView }) {
  const canOperate = useCanOperate();
  const t = useTranslations("market");
  const format = useFormat();
  const act = useMutation(api.market.act);
  const questionId = useId();
  const [busy, setBusy] = useState<DecisionAction | null>(null);
  const [isConfirmingDecline, setIsConfirmingDecline] = useState(false);
  const [failure, setFailure] = useState<MarketErrorKey | null>(null);

  if (!canOperate || trade.status !== "requested") return null;
  const canAccept = trade.actions.includes("accept");
  const canDecline = trade.actions.includes("decline");
  if (!canAccept && !canDecline) return null;

  async function run(action: DecisionAction) {
    setBusy(action);
    setFailure(null);
    try {
      await act({ tradeId: trade.id, action });
      toast.success(t(`trades.done.${action}`));
    } catch (error) {
      const key = marketErrorKey(error);
      setFailure(key);
      toast.error(t(`errors.${key}`));
    } finally {
      setBusy(null);
      setIsConfirmingDecline(false);
    }
  }

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
          {canAccept ? (
            <Button
              size="lg"
              className="h-auto min-h-12 py-2 text-base whitespace-normal sm:flex-1"
              disabled={busy !== null}
              onClick={() => void run("accept")}
            >
              <HandshakeIcon aria-hidden />
              {busy === "accept"
                ? t("trades.busy")
                : t("trades.action.accept", {
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
