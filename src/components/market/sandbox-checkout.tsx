"use client";

import { useAction, useQuery } from "convex/react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";

import { EvidenceDialog } from "@/components/lots/form-parts";
import { useBusiness } from "@/components/shop/use-shop";
import { Button } from "@/components/ui/button";
import { useCanOperate } from "@/components/workspace/permissions";
import { Link } from "@/i18n/navigation";

import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

const SDK_URL = "https://sdk.cashfree.com/js/v3/cashfree.js";
interface CashfreeSdk {
  checkout: (options: {
    paymentSessionId: string;
    redirectTarget: HTMLElement;
    appearance: { width: string; height: string };
  }) => Promise<unknown>;
}
type Mode = "sandbox" | "live";
type CashfreeFactory = (options: {
  mode: "sandbox" | "production";
}) => CashfreeSdk;

/** Re-read mutable cancellation state after each asynchronous boundary. */
function isAborted(signal: AbortSignal) {
  return signal.aborted;
}

/** Cashfree's documented inline target keeps all checkout UI inside the current component. */
async function openInlineCheckout(
  sessionId: string,
  host: HTMLDivElement,
  signal: AbortSignal,
  mode: Mode,
): Promise<void> {
  if (isAborted(signal)) return;
  const script = document.createElement("script");
  script.src = SDK_URL;
  script.async = true;
  const cleanup = () => {
    script.remove();
    host.replaceChildren();
  };
  signal.addEventListener("abort", cleanup, { once: true });
  try {
    await new Promise<void>((resolve, reject) => {
      const abort = () => {
        release();
        reject(new Error("Checkout closed"));
      };
      const release = () => {
        window.clearTimeout(timeout);
        signal.removeEventListener("abort", abort);
        script.removeEventListener("load", loaded);
        script.removeEventListener("error", failed);
      };
      const loaded = () => {
        release();
        resolve();
      };
      const failed = () => {
        release();
        reject(new Error("Checkout unavailable"));
      };
      // Bound SDK loading only. The actual payment interaction has no UI timer.
      const timeout = window.setTimeout(failed, 15_000);
      script.addEventListener("load", loaded);
      script.addEventListener("error", failed);
      signal.addEventListener("abort", abort, { once: true });
      document.head.append(script);
    });
    if (isAborted(signal) || !host.isConnected) return;
    const factory: unknown = Reflect.get(window, "Cashfree");
    if (typeof factory !== "function") throw new Error("Checkout unavailable");
    // SDK result remains unknown and is never a payment-status input.
    const sdk = (factory as CashfreeFactory)({
      mode: mode === "live" ? "production" : "sandbox",
    });
    const result = await sdk.checkout({
      paymentSessionId: sessionId,
      redirectTarget: host,
      appearance: { width: "100%", height: "650px" },
    });
    if (
      result &&
      typeof result === "object" &&
      "error" in result &&
      result.error
    )
      throw new Error("Checkout unavailable");
  } finally {
    signal.removeEventListener("abort", cleanup);
    cleanup();
  }
}

export function SandboxCheckout({ tradeId }: { tradeId: Id<"trades"> }) {
  const business = useBusiness();
  return business ? (
    <CheckoutChoices key={`${business.id}:${tradeId}`} tradeId={tradeId} />
  ) : null;
}

function CheckoutChoices({ tradeId }: { tradeId: Id<"trades"> }) {
  const availability = useQuery(api.cashfreePayments.availability, { tradeId });
  const canOperate = useCanOperate();
  return (
    <div className="flex flex-wrap gap-2">
      <CheckoutEntry tradeId={tradeId} mode="sandbox" />
      {canOperate && availability?.liveCanCheckout ? (
        <CheckoutEntry tradeId={tradeId} mode="live" />
      ) : null}
    </div>
  );
}

function CheckoutEntry({
  tradeId,
  mode,
}: {
  tradeId: Id<"trades">;
  mode: Mode;
}) {
  const t = useTranslations("sandboxPayment");
  const [open, setOpen] = useState(false);
  return (
    <EvidenceDialog
      title={t(mode === "live" ? "liveTitle" : "title")}
      hint={t(mode === "live" ? "liveNote" : "note")}
      open={open}
      onOpen={() => {
        setOpen(true);
      }}
      onClose={() => {
        setOpen(false);
      }}
    >
      {open ? <CheckoutContent tradeId={tradeId} mode={mode} /> : null}
    </EvidenceDialog>
  );
}

function CheckoutContent({
  tradeId,
  mode,
}: {
  tradeId: Id<"trades">;
  mode: Mode;
}) {
  const t = useTranslations("sandboxPayment");
  const common = useTranslations("common");
  const security = useTranslations("accountSecurity");
  const canOperate = useCanOperate();
  const availability = useQuery(api.cashfreePayments.availability, { tradeId });
  const status = useQuery(api.cashfreePayments.status, { tradeId });
  const order = status?.find((item) => item.mode === mode);
  let message:
    "pending" | "collected" | "liveCollected" | "review" | "unavailable" =
    "pending";
  if (order?.collection === "sandbox_confirmed") message = "collected";
  else if (order?.collection === "live_confirmed") message = "liveCollected";
  else if (
    order?.collection === "reconciliation_required" ||
    order?.checkout === "uncertain"
  )
    message = "review";
  else if (order?.checkout === "closed") message = "unavailable";
  const canCheckout =
    canOperate &&
    (mode === "live"
      ? availability?.liveCanCheckout
      : availability?.canCheckout);
  return (
    <div className="flex flex-col gap-4">
      {availability === undefined || status === undefined ? (
        <p>{common("loading")}</p>
      ) : (
        <>
          {order ? <p role="status">{t(message)}</p> : null}
          {canCheckout ? (
            <CheckoutLaunch key={mode} tradeId={tradeId} mode={mode} />
          ) : (
            <p>{t("unavailable")}</p>
          )}
          <Link
            className="inline-flex min-h-11 items-center underline underline-offset-4"
            href="/account/security"
          >
            {security("title")}
          </Link>
        </>
      )}
    </div>
  );
}

/** This child unmounts on permission/config loss, dialog close or identity/workspace change. */
function CheckoutLaunch({
  tradeId,
  mode,
}: {
  tradeId: Id<"trades">;
  mode: Mode;
}) {
  const t = useTranslations("sandboxPayment");
  const common = useTranslations("common");
  const checkout = useAction(api.cashfreeActions.checkout);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const host = useRef<HTMLDivElement | null>(null);
  const pending = useRef(false);
  const scope = useRef<AbortController | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    scope.current = controller;
    return () => {
      controller.abort();
    };
  }, []);
  async function start() {
    const signal = scope.current?.signal;
    if (!signal || isAborted(signal) || pending.current) return;
    pending.current = true;
    setBusy(true);
    setFailed(false);
    try {
      const result = await checkout(
        mode === "live" ? { tradeId, mode } : { tradeId },
      );
      if (isAborted(signal)) return;
      if (
        result.status.mode !== mode ||
        result.status.checkout !== "ready" ||
        result.status.collection !== "pending" ||
        !result.paymentSessionId ||
        !host.current
      ) {
        setFailed(true);
        return;
      }
      await openInlineCheckout(
        result.paymentSessionId,
        host.current,
        signal,
        mode,
      );
    } catch {
      if (!isAborted(signal)) setFailed(true);
    } finally {
      if (!isAborted(signal)) {
        pending.current = false;
        setBusy(false);
      }
    }
  }
  const launchLabel = t(mode === "live" ? "liveOpen" : "open");
  return (
    <div className="flex min-w-0 flex-col gap-4">
      <Button
        className="self-start"
        disabled={busy}
        onClick={() => void start()}
      >
        {busy ? common("loading") : launchLabel}
      </Button>
      <div ref={host} className="min-w-0" />
      {failed ? (
        <p role="alert" className="text-sm text-destructive">
          {t("failed")}
        </p>
      ) : null}
    </div>
  );
}
