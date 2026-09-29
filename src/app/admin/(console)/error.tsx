"use client";

import { TriangleAlertIcon } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";

import { convexErrorCode } from "@/components/admin/convex-error";
import { Button } from "@/components/ui/button";

const SESSION_CODES = new Set([
  "NOT_SIGNED_IN",
  "NOT_ADMIN",
  "TWO_FACTOR_REQUIRED",
]);

/** A console page that failed: sign in again, or try once more. */
export default function ConsoleError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const code = convexErrorCode(error);
  const isSessionOver = code !== undefined && SESSION_CODES.has(code);
  return (
    <div className="flex max-w-md flex-col items-start gap-4 py-10">
      <span className="flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <TriangleAlertIcon aria-hidden className="size-6" />
      </span>
      <h1 className="text-2xl font-semibold tracking-tight">
        {isSessionOver ? "Your session has ended" : "This page didn't load"}
      </h1>
      <p className="text-muted-foreground">
        {isSessionOver
          ? "Sign in again with your password and authenticator to carry on."
          : "Something went wrong on our side. Try again; if it keeps happening, reload the page."}
      </p>
      {isSessionOver ? (
        <Button asChild>
          <Link href="/admin/login">Sign in again</Link>
        </Button>
      ) : (
        <Button onClick={retry}>Try again</Button>
      )}
    </div>
  );
}
