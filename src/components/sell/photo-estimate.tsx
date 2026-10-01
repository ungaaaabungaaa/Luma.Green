"use client";

import { useAction, useQuery } from "convex/react";
import { useFormatter, useTranslations } from "next-intl";
import { useRef, useState } from "react";

import { useFormat } from "@/components/app/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { api } from "../../../convex/_generated/api";
import { paiseFor } from "../../../convex/lib/chain";
import type { BasketItem } from "../../../convex/lib/households";
import type {
  PhotoEstimateReply,
  PhotoItem,
  PhotoResult,
} from "../../../convex/lib/photoEstimates";
import { photoDeviceId, preparePhoto } from "./photo-image";
import { ErrorBoundary } from "./states";
import type { Material, PriceMap } from "./types";

type Notice =
  Exclude<PhotoEstimateReply["status"], "ok"> | "retake" | "empty" | "applied";

interface PhotoEstimateProps {
  materials: readonly Material[];
  prices: PriceMap | undefined;
  onApply: (items: BasketItem[]) => void;
}

/** Optional integration failures must never remove the manual basket. */
export function PhotoEstimate(props: PhotoEstimateProps) {
  return (
    <ErrorBoundary fallback={() => null}>
      <AvailablePhotoEstimate {...props} />
    </ErrorBoundary>
  );
}

function AvailablePhotoEstimate(props: PhotoEstimateProps) {
  const isAvailable = useQuery(api.photoEstimates.available);
  return isAvailable === true ? <PhotoEstimateForm {...props} /> : null;
}

/** A photo is optional. Suggestions are never applied without an explicit review. */
function PhotoEstimateForm({ materials, prices, onApply }: PhotoEstimateProps) {
  const t = useTranslations("sell.photo");
  const estimate = useAction(api.photoEstimates.estimate);
  const [image, setImage] = useState<string>();
  const [result, setResult] = useState<PhotoResult>();
  const [notice, setNotice] = useState<Notice>();
  const [isBusy, setBusy] = useState(false);
  const sequence = useRef(0);
  const running = useRef(false);
  const input = useRef<HTMLInputElement>(null);

  function clear() {
    sequence.current += 1;
    running.current = false;
    setImage(undefined);
    setResult(undefined);
    setNotice(undefined);
    setBusy(false);
    if (input.current) input.current.value = "";
  }

  async function choose(file: File) {
    clear();
    const id = sequence.current;
    setBusy(true);
    try {
      const prepared = await preparePhoto(file);
      if (id === sequence.current) setImage(prepared);
    } catch {
      if (id === sequence.current) setNotice("invalid");
    } finally {
      if (id === sequence.current) setBusy(false);
    }
  }

  async function runEstimate() {
    if (!image || running.current) return;
    running.current = true;
    const id = ++sequence.current;
    setBusy(true);
    setNotice(undefined);
    try {
      const reply = await estimate({ image, deviceId: photoDeviceId() });
      if (id !== sequence.current) return;
      if (reply.status !== "ok") setNotice(reply.status);
      else if (reply.result.retake !== "none") setNotice("retake");
      else if (reply.result.items.length === 0) setNotice("empty");
      else setResult(reply.result);
    } catch {
      if (id === sequence.current) setNotice("failed");
    } finally {
      if (id === sequence.current) {
        running.current = false;
        setBusy(false);
        setImage(undefined);
        if (input.current) input.current.value = "";
      }
    }
  }

  return (
    <section
      aria-labelledby="photo-title"
      className="flex flex-col gap-3 rounded-2xl border bg-card p-4"
    >
      <h3 id="photo-title" className="font-semibold">
        {t("title")}
      </h3>
      <p className="text-sm">{t("lead")}</p>
      <p id="photo-privacy" className="text-sm text-muted-foreground">
        {t("privacy")}
      </p>
      <Label htmlFor="scrap-photo">
        {t(result || notice ? "replace" : "choose")}
      </Label>
      <Input
        ref={input}
        id="scrap-photo"
        type="file"
        accept="image/jpeg,image/png"
        aria-describedby="photo-privacy"
        disabled={isBusy}
        className="h-12"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void choose(file);
        }}
      />
      <div role="status" aria-live="polite" className="text-sm">
        {isBusy ? t("busy") : null}
        {image && !isBusy ? t("selected") : null}
        {notice ? t(notice) : null}
      </div>
      {result ? (
        <PhotoReview result={result} materials={materials} prices={prices} />
      ) : null}
      <div className="flex flex-wrap gap-2">
        {image ? (
          <Button
            className="min-h-11"
            disabled={isBusy}
            onClick={() => {
              void runEstimate();
            }}
          >
            {t("estimate")}
          </Button>
        ) : null}
        {result ? (
          <Button
            className="min-h-11"
            onClick={() => {
              const codes = new Set(materials.map((material) => material.code));
              onApply(
                result.items
                  .filter((item) => codes.has(item.materialCode))
                  .map((item) => ({
                    materialCode: item.materialCode,
                    // Match the basket input precision: midpoint rounded to 100 g.
                    kg: Math.round((item.gramsLow + item.gramsHigh) / 200) / 10,
                  })),
              );
              clear();
              setNotice("applied");
            }}
          >
            {t("apply")}
          </Button>
        ) : null}
        <Button
          variant="outline"
          className="min-h-11"
          onClick={() => {
            clear();
            document
              .querySelector<HTMLButtonElement>("#family-paper + ul button")
              ?.focus();
          }}
        >
          {t("manual")}
        </Button>
      </div>
    </section>
  );
}

function PhotoReview({
  result,
  materials,
  prices,
}: {
  result: PhotoResult;
  materials: readonly Material[];
  prices: PriceMap | undefined;
}) {
  const t = useTranslations("sell.photo");
  return (
    <div className="flex flex-col gap-2">
      <h4 className="font-medium">{t("review")}</h4>
      <p className="text-sm text-muted-foreground">{t("reviewNote")}</p>
      <ul className="divide-y">
        {result.items.map((item) => (
          <PhotoLine
            key={item.materialCode}
            item={item}
            material={materials.find(
              (material) => material.code === item.materialCode,
            )}
            paisePerKg={prices?.get(item.materialCode)}
          />
        ))}
      </ul>
    </div>
  );
}

function PhotoLine({
  item,
  material,
  paisePerKg,
}: {
  item: PhotoItem;
  material: Material | undefined;
  paisePerKg: number | undefined;
}) {
  const t = useTranslations("sell.photo");
  const format = useFormat();
  const numbers = useFormatter();
  if (!material) return null;
  return (
    <li className="flex flex-col gap-1 py-2 text-sm">
      <span className="font-medium">
        {format.material(material.names, material.code)}
      </span>
      <span>
        {t("range", {
          low: format.weight(item.gramsLow),
          high: format.weight(item.gramsHigh),
        })}
      </span>
      <span>
        {t("confidence", {
          confidence: numbers.number(item.confidence, {
            style: "percent",
            maximumFractionDigits: 0,
          }),
        })}
      </span>
      {paisePerKg === undefined ? null : (
        <span>
          {t("value", {
            low: format.money(paiseFor(item.gramsLow, paisePerKg)),
            high: format.money(paiseFor(item.gramsHigh, paisePerKg)),
          })}
        </span>
      )}
    </li>
  );
}
