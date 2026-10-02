"use client";

import { CopyIcon, DownloadIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

/**
 * One-time backup codes, shown once. Each gets the admin in if the phone with
 * the authenticator app is lost.
 */
export function BackupCodes({
  codes,
  onDone,
}: {
  codes: readonly string[];
  onDone: () => void;
}) {
  const [saved, setSaved] = useState(false);
  const text = `Luma.Green admin backup codes — each works once.\n\n${codes.join("\n")}\n`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Backup codes copied.");
    } catch {
      toast.error("Couldn't copy. Select the codes and copy them.");
    }
  }

  function download() {
    const url = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "luma-green-admin-backup-codes.txt";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-col gap-5">
      <p className="text-sm text-muted-foreground">
        If you lose the phone with your authenticator app, one of these codes
        gets you in. Each works once. Keep them offline — printed, or in a
        password manager — and never in chat or email. You won&apos;t see them
        again.
      </p>
      <ul
        aria-label="Backup codes"
        className="grid grid-cols-1 gap-3 border-y py-4 font-mono text-sm min-[400px]:grid-cols-2"
      >
        {codes.map((code) => (
          <li key={code} className="break-all select-all">
            {code}
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            void copy();
          }}
        >
          <CopyIcon aria-hidden />
          Copy
        </Button>
        <Button type="button" variant="outline" onClick={download}>
          <DownloadIcon aria-hidden />
          Download
        </Button>
      </div>
      <div className="flex min-h-11 items-center gap-3">
        <Checkbox
          id="codes-saved"
          checked={saved}
          onCheckedChange={(checked) => {
            setSaved(checked === true);
          }}
        />
        <Label
          htmlFor="codes-saved"
          className="min-h-11 leading-snug font-normal"
        >
          I&apos;ve stored these codes somewhere safe.
        </Label>
      </div>
      <Button size="lg" disabled={!saved} onClick={onDone}>
        Go to the console
      </Button>
    </div>
  );
}
