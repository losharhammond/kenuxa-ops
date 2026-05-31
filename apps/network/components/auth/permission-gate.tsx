"use client";

import { useAuth } from "@/lib/hooks/use-auth";
import { hasPermission, hasAnyPermission, isAdminRole, type Permission, type Role } from "@/lib/rbac";

interface PermissionGateProps {
  children: React.ReactNode;
  /** Require this single permission */
  permission?: Permission;
  /** Require ANY of these permissions */
  anyOf?: Permission[];
  /** Require user to be in one of these roles */
  roles?: Role[];
  /** Require admin role (super_admin | country_admin) */
  adminOnly?: boolean;
  /** Fallback to render when permission is denied */
  fallback?: React.ReactNode;
}

export function PermissionGate({
  children,
  permission,
  anyOf,
  roles,
  adminOnly,
  fallback = null,
}: PermissionGateProps) {
  const { role, loading } = useAuth();

  if (loading) return null;

  let allowed = true;

  if (adminOnly) {
    allowed = isAdminRole(role);
  } else if (roles && roles.length > 0) {
    allowed = role !== null && roles.includes(role);
  } else if (anyOf && anyOf.length > 0) {
    allowed = hasAnyPermission(role, anyOf);
  } else if (permission) {
    allowed = hasPermission(role, permission);
  }

  return allowed ? <>{children}</> : <>{fallback}</>;
}

/** Quick helper for admin-only UI sections */
export function AdminOnly({ children, fallback }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  return <PermissionGate adminOnly fallback={fallback}>{children}</PermissionGate>;
}

/** Quick helper — render only for business roles */
export function BusinessOnly({ children, fallback }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  return (
    <PermissionGate
      roles={["business_owner", "branch_manager", "cashier", "employee"]}
      fallback={fallback}
    >
      {children}
    </PermissionGate>
  );
}
