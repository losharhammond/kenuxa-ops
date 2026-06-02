"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Network, Building2, Users, ShoppingBag, Briefcase, TrendingUp,
  ArrowRight, Globe, Zap, BarChart3, RefreshCw, Info,
} from "lucide-react";

interface GraphStats {
  businesses: number;
  consumers: number;
  transactions: number;
  jobs: number;
  products: number;
  services: number;
  connections: number;
  gdp_estimate: number;
}

interface TopBusiness {
  id: string;
  name: string;
  industry: string;
  connections: number;
  revenue_tier: string;
}

interface EconomicFlow {
  from: string;
  to: string;
  label: string;
  value: string;
  color: string;
}

const FLOWS: EconomicFlow[] = [
  { from: "Consumers", to: "Businesses", label: "Purchases", value: "₵2.4M / day", color: "#FF6524" },
  { from: "Businesses", to: "Suppliers", label: "Procurement", value: "₵890K / day", color: "#8B5CF6" },
  { from: "Businesses", to: "Workers", label: "Wages", value: "₵1.1M / mo", color: "#10B981" },
  { from: "Suppliers", to: "Businesses", label: "Inventory", value: "₵650K / day", color: "#3B82F6" },
  { from: "Businesses", to: "Consumers", label: "Delivery", value: "3,200 / day", color: "#F59E0B" },
  { from: "KENUXA AI", to: "All Nodes", label: "Intelligence", value: "Real-time", color: "#EC4899" },
];

const NETWORK_NODES = [
  { id: "businesses", label: "Businesses", count: "4,280", icon: Building2, color: "#FF6524", x: 50, y: 30 },
  { id: "consumers", label: "Consumers", count: "18,500", icon: Users, color: "#3B82F6", x: 20, y: 60 },
  { id: "suppliers", label: "Suppliers", count: "920", icon: ShoppingBag, color: "#8B5CF6", x: 80, y: 60 },
  { id: "workers", label: "Workers", count: "6,300", icon: Briefcase, color: "#10B981", x: 35, y: 85 },
  { id: "products", label: "Products", count: "52K+", icon: ShoppingBag, color: "#F59E0B", x: 65, y: 85 },
];

const EMPTY_STATS: GraphStats = {
  businesses: 0,
  consumers: 0,
  transactions: 0,
  jobs: 0,
  products: 0,
  services: 0,
  connections: 0,
  gdp_estimate: 0,
};

const INDUSTRY_BREAKDOWN = [
  { label: "Retail & Trade", pct: 32, color: "#FF6524" },
  { label: "Food & Beverage", pct: 18, color: "#F59E0B" },
  { label: "Professional Services", pct: 15, color: "#8B5CF6" },
  { label: "Technology", pct: 12, color: "#3B82F6" },
  { label: "Agriculture", pct: 10, color: "#10B981" },
  { label: "Construction", pct: 8, color: "#EC4899" },
  { label: "Other", pct: 5, color: "#64748B" },
];

function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

export default function EconomicGraphPage() {
  const supabase = createClient();
  const [stats, setStats] = useState<GraphStats>(EMPTY_STATS);
  const [topBusinesses, setTopBusinesses] = useState<TopBusiness[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeNode, setActiveNode] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const [bizRes, userRes, txRes] = await Promise.all([
      supabase.from("businesses").select("id", { count: "exact", head: true }),
      supabase.from("user_profiles").select("id", { count: "exact", head: true }),
      supabase.from("wallet_transactions").select("id", { count: "exact", head: true }),
    ]);
    const biz = bizRes.count ?? 0;
    const usr = userRes.count ?? 0;
    const tx = txRes.count ?? 0;
    setStats((prev) => ({ ...prev, businesses: biz, consumers: usr, transactions: tx }));

    const { data: topData } = await supabase
      .from("businesses")
      .select("id, name, industry")
      .limit(5)
      .order("created_at", { ascending: false });

    if (topData && topData.length > 0) {
      setTopBusinesses(topData.map((b, i) => ({
        id: b.id,
        name: b.name,
        industry: b.industry ?? "General",
        connections: 0,
        revenue_tier: ["SME", "Large", "Enterprise"][i % 3]!,
      })));
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => { load(); }, [load]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  return (
    <div className="min-h-screen bg-[#070B14] text-white">
      {/* Header */}
      <div className="border-b border-white/7 bg-[#0d0f1a]">
        <div className="max-w-7xl mx-auto px-6 py-6 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Network size={20} className="text-[#FF6524]" />
              <h1 className="text-2xl font-bold text-white">Economic Graph</h1>
            </div>
            <p className="text-sm text-[#64748b]">
              Real-time intelligence layer mapping the KENUXA economic network
            </p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm text-[#94a3b8] transition-all"
          >
            <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {/* KPI Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Businesses", value: fmt(stats.businesses), icon: Building2, color: "#FF6524" },
            { label: "Network Users", value: fmt(stats.consumers), icon: Users, color: "#3B82F6" },
            { label: "Transactions", value: fmt(stats.transactions), icon: TrendingUp, color: "#10B981" },
            { label: "Network Connections", value: fmt(stats.connections), icon: Network, color: "#8B5CF6" },
          ].map((kpi) => {
            const Icon = kpi.icon;
            return (
              <div key={kpi.label} className="bg-[#0d0f1a] border border-white/7 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${kpi.color}20` }}>
                    <Icon size={14} style={{ color: kpi.color }} />
                  </div>
                  <span className="text-xs text-[#64748b]">{kpi.label}</span>
                </div>
                <p className="text-2xl font-bold text-white">{kpi.value}</p>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Network Map */}
          <div className="lg:col-span-2 bg-[#0d0f1a] border border-white/7 rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-white/7 flex items-center justify-between">
              <div>
                <p className="font-semibold text-white">Network Map</p>
                <p className="text-xs text-[#64748b]">Click a node to explore connections</p>
              </div>
              <span className="flex items-center gap-1.5 text-xs text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live
              </span>
            </div>
            <div className="relative h-80 overflow-hidden">
              {/* Animated background grid */}
              <div className="absolute inset-0 opacity-5"
                style={{
                  backgroundImage: "linear-gradient(rgba(255,101,36,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,101,36,0.5) 1px, transparent 1px)",
                  backgroundSize: "40px 40px",
                }}
              />

              {/* Connection lines (SVG) */}
              <svg className="absolute inset-0 w-full h-full" style={{ opacity: 0.3 }}>
                {NETWORK_NODES.slice(1).map((node) => (
                  <line
                    key={node.id}
                    x1={`${NETWORK_NODES[0]!.x}%`} y1={`${NETWORK_NODES[0]!.y}%`}
                    x2={`${node.x}%`} y2={`${node.y}%`}
                    stroke={node.color} strokeWidth="1.5" strokeDasharray="4 4"
                  />
                ))}
              </svg>

              {/* Nodes */}
              {NETWORK_NODES.map((node) => {
                const Icon = node.icon;
                const isActive = activeNode === node.id;
                return (
                  <button
                    key={node.id}
                    onClick={() => setActiveNode(isActive ? null : node.id)}
                    className="absolute transform -translate-x-1/2 -translate-y-1/2 transition-all"
                    style={{ left: `${node.x}%`, top: `${node.y}%` }}
                  >
                    <div
                      className={`w-16 h-16 rounded-2xl flex flex-col items-center justify-center border-2 transition-all ${
                        isActive ? "scale-110 shadow-lg" : "hover:scale-105"
                      }`}
                      style={{
                        backgroundColor: `${node.color}15`,
                        borderColor: isActive ? node.color : `${node.color}40`,
                        boxShadow: isActive ? `0 0 20px ${node.color}40` : undefined,
                      }}
                    >
                      <Icon size={18} style={{ color: node.color }} />
                      <span className="text-[9px] font-bold mt-0.5" style={{ color: node.color }}>{node.count}</span>
                    </div>
                    <p className="text-[10px] text-[#94a3b8] text-center mt-1 font-medium">{node.label}</p>
                  </button>
                );
              })}

              {/* Central pulse */}
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                <div className="w-3 h-3 rounded-full bg-[#FF6524] animate-ping opacity-30" />
              </div>
            </div>

            {/* Node detail panel */}
            {activeNode && (() => {
              const node = NETWORK_NODES.find((n) => n.id === activeNode);
              if (!node) return null;
              const Icon = node.icon;
              return (
                <div className="px-5 py-4 border-t border-white/7 bg-white/[0.02]">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${node.color}20` }}>
                      <Icon size={16} style={{ color: node.color }} />
                    </div>
                    <div>
                      <p className="font-medium text-white text-sm">{node.label} Network</p>
                      <p className="text-xs text-[#64748b]">{node.count} active nodes · Growing 12% MoM</p>
                    </div>
                    <ArrowRight size={14} className="ml-auto text-[#64748b]" />
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Industry Breakdown */}
          <div className="bg-[#0d0f1a] border border-white/7 rounded-2xl">
            <div className="px-5 py-4 border-b border-white/7">
              <p className="font-semibold text-white">Industry Breakdown</p>
              <p className="text-xs text-[#64748b]">By business count</p>
            </div>
            <div className="p-5 space-y-3">
              {INDUSTRY_BREAKDOWN.map((ind) => (
                <div key={ind.label}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-[#94a3b8]">{ind.label}</span>
                    <span className="text-xs font-semibold text-white">{ind.pct}%</span>
                  </div>
                  <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${ind.pct}%`, backgroundColor: ind.color }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* GDP estimate */}
            <div className="mx-5 mb-5 p-4 bg-[rgba(255,101,36,0.06)] border border-[rgba(255,101,36,0.15)] rounded-xl">
              <div className="flex items-center gap-1.5 mb-1">
                <Globe size={13} className="text-[#FF8B5E]" />
                <span className="text-xs text-[#FF8B5E] font-medium">Network GDP Estimate</span>
              </div>
              <p className="text-xl font-bold text-white">₵{fmt(stats.gdp_estimate)}</p>
              <p className="text-xs text-[#64748b] mt-0.5">Annualised economic activity flowing through KENUXA</p>
            </div>
          </div>
        </div>

        {/* Economic Flows */}
        <div className="bg-[#0d0f1a] border border-white/7 rounded-2xl">
          <div className="px-5 py-4 border-b border-white/7 flex items-center gap-2">
            <Zap size={16} className="text-[#FF6524]" />
            <p className="font-semibold text-white">Economic Flows</p>
            <span className="ml-auto text-xs text-[#64748b] flex items-center gap-1">
              <Info size={11} />
              Estimated real-time flows
            </span>
          </div>
          <div className="p-5">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {FLOWS.map((flow) => (
                <div key={flow.label} className="flex items-center gap-3 p-3 bg-white/[0.02] border border-white/7 rounded-xl">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: flow.color }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1 text-xs text-[#94a3b8]">
                      <span className="truncate">{flow.from}</span>
                      <ArrowRight size={10} />
                      <span className="truncate">{flow.to}</span>
                    </div>
                    <p className="text-[11px] text-[#64748b]">{flow.label}</p>
                  </div>
                  <span className="text-xs font-semibold flex-shrink-0" style={{ color: flow.color }}>
                    {flow.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Top Connected Businesses */}
        <div className="bg-[#0d0f1a] border border-white/7 rounded-2xl">
          <div className="px-5 py-4 border-b border-white/7 flex items-center gap-2">
            <BarChart3 size={16} className="text-[#FF6524]" />
            <p className="font-semibold text-white">Most Connected Businesses</p>
          </div>
          <div className="divide-y divide-white/[0.04]">
            {topBusinesses.length === 0 && !loading ? (
              <div className="px-5 py-8 text-center">
                <p className="text-sm text-[#374151]">No businesses yet. Be the first to join the network.</p>
              </div>
            ) : topBusinesses.map((biz, i) => (
              <div key={biz.id} className="px-5 py-3.5 flex items-center gap-4">
                <span className="text-xs font-bold text-[#374151] w-5">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{biz.name}</p>
                  <p className="text-xs text-[#64748b]">{biz.industry}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-[#94a3b8]">{biz.revenue_tier}</span>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-white">{fmt(biz.connections)}</p>
                    <p className="text-[10px] text-[#64748b]">connections</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
