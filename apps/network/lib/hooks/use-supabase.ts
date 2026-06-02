"use client";

import { useEffect, useRef } from "react";
import { createClient as createBrowserClient } from "@/lib/supabase/client";

export function useSupabase() {
  // Stable client ref — never recreated across renders
  const ref = useRef(createBrowserClient());
  return ref.current;
}

export function useRealtime<T>(
  table: string,
  onInsert?: (record: T) => void,
  onUpdate?: (record: T) => void,
  onDelete?: (record: T) => void,
) {
  const supabase = useSupabase();

  // useEffect (not useMemo) for side-effects; cleanup unsubscribes on unmount
  useEffect(() => {
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table]);
}
