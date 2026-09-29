"use client";

import type { BusinessKind } from "../../../convex/lib/onboarding";
import { BusinessForm } from "./business-form";
import { DocumentsForm } from "./documents-form";
import { JoinGate } from "./join-gate";
import { KabadiwalaForm } from "./kabadiwala-form";
import { SaathiForm } from "./saathi-form";

// Client entry points for the (join) pages: the gate hands the form its
// application, which a server page can't pass as a function.

export function KabadiwalaJoin() {
  return (
    <JoinGate kind="kabadiwala">
      {({ application, loginPhone }) => (
        <KabadiwalaForm application={application} loginPhone={loginPhone} />
      )}
    </JoinGate>
  );
}

export function BusinessJoin({ kind }: { kind: BusinessKind }) {
  return (
    <JoinGate kind={kind}>
      {({ application, loginPhone }) => (
        <BusinessForm
          kind={kind}
          application={application}
          loginPhone={loginPhone}
        />
      )}
    </JoinGate>
  );
}

export function DocumentsJoin({ kind }: { kind: BusinessKind }) {
  return (
    <JoinGate kind={kind}>
      {({ application }) => (
        <DocumentsForm kind={kind} application={application} />
      )}
    </JoinGate>
  );
}

export function SaathiJoin() {
  return (
    <JoinGate kind="saathi">
      {({ application }) => <SaathiForm application={application} />}
    </JoinGate>
  );
}
