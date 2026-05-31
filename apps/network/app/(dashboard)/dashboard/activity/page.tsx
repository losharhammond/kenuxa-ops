"use client";

import { useEffect, useState, useCallback } from "react";
import { Header } from "@/components/layout/header";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/hooks/use-auth";
import Link from "next/link";
import {
  Activity, Briefcase, Building2, CreditCard, ShoppingBag,
  Star, Zap, Users, ShieldCheck, Truck, Pen, CheckCircle,
  Factory,
} from "lucide-react";

interface FeedItem {
  id: string;
  type: string;
  title: string;
  body: string | null;
  entity_type: string | null;
  entity_id: string | null;
  read: boolean;
  created_at: string;
}

const TYPE_META: Record<string, { icon: React.ElementType; color: string; bg: string; label: string }> = {
  role_activated:    { icon: Users,        color: "#8b5cf6", bg: "rgba(139,92,246,0.1)",  label: "Role" },
  business_created:  { icon: Building2,    color: "#3b82f6", bg: "rgba(59,130,246,0.1)",  label: "Business" },
  job_applied:       { icon: Briefcase,    color: "#10b981", bg: "rgba(16,185,129,0.1)",  label: "Jobs" },
  job_posted:        { icon: Briefcase,    color: "#f59e0b", bg: "rgba(245,158,11,0.1)",  label: "Jobs" },
  review_received:   { icon: Star,         color: "#f59e0b", bg: "rgba(245,158,11,0.1)",  label: "Review" },
  reward_earned:     { icon: Zap,          color: "#FF8B5E", bg: "rgba(255,101,36,0.1)",  label: "Reward" },
  order_placed:      { icon: ShoppingBag,  color: "#FF8B5E", bg: "rgba(255,101,36,0.1)",  label: "Order" },
  payment_sent:      { icon: CreditCard,   color: "#10b981", bg: "rgba(16,185,129,0.1)",  label: "Payment" },
  identity_verified: { icon: ShieldCheck,  color: "#10b981", bg: "rgba(16,185,129,0.1)",  label: "Identity" },
  delivery_completed:{ icon: Truck,        color: "#84cc16", bg: "rgba(132,204,22,0.1)",  label: "Delivery" },
  service_booked:    { icon: Pen,          color: "#8b5cf6", bg: "rgba(139,92,246,0.1)",  label: "Service" },
  supplier_rfq:      { icon: Factory,      color: "#f97316", bg: "rgba(249,115,22,0.1)",  label: "RFQ" },
  profile_updated:   { icon: CheckCircle,  color: "#64748b", bg: "rgba(100,116,139,0.1)", label: "Profile" },
};


const FILTERS = ["All", "Roles", "Jobs", "Business", "Rewards", "Payments", "Identity"];

function relTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString("en-GH", { day: "numeric", month: "short" });
}

const FILTER_TYPE_MAP: Record<string, string[]> = {
  Roles:    ["role_activated"],
  Jobs:     ["job_applied", "job_posted"],
  Business: ["business_created", "supplier_rfq"],
  Rewards:  ["reward_earned"],
  Payments: ["payment_sent", "order_placed"],
  Identity: ["identity_verified", "profile_updated"],
};

export default function ActivityPage() {
  const supabase = createClient();
  const { user } = useAuth();
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("All");

  const load = useCallback(async () => {
    if (!user?.id) { setFeed([]); setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase
      .from("activity_feed")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(100);
    setFeed((data as FeedItem[]) ?? []);
    setLoading(false);
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

  const allowedTypes = filter === "All" ? null : FILTER_TYPE_MAP[filter] ?? null;
  const displayed = allowedTypes ? feed.filter((f) => allowedTypes.includes(f.type)) : feed;

  // Group by date
  const grouped: { label: string; items: FeedItem[] }[] = [];
  for (const item of displayed) {
    const d = new Date(item.created_at);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    const isYesterday = d.toDateString() === new Date(now.getTime() - 86400000).toDateString();
    const label = isToday ? "Today" : isYesterday ? "Yesterday" : d.toLocaleDateString("en-GH", { weekday: "long", day: "numeric", month: "long" });
    const last = grouped[grouped.length - 1];
    if (last && last.label === label) {
      last.items.push(item);
    } else {
      grouped.push({ label, items: [item] });
    }
  }

  return (
    <>
      <Header title="Activity Feed" subtitle="Your KENUXA economic journey" />
      <div className="p-6 space-y-4">
        {/* Filter chips */}
        <div className="flex gap-2 flex-wrap">
          {FILTERS.map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                filter === f ? "bg-[rgba(255,101,36,0.15)] text-[#FF8B5E] border-[rgba(255,101,36,0.3)]" : "text-[#64748b] border-white/7 hover:border-white/20"
              }`}>
              {f}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-16 bg-[#111624] rounded-xl animate-pulse" />)}
          </div>
        ) : displayed.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <Activity size={40} className="text-[#374151] mb-3" />
            <p className="text-sm text-[#64748b]">No activity yet in this category.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {grouped.map(({ label, items }) => (
              <div key={label}>
                <p className="text-[10px] font-semibold text-[#374151] uppercase tracking-widest mb-3">{label}</p>
                <div className="relative">
                  {/* Timeline line */}
                  <div className="absolute left-5 top-0 bottom-0 w-px bg-white/5" />
                  <div className="space-y-1">
                    {items.map((item) => {
                      const meta = TYPE_META[item.type] ?? TYPE_META.profile_updated!;
                      const Icon = meta.icon;
                      return (
                        <div key={item.id} className="flex gap-4 pl-0 group">
                          {/* Timeline dot */}
                          <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 z-10 transition-all" style={{ background: meta.bg }}>
                            <Icon size={15} style={{ color: meta.color }} />
                          </div>
                          <div className="flex-1 py-2 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-sm font-medium text-[#f1f5f9]">{item.title}</p>
                              <span className="text-[10px] text-[#374151] flex-shrink-0">{relTime(item.created_at)}</span>
                            </div>
                            {item.body && <p className="text-xs text-[#64748b] mt-0.5">{item.body}</p>}
                            <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-[9px] font-semibold uppercase tracking-wide" style={{ background: meta.bg, color: meta.color }}>
                              {meta.label}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Bottom CTA */}
        <div className="pt-4 border-t border-white/5 text-center">
          <p className="text-xs text-[#374151] mb-3">Every action on KENUXA builds your economic identity.</p>
          <Link href="/dashboard/identity">
            <button className="px-4 py-2 rounded-xl border border-[rgba(255,101,36,0.2)] bg-[rgba(255,101,36,0.05)] text-[#FF8B5E] text-xs font-medium hover:bg-[rgba(255,101,36,0.1)] transition-colors">
              View My KENUXA Score →
            </button>
          </Link>
        </div>
      </div>
    </>
  );
}
