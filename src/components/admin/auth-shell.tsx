import type { ReactNode } from "react";

import { Logo } from "@/components/brand/logo";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

/** A centred card for signing in and setting up the admin account. */
export function AdminAuthShell({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <main
      id="main"
      className="flex min-h-dvh items-start justify-center px-4 py-10 sm:items-center"
    >
      <div className="flex w-full max-w-md flex-col gap-6">
        <div className="flex items-center justify-between">
          <Logo />
          <Badge variant="secondary">Admin</Badge>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">
              <h1>{title}</h1>
            </CardTitle>
            {description ? (
              <CardDescription>{description}</CardDescription>
            ) : null}
          </CardHeader>
          <CardContent>{children}</CardContent>
        </Card>
      </div>
    </main>
  );
}
