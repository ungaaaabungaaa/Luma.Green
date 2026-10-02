"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "convex/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";

import { isConvexConfigured } from "@/components/providers/convex-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";

import { api } from "../../../convex/_generated/api";
import { AdminUnavailable } from "./admin-unavailable";
import { CODE_LENGTH, CodeInput } from "./code-input";
import { codeErrorMessage, signInErrorMessage } from "./errors";
import { PasswordInput } from "./password-input";
import { adminSignInSchema, type AdminSignInValues } from "./schemas";

/** `/admin/login`: email and password, then the authenticator code. */
export function AdminLogin() {
  return isConvexConfigured ? <LoginSteps /> : <AdminUnavailable />;
}

function LoginSteps() {
  const router = useRouter();
  const me = useQuery(api.identity.me);
  const options = useQuery(api.identity.signInOptions);
  const [step, setStep] = useState<"password" | "code">("password");
  const [notice, setNotice] = useState<string | null>(null);

  // Already signed in? Straight to the console.
  useEffect(() => {
    if (me?.kind === "admin" && me.twoFactorEnabled) router.replace("/admin");
  }, [me, router]);

  return step === "password" ? (
    <div className="flex flex-col gap-6">
      {notice ? (
        <p role="status" className="text-sm text-destructive">
          {notice}
        </p>
      ) : null}
      <PasswordStep
        onTwoFactor={() => {
          setNotice(null);
          setStep("code");
        }}
        onNoAuthenticator={() => {
          router.replace("/admin/setup");
        }}
      />
      {options?.adminSetup ? (
        <p className="text-sm text-muted-foreground">
          First time here?{" "}
          <Link
            href="/admin/setup"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Set up the admin account
          </Link>
        </p>
      ) : null}
    </div>
  ) : (
    <CodeStep
      onDone={() => {
        router.replace("/admin");
      }}
      onRestart={(message) => {
        setNotice(message ?? null);
        setStep("password");
      }}
    />
  );
}

function PasswordStep({
  onTwoFactor,
  onNoAuthenticator,
}: {
  onTwoFactor: () => void;
  onNoAuthenticator: () => void;
}) {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<AdminSignInValues>({
    resolver: zodResolver(adminSignInSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: AdminSignInValues) {
    try {
      const { data, error } = await authClient.signIn.email(values);
      if (error) {
        setError("root", { message: signInErrorMessage(error) });
        return;
      }
      if ("twoFactorRedirect" in data && data.twoFactorRedirect) onTwoFactor();
      else onNoAuthenticator();
    } catch {
      setError("root", { message: signInErrorMessage({}) });
    }
  }

  return (
    <form
      noValidate
      className="flex flex-col gap-5"
      onSubmit={(event) => {
        void handleSubmit(onSubmit)(event);
      }}
    >
      <div className="flex flex-col gap-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          autoComplete="username"
          aria-invalid={errors.email ? true : undefined}
          {...register("email")}
        />
        {errors.email ? (
          <p role="alert" className="text-sm text-destructive">
            {errors.email.message}
          </p>
        ) : null}
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="password">Password</Label>
        <PasswordInput
          id="password"
          autoComplete="current-password"
          aria-invalid={errors.password ? true : undefined}
          {...register("password")}
        />
        {errors.password ? (
          <p role="alert" className="text-sm text-destructive">
            {errors.password.message}
          </p>
        ) : null}
      </div>
      {errors.root ? (
        <p role="alert" className="text-sm text-destructive">
          {errors.root.message}
        </p>
      ) : null}
      <Button type="submit" size="lg" disabled={isSubmitting}>
        {isSubmitting ? "Checking…" : "Continue"}
      </Button>
      <Link
        href="/admin/forgot-password"
        className="inline-flex min-h-11 items-center self-start text-sm font-medium text-primary underline underline-offset-4"
      >
        Forgot password?
      </Link>
    </form>
  );
}

function CodeStep({
  onDone,
  onRestart,
}: {
  onDone: () => void;
  onRestart: (message?: string) => void;
}) {
  const [mode, setMode] = useState<"totp" | "backup">("totp");
  const [code, setCode] = useState("");
  const [backupCode, setBackupCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checking = useRef(false);

  async function check(value: string) {
    if (checking.current) return;
    checking.current = true;
    setBusy(true);
    setError(null);
    try {
      const { error: authError } =
        mode === "totp"
          ? await authClient.twoFactor.verifyTotp({ code: value })
          : await authClient.twoFactor.verifyBackupCode({ code: value });
      if (!authError) {
        onDone();
        return;
      }
      const { message, restart } = codeErrorMessage(authError);
      if (restart) {
        onRestart(message);
        return;
      }
      setCode("");
      setError(message);
    } catch {
      setCode("");
      setError(codeErrorMessage({}).message);
    } finally {
      checking.current = false;
      setBusy(false);
    }
  }

  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(event) => {
        event.preventDefault();
        void check(mode === "totp" ? code : backupCode.trim());
      }}
    >
      {mode === "totp" ? (
        <div className="flex flex-col gap-3">
          <Label htmlFor="totp">Code from your authenticator app</Label>
          <CodeInput
            id="totp"
            value={code}
            onChange={setCode}
            onComplete={(value) => {
              void check(value);
            }}
            disabled={busy}
            invalid={Boolean(error)}
            describedBy={error ? "code-error" : undefined}
          />
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <Label htmlFor="backup">Backup code</Label>
          <Input
            id="backup"
            disabled={busy}
            autoComplete="one-time-code"
            spellCheck={false}
            className="font-mono"
            value={backupCode}
            onChange={(event) => {
              setBackupCode(event.target.value);
            }}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? "code-error" : undefined}
          />
          <p className="text-sm text-muted-foreground">
            Each backup code works once.
          </p>
        </div>
      )}
      {error ? (
        <p id="code-error" role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      <Button
        type="submit"
        size="lg"
        disabled={
          busy ||
          (mode === "totp"
            ? code.length !== CODE_LENGTH
            : backupCode.trim() === "")
        }
      >
        {busy ? "Checking…" : "Sign in"}
      </Button>
      <div className="flex flex-wrap justify-between gap-2 border-t pt-4">
        <Button
          type="button"
          variant="link"
          className="px-0"
          disabled={busy}
          onClick={() => {
            setMode(mode === "totp" ? "backup" : "totp");
            setError(null);
          }}
        >
          {mode === "totp" ? "Use a backup code" : "Use the authenticator app"}
        </Button>
        <Button
          type="button"
          variant="link"
          className="px-0"
          disabled={busy}
          onClick={() => {
            onRestart();
          }}
        >
          Start again
        </Button>
      </div>
    </form>
  );
}
