import { Suspense } from "react";

import { AdminAuthShell } from "@/components/admin/auth-shell";
import { PasswordRecovery } from "@/components/admin/password-recovery";

export const metadata = {
  title: "Choose a new admin password",
  robots: { index: false, follow: false },
  referrer: "no-referrer" as const,
};

export default function ResetPasswordPage() {
  return (
    <AdminAuthShell
      title="Choose a new password"
      description="Use a unique password. Your authenticator stays on."
    >
      <Suspense>
        <PasswordRecovery reset />
      </Suspense>
    </AdminAuthShell>
  );
}
