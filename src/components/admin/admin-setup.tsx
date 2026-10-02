"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type ComponentProps, useEffect, useRef, useState } from "react";
import {
  type FieldError,
  useForm,
  type UseFormRegisterReturn,
} from "react-hook-form";

import { isConvexConfigured } from "@/components/providers/convex-provider";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { authClient } from "@/lib/auth-client";

import { api } from "../../../convex/_generated/api";
import { AdminUnavailable } from "./admin-unavailable";
import { AuthenticatorStep } from "./authenticator-step";
import { BackupCodes } from "./backup-codes";
import { passwordErrorMessage, signUpErrorMessage } from "./errors";
import { PasswordInput } from "./password-input";
import {
  adminAccountSchema,
  type AdminAccountValues,
  adminProfileSchema,
  type AdminProfileValues,
} from "./schemas";
import { useAdminSignOut } from "./use-admin-sign-out";

interface Enrolment {
  totpURI: string;
  backupCodes: string[];
}

/**
 * `/admin/setup`, run once: create the admin account and identity record,
 * enrol an authenticator app, save the backup codes. Picks up where it left
 * off if the tab was closed half-way.
 */
export function AdminSetup() {
  return isConvexConfigured ? <SetupSteps /> : <AdminUnavailable />;
}

function SetupSteps() {
  const router = useRouter();
  const options = useQuery(api.identity.signInOptions);
  const me = useQuery(api.identity.me);
  const { isAuthenticated } = useConvexAuth();
  const saveAdminProfile = useMutation(api.identity.saveAdminProfile);

  // Account created, waiting for Convex to see the session before saving the
  // profile. The password stays in memory only long enough to enrol.
  const [pending, setPending] = useState<{
    profile: AdminProfileValues;
    password: string;
  } | null>(null);
  const [enrolment, setEnrolment] = useState<Enrolment | null>(null);
  const [showCodes, setShowCodes] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const isEnrolling = useRef(false);

  useEffect(() => {
    if (!pending || !isAuthenticated || isEnrolling.current) return;
    isEnrolling.current = true;
    const { profile, password } = pending;
    void (async () => {
      try {
        await saveAdminProfile(profile);
        const { data, error } = await authClient.twoFactor.enable({
          password,
        });
        if (error) setFailure(passwordErrorMessage(error));
        else setEnrolment(data);
      } catch {
        setFailure("Couldn't save your details.");
      } finally {
        setPending(null);
      }
    })();
  }, [pending, isAuthenticated, saveAdminProfile]);

  const isFinished =
    me?.kind === "admin" && me.twoFactorEnabled && !enrolment && !showCodes;
  useEffect(() => {
    if (isFinished) router.replace("/admin");
  }, [isFinished, router]);

  if (enrolment && showCodes) {
    return (
      <BackupCodes
        codes={enrolment.backupCodes}
        onDone={() => {
          router.replace("/admin");
        }}
      />
    );
  }
  if (enrolment) {
    return (
      <AuthenticatorStep
        totpURI={enrolment.totpURI}
        onVerified={() => {
          setShowCodes(true);
        }}
      />
    );
  }
  if (failure) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Setup stopped</AlertTitle>
        <AlertDescription>
          {failure} Reload the page to carry on from where you left off.
        </AlertDescription>
      </Alert>
    );
  }
  if (pending || options === undefined || me === undefined || isFinished) {
    return <SetupSkeleton />;
  }
  if (me?.kind === "member") return <SignedInAsMember />;
  if (me?.kind === "admin") {
    return me.adminName ? (
      <PasswordToEnrol onEnrol={setEnrolment} />
    ) : (
      <ProfileForm
        onSave={async (profile) => {
          await saveAdminProfile(profile);
        }}
      />
    );
  }
  return options.adminSetup ? (
    <AccountForm onCreated={setPending} />
  ) : (
    <SetupClosed />
  );
}

function AccountForm({
  onCreated,
}: {
  onCreated: (next: { profile: AdminProfileValues; password: string }) => void;
}) {
  const {
    register,
    handleSubmit,
    setError,
    resetField,
    formState: { errors, isSubmitting },
  } = useForm<AdminAccountValues>({
    resolver: zodResolver(adminAccountSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
      setupToken: "",
      phone: "",
      dateOfBirth: "",
      aadhaarLast4: "",
    },
  });

  async function onSubmit(values: AdminAccountValues) {
    try {
      const { error } = await authClient.signUp.email({
        email: values.email,
        password: values.password,
        name: values.name,
        fetchOptions: {
          headers: { "x-luma-admin-setup-token": values.setupToken },
        },
      });
      if (error) {
        setError("root", { message: signUpErrorMessage(error) });
        return;
      }
      resetField("setupToken");
      onCreated({
        profile: {
          name: values.name,
          phone: values.phone,
          dateOfBirth: values.dateOfBirth,
          aadhaarLast4: values.aadhaarLast4,
        },
        password: values.password,
      });
    } catch {
      setError("root", { message: signUpErrorMessage({}) });
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
      <ProfileFields
        fields={{
          name: register("name"),
          phone: register("phone"),
          dateOfBirth: register("dateOfBirth"),
          aadhaarLast4: register("aadhaarLast4"),
        }}
        errors={errors}
      />
      <Separator />
      <Field
        id="setupToken"
        label="Setup token"
        hint="Enter the setup token from the deployment owner."
        error={errors.setupToken}
        type="password"
        autoComplete="off"
        {...register("setupToken")}
      />
      <Field
        id="email"
        label="Email"
        hint="Must match ADMIN_EMAIL on this deployment."
        error={errors.email}
        type="email"
        autoComplete="username"
        {...register("email")}
      />
      <Field
        id="password"
        label="Password"
        hint="At least 12 characters. A password manager helps."
        error={errors.password}
        type="password"
        autoComplete="new-password"
        {...register("password")}
      />
      <Field
        id="confirmPassword"
        label="Password again"
        error={errors.confirmPassword}
        type="password"
        autoComplete="new-password"
        {...register("confirmPassword")}
      />
      {errors.root ? (
        <p role="alert" className="text-sm text-destructive">
          {errors.root.message}
        </p>
      ) : null}
      <Button type="submit" size="lg" disabled={isSubmitting}>
        {isSubmitting ? "Creating the account…" : "Create the admin account"}
      </Button>
    </form>
  );
}

function ProfileForm({
  onSave,
}: {
  onSave: (profile: AdminProfileValues) => Promise<void>;
}) {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<AdminProfileValues>({
    resolver: zodResolver(adminProfileSchema),
    defaultValues: { name: "", phone: "", dateOfBirth: "", aadhaarLast4: "" },
  });

  async function onSubmit(values: AdminProfileValues) {
    try {
      await onSave(values);
    } catch {
      setError("root", { message: "Couldn't save. Check the details." });
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
      <p className="text-sm text-muted-foreground">
        Your account exists. Add your details to carry on.
      </p>
      <ProfileFields
        fields={{
          name: register("name"),
          phone: register("phone"),
          dateOfBirth: register("dateOfBirth"),
          aadhaarLast4: register("aadhaarLast4"),
        }}
        errors={errors}
      />
      {errors.root ? (
        <p role="alert" className="text-sm text-destructive">
          {errors.root.message}
        </p>
      ) : null}
      <Button type="submit" size="lg" disabled={isSubmitting}>
        {isSubmitting ? "Saving…" : "Save and continue"}
      </Button>
    </form>
  );
}

type ProfileKey = keyof AdminProfileValues;

function ProfileFields({
  fields,
  errors,
}: {
  fields: Record<ProfileKey, UseFormRegisterReturn>;
  errors: Partial<Record<ProfileKey, FieldError>>;
}) {
  return (
    <>
      <Field
        id="name"
        label="Full name"
        error={errors.name}
        autoComplete="name"
        {...fields.name}
      />
      <Field
        id="phone"
        label="Mobile number"
        error={errors.phone}
        type="tel"
        inputMode="numeric"
        autoComplete="tel-national"
        placeholder="98765 43210"
        {...fields.phone}
      />
      <Field
        id="dateOfBirth"
        label="Date of birth"
        error={errors.dateOfBirth}
        type="date"
        autoComplete="bday"
        {...fields.dateOfBirth}
      />
      <Field
        id="aadhaarLast4"
        label="Last four digits of your Aadhaar"
        hint="Only these four. Luma.Green never stores a full Aadhaar number."
        error={errors.aadhaarLast4}
        inputMode="numeric"
        maxLength={4}
        autoComplete="off"
        className="w-24 font-mono tracking-widest"
        {...fields.aadhaarLast4}
      />
    </>
  );
}

function PasswordToEnrol({
  onEnrol,
}: {
  onEnrol: (enrolment: Enrolment) => void;
}) {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<{ password: string }>({ defaultValues: { password: "" } });

  async function onSubmit({ password }: { password: string }) {
    try {
      const { data, error } = await authClient.twoFactor.enable({ password });
      if (error) {
        setError("password", { message: passwordErrorMessage(error) });
        return;
      }
      onEnrol(data);
    } catch {
      setError("password", { message: passwordErrorMessage({}) });
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
      <p className="text-sm text-muted-foreground">
        One step left: connect an authenticator app. Enter your password to
        start.
      </p>
      <Field
        id="password"
        label="Password"
        error={errors.password}
        type="password"
        autoComplete="current-password"
        {...register("password", { required: "Enter your password." })}
      />
      <Button type="submit" size="lg" disabled={isSubmitting}>
        {isSubmitting ? "Checking…" : "Continue"}
      </Button>
    </form>
  );
}

function Field({
  id,
  label,
  hint,
  error,
  className,
  ...input
}: ComponentProps<typeof Input> & {
  id: string;
  label: string;
  hint?: string;
  error?: FieldError;
}) {
  let describedBy: string | undefined;
  if (error) describedBy = `${id}-error`;
  else if (hint) describedBy = `${id}-hint`;
  const Control = input.type === "password" ? PasswordInput : Input;
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Control
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={className}
        {...(id === "password" &&
        input.type === "password" &&
        input.autoComplete === "new-password"
          ? { showStrength: true }
          : {})}
        {...input}
      />
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-sm text-destructive">
          {error.message}
        </p>
      ) : null}
      {!error && hint ? (
        <p id={`${id}-hint`} className="text-sm text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

function SignedInAsMember() {
  const { signOut, busy, error } = useAdminSignOut();
  return (
    <div className="flex flex-col gap-5">
      <p className="text-sm text-muted-foreground">
        You&apos;re signed in with a phone number. Sign out to set up the admin
        account.
      </p>
      <Button
        variant="outline"
        disabled={busy}
        onClick={() => {
          void signOut();
        }}
      >
        Sign out
      </Button>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function SetupClosed() {
  return (
    <div className="flex flex-col gap-5">
      <p className="text-sm text-muted-foreground">
        Setup is closed: either the admin account already exists, or its email
        and setup token are not configured on this deployment.
      </p>
      <Button asChild variant="outline">
        <Link href="/admin/login">Go to sign-in</Link>
      </Button>
    </div>
  );
}

function SetupSkeleton() {
  return (
    <div className="flex flex-col gap-5" aria-busy="true">
      <Skeleton className="h-5 w-2/3" />
      <Skeleton className="h-9 w-full" />
      <Skeleton className="h-9 w-full" />
      <Skeleton className="h-10 w-full" />
    </div>
  );
}
