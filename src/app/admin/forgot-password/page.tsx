import { Suspense } from "react";

import { AdminAuthShell } from "@/components/admin/auth-shell";
import { PasswordRecovery } from "@/components/admin/password-recovery";

export const metadata = {
  title: "Reset admin password",
  robots: { index: false, follow: false },
  referrer: "no-referrer" as const,
};

export default function ForgotPasswordPage() {
  return (
    <AdminAuthShell
      title="Reset your password"
      description="For the configured admin account. Phone sign-in users do not have a password."
    >
      <Suspense>
        <PasswordRecovery />
      </Suspense>
    </AdminAuthShell>
  );
}
