import { ConvexError, type Infer, v } from "convex/values";
import { z } from "zod";

export const vWorkspaceRole = v.union(
  v.literal("owner"),
  v.literal("admin"),
  v.literal("member"),
  v.literal("viewer"),
);
export const vMembershipRole = v.union(vWorkspaceRole, v.literal("staff"));
export const vInvitationRole = v.union(
  v.literal("admin"),
  v.literal("member"),
  v.literal("viewer"),
);
export type WorkspaceRole = Infer<typeof vWorkspaceRole>;
export type WorkspacePermission = "read" | "operate" | "manage" | "own";
export const MAX_WORKSPACES = 10;
export const MAX_WORKSPACE_MEMBERS = 100;
export const INVITATION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/** Retain old staff operational rights, without adding team management rights. */
export function workspaceRole(
  role: Infer<typeof vMembershipRole>,
): WorkspaceRole {
  return role === "staff" ? "member" : role;
}
export function hasWorkspacePermission(
  role: WorkspaceRole,
  permission: WorkspacePermission,
): boolean {
  switch (permission) {
    case "read": {
      return true;
    }
    case "operate": {
      return role !== "viewer";
    }
    case "manage": {
      return role === "owner" || role === "admin";
    }
    case "own": {
      return role === "owner";
    }
  }
}
/** Administrators cannot grant, alter or remove an owner or another admin. */
export function canManageWorkspaceRole(
  actor: WorkspaceRole,
  target: WorkspaceRole,
): boolean {
  return (
    actor === "owner" ||
    (actor === "admin" && (target === "member" || target === "viewer"))
  );
}
export function invitationEmail(value: string): string {
  const email = value.trim().toLowerCase();
  if (email.length > 254 || !z.email().safeParse(email).success)
    throw new ConvexError("INVALID_EMAIL");
  return email;
}
