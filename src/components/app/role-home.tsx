"use client";

import { BusinessHome } from "@/components/market/business-home";
import { SaathiHome } from "@/components/saathi/saathi-home";
import { KabadiwalaHome } from "@/components/shop/kabadiwala-home";

import { useWorkspace } from "./use-workspace";

/** `/app`: each role's own home. The shell has already loaded the workspace. */
export function RoleHome() {
  const workspace = useWorkspace();
  if (workspace?.kind === "saathi") return <SaathiHome />;
  if (workspace?.kind !== "org") return null;
  return workspace.org.kind === "kabadiwala" ? (
    <KabadiwalaHome />
  ) : (
    <BusinessHome />
  );
}
