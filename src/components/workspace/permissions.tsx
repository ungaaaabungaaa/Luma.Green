"use client";

import { createContext, type ReactNode, useContext } from "react";

import type { WorkspaceRole } from "../../../convex/lib/workspaceRoles";

const PermissionContext = createContext<WorkspaceRole | null>(null);
export function WorkspacePermissions({
  membershipRole,
  children,
}: {
  membershipRole: WorkspaceRole | null;
  children: ReactNode;
}) {
  return (
    <PermissionContext value={membershipRole}>{children}</PermissionContext>
  );
}
/** Controls default to read-only until the shell has a current workspace role. */
export function useCanOperate() {
  const role = useContext(PermissionContext);
  return role !== null && ["owner", "admin", "member"].includes(role);
}
