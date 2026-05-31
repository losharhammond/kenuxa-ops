"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Bell, X, CheckCheck, Info, AlertTriangle, CheckCircle2, Package, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface Notification {
  id: string;
  title: string;
  body: string;
  category: string;
  action_url: string | null;
  read_at: string | null;
  created_at: string;
}

const CATEGORY_ICON: Record<string, React.ElementType> = {
  order:    Package,
  invoice:  FileText,
  alert:    AlertTriangle,
  success:  CheckCircle2,
  info:     Info,
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function NotificationBell({ iconSize = 14 }: { iconSize?: number }) {
  const [open, setOpen]         = useState(false);
  const [notes, setNotes]       = useState<Notification[]>([]);
  const [unread, setUnread]     = useState(0);
  const [loading, setLoading]   = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/notifications?limit=15");
      if (!res.ok) return;
      const data = await res.json();
      setNotes(data.notifications ?? []);
      setUnread(data.unreadCount ?? 0);
    } finally {
      setLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  async function markRead(id: string) {
    setNotes((prev) => prev.map((n) => n.id === id ? { ...n, read_at: new Date().toISOString() } : n));
    setUnread((u) => Math.max(0, u - 1));
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
  }

  async function markAllRead() {
    setNotes((prev) => prev.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })));
    setUnread(0);
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markAllRead: true }),
    });
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => { setOpen((v) => !v); if (!open) load(); }}
        className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#111624] border border-white/7 text-[#64748b] hover:text-[#f1f5f9] transition-colors relative"
        aria-label="Notifications"
      >
        <Bell size={iconSize} />
        {unread > 0 && (
          <span className="absolute top-1 right-1 min-w-[14px] h-[14px] bg-[#FF6524] rounded-full text-[9px] font-bold text-white flex items-center justify-center px-0.5 leading-none">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-[#0d0f1a] border border-white/10 rounded-xl shadow-[0_20px_40px_rgba(0,0,0,0.5)] z-50 overflow-hidden animate-slide-up">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/7">
            <span className="text-sm font-semibold text-[#f1f5f9]">Notifications</span>
            <div className="flex items-center gap-2">
              {unread > 0 && (
                <button
                  onClick={markAllRead}
                  className="flex items-center gap-1 text-xs text-[#64748b] hover:text-[#FF8B5E] transition-colors"
                >
                  <CheckCheck size={12} />
                  Mark all read
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="text-[#374151] hover:text-[#64748b] transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto">
            {loading && notes.length === 0 ? (
              <div className="space-y-0.5 p-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex gap-3 p-3 rounded-lg">
                    <div className="w-7 h-7 rounded-lg bg-white/5 animate-pulse flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 bg-white/5 rounded animate-pulse w-3/4" />
                      <div className="h-2.5 bg-white/5 rounded animate-pulse w-full" />
                    </div>
                  </div>
                ))}
              </div>
            ) : notes.length === 0 ? (
              <div className="py-10 text-center">
                <Bell size={24} className="text-[#374151] mx-auto mb-2" />
                <p className="text-sm text-[#64748b]">No notifications yet</p>
              </div>
            ) : (
              <div className="p-1.5 space-y-0.5">
                {notes.map((n) => {
                  const Icon = CATEGORY_ICON[n.category] ?? Info;
                  const isUnread = !n.read_at;
                  const inner = (
                    <div
                      className={cn(
                        "flex gap-3 p-3 rounded-lg cursor-pointer transition-colors",
                        isUnread ? "bg-[rgba(255,101,36,0.06)] hover:bg-[rgba(255,101,36,0.1)]" : "hover:bg-white/5"
                      )}
                      onClick={() => { if (isUnread) markRead(n.id); }}
                    >
                      <div className={cn(
                        "w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5",
                        isUnread ? "bg-[rgba(255,101,36,0.15)] text-[#FF8B5E]" : "bg-white/5 text-[#64748b]"
                      )}>
                        <Icon size={13} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={cn("text-xs font-medium truncate", isUnread ? "text-[#f1f5f9]" : "text-[#94a3b8]")}>
                          {n.title}
                        </p>
                        <p className="text-[11px] text-[#64748b] mt-0.5 line-clamp-2 leading-relaxed">{n.body}</p>
                        <p className="text-[10px] text-[#374151] mt-1">{timeAgo(n.created_at)}</p>
                      </div>
                      {isUnread && <span className="w-1.5 h-1.5 rounded-full bg-[#FF6524] flex-shrink-0 mt-1.5" />}
                    </div>
                  );
                  return n.action_url ? (
                    <Link key={n.id} href={n.action_url} onClick={() => { setOpen(false); if (isUnread) markRead(n.id); }}>
                      {inner}
                    </Link>
                  ) : (
                    <div key={n.id}>{inner}</div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          {notes.length > 0 && (
            <div className="border-t border-white/7 px-4 py-2.5">
              <Link
                href="/dashboard/settings?tab=notifications"
                onClick={() => setOpen(false)}
                className="text-xs text-[#64748b] hover:text-[#FF8B5E] transition-colors"
              >
                Notification settings →
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
