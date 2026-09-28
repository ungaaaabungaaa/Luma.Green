import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { AdminUnavailable } from "@/components/admin/admin-unavailable";
import { AdminAuthShell } from "@/components/admin/auth-shell";
import { ConsoleShell } from "@/components/admin/console-shell";
import { authServer } from "@/lib/auth-server";

/**
 * Signed-in admin pages. The session check here only saves a flash of the
 * console; the real gate is `requireAdmin` in every Convex function.
 */
export default async function ConsoleLayout({
  children,
}: {
  children: ReactNode;
}) {
  if (!authServer) {
    return (
      <AdminAuthShell title="Admin console">
        <AdminUnavailable />
      </AdminAuthShell>
    );
  }
  if (!(await authServer.isAuthenticated())) redirect("/admin/login");
  return <ConsoleShell>{children}</ConsoleShell>;
}
