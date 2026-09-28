"use client";

import { useQuery } from "convex/react";
import { useState } from "react";

import { isConvexConfigured } from "@/components/providers/convex-provider";
import { Skeleton } from "@/components/ui/skeleton";

import { api } from "../../../convex/_generated/api";
import { LanguageChoice } from "./language-choice";
import { PhoneForm } from "./phone-form";
import { SignInUnavailable } from "./sign-in-unavailable";
import { isLanguageChosen, useStoredValue } from "./storage";

/** `/login`: language first (once per browser), then the phone number. */
export function LoginFlow() {
  return isConvexConfigured ? <ConfiguredLogin /> : <SignInUnavailable />;
}

function ConfiguredLogin() {
  const options = useQuery(api.identity.signInOptions);
  const storedChoice = useStoredValue(isLanguageChosen);
  const [choseJustNow, setChoseJustNow] = useState(false);

  if (options === undefined || storedChoice === undefined) {
    return <LoginSkeleton />;
  }
  if (!options.phone) return <SignInUnavailable />;
  if (!storedChoice && !choseJustNow) {
    return (
      <LanguageChoice
        onDone={() => {
          setChoseJustNow(true);
        }}
      />
    );
  }
  return <PhoneForm />;
}

export function LoginSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-busy="true">
      <Skeleton className="h-8 w-3/4" />
      <Skeleton className="h-5 w-full" />
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-12 w-full" />
    </div>
  );
}
