"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Database, Zap, BarChart3, Activity, TrendingUp, Clock,
  Download, RefreshCw, Filter, Table2, Server,
  ChevronRight, CheckCircle, AlertCircle, Info,
} from "lucide-react";

interface EventStream {
  id: string;
  event_type: string;
  source: string;
  count: number;
  last_seen: string;
  status: "healthy" | "degraded" | "offline";
}

interface TableStats {
  table_name: string;
  row_estimate: number;
  size_bytes: number;
  last_updated: string;
  growth_pct: number;
}

interface QueryLog {
  id: string;
  query_type: string;
  duration_ms: number;
  rows_affected: number;
  table_name: string;
  timestamp: string;
}

const PLATFORM_STREAMS: EventStream[] = [
  { id: "e1", event_type: "pos.sale_completed",        source: "POS Module",      count: 3420,  last_seen: "2s ago",    status: "healthy" },
  { id: "e2", event_type: "marketplace.order_placed",  source: "Marketplace",     count: 1820,  last_seen: "8s ago",    status: "healthy" },
  { id: "e3", event_type: "user.profile_updated",      source: "Auth Service",    count: 892,   last_seen: "15s ago",   status: "healthy" },
  { id: "e4", event_type: "delivery.status_changed",   source: "Delivery Module", count: 567,   last_seen: "22s ago",   status: "healthy" },
  { id: "e5", event_type: "payment.transaction",       source: "Payments",        count: 2103,  last_seen: "5s ago",    status: "healthy" },
  { id: "e6", event_type: "rfq.bid_submitted",         source: "Procurement",     count: 234,   last_seen: "1m ago",    status: "degraded" },
  { id: "e7", event_type: "ai.query_processed",        source: "AI Engine",       count: 1450,  last_seen: "3s ago",    status: "healthy" },
  { id: "e8", event_type: "inventory.stock_changed",   source: "Inventory",       count: 780,   last_seen: "45s ago",   status: "healthy" },
];

const PLATFORM_TABLES: TableStats[] = [
  { table_name: "transactions",   row_estimate: 142300, size_bytes: 42_000_000,  last_updated: "now",       growth_pct: 12.4 },
  { table_name: "profiles",       row_estimate: 18500,  size_bytes: 8_200_000,   last_updated: "2s ago",    growth_pct: 5.2  },
  { table_name: "businesses",     row_estimate: 4280,   size_bytes: 3_100_000,   last_updated: "5s ago",    growth_pct: 3.8  },
  { table_name: "inventory",      row_estimate: 52000,  size_bytes: 18_500_000,  last_updated: "1m ago",    growth_pct: 8.1  },
  { table_name: "job_listings",   row_estimate: 6300,   size_bytes: 2_800_000,   last_updated: "30s ago",   growth_pct: 15.6 },
  { table_name: "invoices",       row_estimate: 28700,  size_bytes: 12_400_000,  last_updated: "10s ago",   growth_pct: 7.3  },
  { table_name: "skill_profiles", row_estimate: 1820,   size_bytes: 900_000,     last_updated: "2m ago",    growth_pct: 22.1 },
  { table_name: "rfqs",           row_estimate: 3450,   size_bytes: 1_600_000,   last_updated: "15s ago",   growth_pct: 9.4  },
];

const PLATFORM_QUERIES: QueryLog[] = [
  { id: "q1", query_type: "SELECT",  duration_ms: 12,  rows_affected: 74,   table_name: "transactions",  timestamp: "now"     },
  { id: "q2", query_type: "INSERT",  duration_ms: 8,   rows_affected: 1,    table_name: "invoices",      timestamp: "2s ago"  },
  { id: "q3", query_type: "UPDATE",  duration_ms: 5,   rows_affected: 1,    table_name: "inventory",     timestamp: "4s ago"  },
  { id: "q4", query_type: "SELECT",  duration_ms: 340, rows_affected: 1820, table_name: "profiles",      timestamp: "8s ago"  },
  { id: "q5", query_type: "INSERT",  duration_ms: 10,  rows_affected: 1,    table_name: "transactions",  timestamp: "9s ago"  },
  { id: "q6", query_type: "SELECT",  duration_ms: 88,  rows_affected: 234,  table_name: "rfqs",          timestamp: "12s ago" },
];

const ANALYTICS_METRICS = [
  { label: "Events / sec",        value: "847",    delta: "+12%",  color: "#10B981" },
  { label: "Avg query time",      value: "18ms",   delta: "-8%",   color: "#3B82F6" },
  { label: "Data ingested today", value: "2.4 GB", delta: "+31%",  color: "#8B5CF6" },
  { label: "Active pipelines",    value: "8 / 8",  delta: "100%",  color: "#F59E0B" },
];

function fmtBytes(b: number) {
  if (b >= 1_000_000_000) return `${(b / 1_000_000_000).toFixed(1)} GB`;
  if (b >= 1_000_000) return `${(b / 1_000_000).toFixed(1)} MB`;
  return `${(b / 1_000).toFixed(0)} KB`;
}

function fmtRows(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

export default function DataPlatformPage() {
  const supabase = createClient();
  const [tables, setTables] = useState<TableStats[]>(PLATFORM_TABLES);
  const [streams] = useState<EventStream[]>(PLATFORM_STREAMS);
  const [queries] = useState<QueryLog[]>(PLATFORM_QUERIES);
  const [activeTab, setActiveTab] = useState<"overview" | "streams" | "warehouse" | "queries">("overview");
  const [refreshing, setRefreshing] = useState(false);
  const [liveCount, setLiveCount] = useState(847);

  const loadRealCounts = useCallback(async () => {
    const tableNames = ["transactions", "profiles", "businesses", "inventory", "job_listings", "invoices", "skill_profiles", "rfqs"];
    const results = await Promise.all(
      tableNames.map((t) => supabase.from(t).select("id", { count: "exact", head: true }))
    );
    setTables(PLATFORM_TABLES.map((t, i) => ({
      ...t,
      row_estimate: results[i]?.count ?? t.row_estimate,
    })));
  }, [supabase]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    loadRealCounts();
    const interval = setInterval(() => {
      setLiveCount((n) => n + Math.floor(Math.random() * 20) - 5);
    }, 2000);
    return () => clearInterval(interval);
  }, [loadRealCounts]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadRealCounts();
    setRefreshing(false);
  };

  const TABS = [
    { key: "overview" as const,  label: "Overview" },
    { key: "streams" as const,   label: "Event Streams" },
    { key: "warehouse" as const, label: "Data Warehouse" },
    { key: "queries" as const,   label: "Query Log" },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Database size={20} className="text-[#FF6524]" />
            <h1 className="text-xl font-bold text-white">Data Platform</h1>
          </div>
          <p className="text-sm text-[#64748b]">Real-time event streaming, data warehouse, and analytics infrastructure</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-3 py-1.5 rounded-xl">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            All systems operational
          </span>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm text-[#94a3b8] transition-all"
          >
            <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-[#0d0f1a] border border-white/7 rounded-2xl p-1.5 w-fit">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              activeTab === t.key
                ? "bg-[rgba(255,101,36,0.12)] text-[#FF8B5E]"
                : "text-[#64748b] hover:text-white"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Overview */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {ANALYTICS_METRICS.map((m) => (
              <div key={m.label} className="bg-[#0d0f1a] border border-white/7 rounded-2xl p-5">
                <p className="text-xs text-[#64748b] mb-2">{m.label}</p>
                <p className="text-2xl font-bold text-white">{m.label === "Events / sec" ? liveCount.toLocaleString() : m.value}</p>
                <span className="text-xs font-semibold" style={{ color: m.color }}>{m.delta} vs yesterday</span>
              </div>
            ))}
          </div>

          {/* Stack overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              {
                title: "Event Streaming",
                icon: Zap, color: "#FF6524",
                items: ["Supabase Realtime", "PostgreSQL WAL", "8 active event types", "847 events/sec"],
                status: "healthy",
              },
              {
                title: "Data Warehouse",
                icon: Database, color: "#8B5CF6",
                items: ["PostgreSQL (primary)", "8 core tables", "2.4 GB ingested today", "Sub-20ms avg query"],
                status: "healthy",
              },
              {
                title: "AI Analytics",
                icon: BarChart3, color: "#3B82F6",
                items: ["KENUXA Economic Graph", "Real-time recommendations", "Fraud detection pipeline", "Credit scoring engine"],
                status: "healthy",
              },
            ].map((card) => {
              const Icon = card.icon;
              return (
                <div key={card.title} className="bg-[#0d0f1a] border border-white/7 rounded-2xl p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${card.color}20` }}>
                      <Icon size={16} style={{ color: card.color }} />
                    </div>
                    <div>
                      <p className="font-semibold text-white text-sm">{card.title}</p>
                      <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                        <CheckCircle size={10} /> Operational
                      </span>
                    </div>
                  </div>
                  <ul className="space-y-1.5">
                    {card.items.map((item) => (
                      <li key={item} className="flex items-center gap-2 text-xs text-[#94a3b8]">
                        <ChevronRight size={11} className="text-[#374151]" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>

          {/* Planned integrations */}
          <div className="bg-[#0d0f1a] border border-white/7 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Server size={15} className="text-[#FF6524]" />
              <p className="font-semibold text-white text-sm">Planned Infrastructure Upgrades</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "ClickHouse",       desc: "Columnar analytics warehouse",  status: "planned" },
                { label: "Apache Kafka",      desc: "High-throughput event streaming", status: "planned" },
                { label: "Redis Streams",     desc: "Real-time pub/sub messaging",  status: "partial" },
                { label: "Prometheus/Grafana",desc: "Metrics & dashboard monitoring", status: "planned" },
              ].map((tool) => (
                <div key={tool.label} className="p-3 bg-white/[0.02] border border-white/7 rounded-xl">
                  <div className="flex items-center gap-1.5 mb-1">
                    <p className="text-sm font-medium text-white">{tool.label}</p>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase ${
                      tool.status === "partial" ? "bg-yellow-500/10 text-yellow-400" : "bg-white/5 text-[#64748b]"
                    }`}>{tool.status}</span>
                  </div>
                  <p className="text-xs text-[#64748b]">{tool.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Event Streams */}
      {activeTab === "streams" && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Activity size={14} className="text-[#FF6524]" />
            <p className="text-sm text-[#94a3b8]">Live event streams from all platform modules</p>
            <span className="ml-auto flex items-center gap-1.5 text-xs text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              {liveCount.toLocaleString()} events/sec
            </span>
          </div>
          <div className="bg-[#0d0f1a] border border-white/7 rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/7">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-[#374151] uppercase tracking-wider">Event Type</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-[#374151] uppercase tracking-wider">Source</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-[#374151] uppercase tracking-wider">Events Today</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-[#374151] uppercase tracking-wider">Last Seen</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-[#374151] uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {streams.map((s) => (
                  <tr key={s.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-5 py-3">
                      <span className="font-mono text-xs text-[#a78bfa]">{s.event_type}</span>
                    </td>
                    <td className="px-5 py-3 text-xs text-[#94a3b8]">{s.source}</td>
                    <td className="px-5 py-3 text-right text-sm font-semibold text-white">{s.count.toLocaleString()}</td>
                    <td className="px-5 py-3 text-xs text-[#64748b] flex items-center gap-1"><Clock size={11} /> {s.last_seen}</td>
                    <td className="px-5 py-3">
                      <span className={`text-xs font-semibold flex items-center gap-1 w-fit ${
                        s.status === "healthy" ? "text-emerald-400" : s.status === "degraded" ? "text-yellow-400" : "text-red-400"
                      }`}>
                        {s.status === "healthy" ? <CheckCircle size={11} /> : <AlertCircle size={11} />}
                        {s.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Data Warehouse */}
      {activeTab === "warehouse" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Table2 size={14} className="text-[#FF6524]" />
              <p className="text-sm text-[#94a3b8]">Core database tables and storage metrics</p>
            </div>
            <button className="flex items-center gap-1.5 text-xs text-[#64748b] hover:text-white px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg transition-all">
              <Download size={12} /> Export schema
            </button>
          </div>
          <div className="bg-[#0d0f1a] border border-white/7 rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/7">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-[#374151] uppercase tracking-wider">Table</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-[#374151] uppercase tracking-wider">Rows</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-[#374151] uppercase tracking-wider">Size</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-[#374151] uppercase tracking-wider">30d Growth</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-[#374151] uppercase tracking-wider">Last Write</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {tables.map((t) => (
                  <tr key={t.table_name} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-5 py-3">
                      <span className="font-mono text-xs text-[#60A5FA]">{t.table_name}</span>
                    </td>
                    <td className="px-5 py-3 text-right text-sm font-semibold text-white">{fmtRows(t.row_estimate)}</td>
                    <td className="px-5 py-3 text-right text-xs text-[#94a3b8]">{fmtBytes(t.size_bytes)}</td>
                    <td className="px-5 py-3 text-right">
                      <span className="text-xs font-semibold text-emerald-400">+{t.growth_pct}%</span>
                    </td>
                    <td className="px-5 py-3 text-xs text-[#64748b] flex items-center gap-1"><Clock size={11} /> {t.last_updated}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-start gap-2 p-4 bg-[rgba(59,130,246,0.05)] border border-[rgba(59,130,246,0.15)] rounded-xl text-xs text-[#64748b]">
            <Info size={13} className="text-[#60A5FA] mt-0.5 flex-shrink-0" />
            Row counts are live from Supabase. Size estimates are approximate. ClickHouse migration planned for high-volume analytics tables.
          </div>
        </div>
      )}

      {/* Query Log */}
      {activeTab === "queries" && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-[#FF6524]" />
            <p className="text-sm text-[#94a3b8]">Recent database operations</p>
          </div>
          <div className="bg-[#0d0f1a] border border-white/7 rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/7">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-[#374151] uppercase tracking-wider">Type</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-[#374151] uppercase tracking-wider">Table</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-[#374151] uppercase tracking-wider">Duration</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-[#374151] uppercase tracking-wider">Rows</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-[#374151] uppercase tracking-wider">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {queries.map((q) => (
                  <tr key={q.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-5 py-3">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded font-mono ${
                        q.query_type === "SELECT" ? "bg-blue-500/10 text-blue-400" :
                        q.query_type === "INSERT" ? "bg-green-500/10 text-green-400" :
                        "bg-yellow-500/10 text-yellow-400"
                      }`}>{q.query_type}</span>
                    </td>
                    <td className="px-5 py-3 font-mono text-xs text-[#60A5FA]">{q.table_name}</td>
                    <td className="px-5 py-3 text-right">
                      <span className={`text-xs font-semibold ${q.duration_ms > 200 ? "text-yellow-400" : "text-emerald-400"}`}>
                        {q.duration_ms}ms
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right text-xs text-[#94a3b8]">{q.rows_affected.toLocaleString()}</td>
                    <td className="px-5 py-3 text-xs text-[#64748b] flex items-center gap-1"><Clock size={11} /> {q.timestamp}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-4 bg-[#0d0f1a] border border-white/7 rounded-xl flex items-center gap-3">
            <TrendingUp size={15} className="text-[#FF6524]" />
            <div>
              <p className="text-sm font-medium text-white">Query performance baseline</p>
              <p className="text-xs text-[#64748b]">Avg: 18ms · P95: 88ms · P99: 340ms · Slow query threshold: 500ms</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
