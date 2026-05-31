"use client";

import { useEffect, useState, useCallback } from "react";
import { Header } from "@/components/layout/header";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/hooks/use-auth";
import Link from "next/link";
import {
  Bell, CheckCheck, Briefcase, CreditCard, ShoppingBag,
  ShieldCheck, Users, Zap, Info, AlertTriangle, CheckCircle,
  Loader2, Inbox,
} from "lucide-react";

interface Notification {
  id: string;
  type: "info" | "success" | "warning" | "action_required";
  category: string;
  title: string;
  body: string | null;
  action_url: string | null;
  action_label: string | null;
  read: boolean;
  created_at: string;
}

const CATEGORY_META: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  wallet:  { icon: CreditCard,  color: "#10b981", bg: "rgba(16,185,129,0.1)" },
  job:     { icon: Briefcase,   color: "#3b82f6", bg: "rgba(59,130,246,0.1)" },
  order:   { icon: ShoppingBag, color: "#FF8B5E", bg: "rgba(255,101,36,0.1)" },
  kyc:     { icon: ShieldCheck, color: "#f59e0b", bg: "rgba(245,158,11,0.1)" },
  role:    { icon: Users,       color: "#8b5cf6", bg: "rgba(139,92,246,0.1)" },
  reward:  { icon: Zap,         color: "#f59e0b", bg: "rgba(245,158,11,0.1)" },
  general: { icon: Bell,        color: "#64748b", bg: "rgba(100,116,139,0.1)" },
};

const TYPE_ICON: Record<string, React.ElementType> = {
  info:            Info,
  success:         CheckCircle,
  warning:         AlertTriangle,
  action_required: AlertTriangle,
};

const DEMO: Notification[] = [
  { id: "d1", type: "success",         category: "role",    title: "Customer role activated",            body: "You can now browse, shop, and earn rewards across the KENUXA network.",           action_url: "/dashboard",              action_label: "Explore now",  read: false, created_at: new Date(Date.now() - 3 * 60000).toISOString() },
  { id: "d2", type: "action_required", category: "kyc",     title: "Complete identity verification",     body: "Verify your ID to unlock payments, higher limits, and a Trust Score badge.",      action_url: "/dashboard/identity",     action_label: "Verify now",   read: false, created_at: new Date(Date.now() - 15 * 60000).toISOString() },
  { id: "d3", type: "info",            category: "wallet",  title: "KENUXA Wallet provisioned",          body: "Your digital wallet is ready. Top up to start transacting.",                      action_url: "/dashboard/wallet",       action_label: "Top up",       read: false, created_at: new Date(Date.now() - 30 * 60000).toISOString() },
  { id: "d4", type: "info",            category: "reward",  title: "Welcome bonus — 100 reward points",  body: "You've received 100 KENUXA Points for joining. Use them at any partner business.", action_url: "/dashboard/rewards",      action_label: "View rewards", read: true,  created_at: new Date(Date.now() - 2 * 3600000).toISOString() },
  { id: "d5", type: "info",            category: "job",     title: "3 new jobs match your profile",      body: "Software Engineer, Data Analyst, and Marketing Manager openings are live.",       action_url: "/dashboard/jobs",         action_label: "View jobs",    read: true,  created_at: new Date(Date.now() - 5 * 3600000).toISOString() },
];

function relTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function NotificationsPage() {
  const supabase = createClient();
  const { user } = useAuth();
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [markingAll, setMarkingAll] = useState(false);

  const load = useCallback(async () => {
    if (!user?.id) { setNotifs(DEMO); setLoading(false); return; }
    setLoading(true);
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error || !data || data.length === 0) {
      setNotifs(DEMO);
    } else {
      setNotifs(data as Notification[]);
    }
    setLoading(false);
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

  const markRead = async (id: string) => {
    setNotifs((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
    if (user?.id && !id.startsWith("d")) {
      await supabase.from("notifications").update({ read: true }).eq("id", id).eq("user_id", user.id);
    }
  };

  const markAllRead = async () => {
    setMarkingAll(true);
    setNotifs((prev) => prev.map((n) => ({ ...n, read: true })));
    if (user?.id) {
      await supabase.from("notifications").update({ read: true }).eq("user_id", user.id).eq("read", false);
    }
    setMarkingAll(false);
  };

  const displayed = filter === "unread" ? notifs.filter((n) => !n.read) : notifs;
  const unreadCount = notifs.filter((n) => !n.read).length;

  return (
    <>
      <Header
        title="Notifications"
        subtitle={`${unreadCount} unread`}
        actions={
          unreadCount > 0 ? (
            <button onClick={markAllRead} disabled={markingAll}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 text-xs text-[#64748b] hover:text-[#f1f5f9] hover:border-white/20 transition-all disabled:opacity-50">
              {markingAll ? <Loader2 size={12} className="animate-spin" /> : <CheckCheck size={12} />}
              Mark all read
            </button>
          ) : undefined
        }
      />
      <div className="p-6 space-y-4">
        {/* Filter tabs */}
        <div className="flex gap-2">
          {(["all", "unread"] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all capitalize ${
                filter === f ? "bg-[rgba(255,101,36,0.15)] text-[#FF8B5E] border border-[rgba(255,101,36,0.3)]" : "text-[#64748b] border border-white/7 hover:border-white/20"
              }`}>
              {f === "unread" ? `Unread (${unreadCount})` : "All"}
            </button>
          ))}
        </div>

        {/* Notifications list */}
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-20 bg-[#111624] rounded-xl animate-pulse" />)}
          </div>
        ) : displayed.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Inbox size={40} className="text-[#374151] mb-3" />
            <p className="text-sm font-medium text-[#64748b]">No notifications</p>
            <p className="text-xs text-[#374151] mt-1">You&apos;re all caught up!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {displayed.map((n) => {
              const catMeta = CATEGORY_META[n.category] ?? CATEGORY_META.general!;
              const CatIcon = catMeta.icon;
              const TypeIcon = TYPE_ICON[n.type] ?? Info;
              return (
                <div
                  key={n.id}
                  onClick={() => !n.read && markRead(n.id)}
                  className={`flex gap-4 p-4 rounded-xl border transition-all cursor-pointer ${
                    !n.read
                      ? "bg-[#111624] border-[rgba(255,101,36,0.15)] hover:border-[rgba(255,101,36,0.3)]"
                      : "bg-[#0a0c15] border-white/5 hover:border-white/10 opacity-70"
                  }`}
                >
                  {/* Icon */}
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: catMeta.bg }}>
                    <CatIcon size={16} style={{ color: catMeta.color }} />
                  </div>
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-sm font-medium ${n.read ? "text-[#64748b]" : "text-[#f1f5f9]"}`}>{n.title}</p>
                      <span className="text-[10px] text-[#374151] flex-shrink-0">{relTime(n.created_at)}</span>
                    </div>
                    {n.body && <p className="text-xs text-[#64748b] mt-0.5 leading-relaxed">{n.body}</p>}
                    {n.action_url && n.action_label && (
                      <Link href={n.action_url} onClick={(e) => e.stopPropagation()}>
                        <button className="mt-2 px-3 py-1 rounded-lg text-xs font-semibold transition-all"
                          style={{ background: catMeta.bg, color: catMeta.color }}>
                          {n.action_label} →
                        </button>
                      </Link>
                    )}
                  </div>
                  {/* Unread dot */}
                  {!n.read && <div className="w-2 h-2 rounded-full bg-[#FF6524] flex-shrink-0 mt-1.5" />}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
