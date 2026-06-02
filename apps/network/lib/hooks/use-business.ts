"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { createClient as createBrowserClient } from "@/lib/supabase/client";
import { useUser } from "@/lib/hooks/use-auth";

interface Business {
  id: string;
  name: string;
  type: string;
  city: string;
  verified: boolean;
  logo_url?: string;
  phone?: string;
  email?: string;
}

export function useBusiness() {
  const { user } = useUser();
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  // Stable client ref — never recreated across renders
  const supabaseRef = useRef(createBrowserClient());

  const fetch = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    setLoading(true);
    const { data } = await supabaseRef.current
      .from("businesses")
      .select("id, name, type, city, verified, logo_url, phone, email")
      .eq("owner_id", user.id)
      .single();
    setBusiness(data ?? null);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetch(); }, [fetch]);

  return { business, loading, refetch: fetch };
}

export function useBusinessStats() {
  const [stats, setStats] = useState({
    revenue: 0, orders: 0, customers: 0, products: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/analytics")
      .then((r) => r.json())
      .then((d) => {
        if (d.data) setStats(d.data);
      })
      .finally(() => setLoading(false));
  }, []);

  return { stats, loading };
}
