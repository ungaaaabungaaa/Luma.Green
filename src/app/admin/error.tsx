"use client";

import { RotateCwIcon } from "lucide-react";

import { AdminAuthShell } from "@/components/admin/auth-shell";
import { Button } from "@/components/ui/button";
import { reloadCurrentPage } from "@/lib/reload-current-page";

/** Includes console-layout auth transport failures; never exposes its children. */
export default function AdminError() {
  return (
    <AdminAuthShell title="This page didn't load">
      <div className="flex flex-col items-start gap-4">
        <p className="text-sm text-muted-foreground">
          The page is unavailable. Wait a moment and try again.
        </p>
        <Button size="lg" onClick={reloadCurrentPage}>
          <RotateCwIcon aria-hidden />
          Try again
        </Button>
      </div>
    </AdminAuthShell>
  );
}
