"use client";

import { useMemo } from "react";
import { createClient as createBrowserClient } from "@/lib/supabase/client";

export function useSupabase() {
  const client = useMemo(() => createBrowserClient(), []);
  return client;
}

export function useRealtime<T>(
  table: string,
  onInsert?: (record: T) => void,
  onUpdate?: (record: T) => void,
  onDelete?: (record: T) => void,
) {
  const supabase = useSupabase();

  useMemo(() => {
    const channel = supabase
      .channel(`realtime:${table}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table },
        (payload) => {
          if (payload.eventType === "INSERT" && onInsert) onInsert(payload.new as T);
          if (payload.eventType === "UPDATE" && onUpdate) onUpdate(payload.new as T);
          if (payload.eventType === "DELETE" && onDelete) onDelete(payload.old as T);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [supabase, table, onInsert, onUpdate, onDelete]);
}
