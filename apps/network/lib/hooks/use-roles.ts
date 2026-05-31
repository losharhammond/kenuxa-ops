"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/hooks/use-auth";
import { type Role, type Permission, ROLE_PERMISSIONS_MAP } from "@/lib/rbac";

export interface ActiveRole {
  role: Role;
  activated_at: string;
  metadata?: Record<string, string> | null;
}

interface RolesState {
  activeRoles: ActiveRole[];
  activeContext: Role;
  loading: boolean;
  canActivate: (role: Role) => boolean;
  activateRole: (role: Role, metadata?: Record<string, string>) => Promise<void>;
  switchContext: (role: Role) => Promise<void>;
  hasAnyRole: (...roles: Role[]) => boolean;
  multiPermission: (permission: Permission) => boolean;
}

// Roles that require business assignment (cannot be self-activated)
const ASSIGNED_ROLES: Role[] = ["branch_manager", "cashier", "employee", "recruiter",
  "country_admin", "super_admin", "financial_partner"];

// Roles a user can self-activate
const SELF_ACTIVATABLE: Role[] = ["customer", "job_seeker", "freelancer",
  "business_owner", "supplier", "delivery_rider"];

export function useRoles(): RolesState {
  const { user } = useAuth();
  const supabase = createClient();
  const [activeRoles, setActiveRoles] = useState<ActiveRole[]>([]);
  const [activeContext, setActiveContext] = useState<Role>("customer");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user?.id) { setLoading(false); return; }

    const [rolesRes, contextRes] = await Promise.all([
      supabase.from("user_roles").select("role, activated_at, metadata").eq("user_id", user.id),
      supabase.from("user_contexts").select("active_role").eq("user_id", user.id).single(),
    ]);

    const roles = (rolesRes.data ?? []) as ActiveRole[];
    if (roles.length === 0) {
      // First load — auto-provision wallet, rewards, and seed roles via API
      try {
        await fetch("/api/onboarding/provision", { method: "POST" });
      } catch { /* non-fatal */ }
      await supabase.from("user_roles").upsert({ user_id: user.id, role: "customer" });
      setActiveRoles([{ role: "customer", activated_at: new Date().toISOString() }]);
    } else {
      setActiveRoles(roles);
    }

    const ctx = (contextRes.data?.active_role ?? "customer") as Role;
    setActiveContext(ctx);
    setLoading(false);
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

  const activateRole = useCallback(async (role: Role, metadata?: Record<string, string>) => {
    if (!user?.id) return;
    await supabase.from("user_roles").upsert({
      user_id: user.id,
      role,
      activated_at: new Date().toISOString(),
      activated_by: "self",
      metadata: metadata ?? null,
    });
    await load();
  }, [user?.id, load]); // eslint-disable-line react-hooks/exhaustive-deps

  const switchContext = useCallback(async (role: Role) => {
    if (!user?.id) return;
    const prevRole = activeContext;
    setActiveContext(role);
    await Promise.all([
      supabase.from("user_contexts").upsert({ user_id: user.id, active_role: role, updated_at: new Date().toISOString() }),
      supabase.from("role_switch_history").insert({ user_id: user.id, from_role: prevRole, to_role: role }),
    ]);
  }, [user?.id, activeContext]); // eslint-disable-line react-hooks/exhaustive-deps

  const canActivate = useCallback((role: Role) => {
    if (ASSIGNED_ROLES.includes(role)) return false;
    return SELF_ACTIVATABLE.includes(role);
  }, []);

  const hasAnyRole = useCallback((...roles: Role[]) => {
    return roles.some((r) => activeRoles.some((ar) => ar.role === r));
  }, [activeRoles]);

  // Union of permissions across ALL active roles
  const multiPermission = useCallback((permission: Permission) => {
    return activeRoles.some((ar) => {
      const perms = ROLE_PERMISSIONS_MAP[ar.role as Role] ?? [];
      return perms.includes(permission);
    });
  }, [activeRoles]);

  return { activeRoles, activeContext, loading, canActivate, activateRole, switchContext, hasAnyRole, multiPermission };
}
