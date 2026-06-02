"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { createClient as createBrowserClient } from "@/lib/supabase/client";
import type { User, Session } from "@supabase/supabase-js";
import type { Role } from "@/lib/rbac";
import { hasPermission, type Permission } from "@/lib/rbac";

export interface UserProfile {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  role: Role;
  avatar_url: string | null;
  is_verified: boolean;
  org_id: string | null;
  business_id: string | null;
  country: string | null;
}

interface AuthState {
  user: User | null;
  profile: UserProfile | null;
  session: Session | null;
  loading: boolean;
  role: Role | null;
}

export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({
    user: null,
    profile: null,
    session: null,
    loading: true,
    role: null,
  });

  // Stable client ref — never recreated across renders
  const supabaseRef = useRef(createBrowserClient());
  const supabase = supabaseRef.current;

  const loadProfile = useCallback(
    async (userId: string) => {
      const { data } = await supabase
        .from("user_profiles")
        .select("id, full_name, email, phone, role, avatar_url, is_verified, org_id, business_id, country")
        .eq("id", userId)
        .single();
      return data as UserProfile | null;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  useEffect(() => {
    // Use getUser() (server-validated) instead of getSession() (local storage, insecure)
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      const profile = user ? await loadProfile(user.id) : null;
      setState({
        user: user ?? null,
        profile,
        session: null,
        loading: false,
        role: (profile?.role ?? null) as Role | null,
      });
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const profile = session?.user ? await loadProfile(session.user.id) : null;
      setState({
        user: session?.user ?? null,
        profile,
        session: session ?? null,
        loading: false,
        role: (profile?.role ?? null) as Role | null,
      });
    });

    return () => subscription.unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return state;
}

export function useUser() {
  const { user, profile, loading, role } = useAuth();
  return { user, profile, loading, role };
}

export function usePermission(permission: Permission): boolean {
  const { role } = useAuth();
  return hasPermission(role, permission);
}

export function useRequireRole(allowedRoles: Role[]): { allowed: boolean; loading: boolean } {
  const { role, loading } = useAuth();
  return { allowed: !loading && role !== null && allowedRoles.includes(role), loading };
}
