"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/hooks/use-auth";
import { hasPermission, type Permission } from "@/lib/rbac";

/**
 * Redirects the user if they don't have a required permission.
 * @param permission - The permission to check
 * @param redirectTo - Where to redirect (default: /dashboard)
 */
export function useRoleGuard(permission: Permission, redirectTo = "/dashboard") {
  const { role, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!hasPermission(role, permission)) {
      router.replace(redirectTo);
    }
  }, [role, loading, permission, redirectTo, router]);

  return { allowed: hasPermission(role, permission), loading };
}

/**
 * Returns true only when the user has the permission and auth is loaded.
 */
export function useHasPermission(permission: Permission): boolean {
  const { role } = useAuth();
  return hasPermission(role, permission);
}
