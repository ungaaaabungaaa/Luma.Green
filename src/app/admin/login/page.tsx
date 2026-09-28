import type { Metadata } from "next";

import { AdminLogin } from "@/components/admin/admin-login";
import { AdminAuthShell } from "@/components/admin/auth-shell";

export const metadata: Metadata = { title: "Sign in" };

export default function AdminLoginPage() {
  return (
    <AdminAuthShell
      title="Admin sign-in"
      description="Your email and password, then the code from your authenticator app."
    >
      <AdminLogin />
    </AdminAuthShell>
  );
}
