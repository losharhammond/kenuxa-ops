"use client";

import { AppLayout } from "@/components/app-layout";
import {
  BrainCircuit, Database, GitBranch, Globe,
  KeyRound, Network, Shield, Users,
  ArrowUpRight, CheckCircle2, Clock, AlertCircle, Coins,
} from "lucide-react";

/* ── tiny helpers ─────────────────────────────────────────────── */
function StatCard({
  label, value, sub, icon: Icon, color = "violet",
}: {
  label: string; value: string; sub: string;
  icon: React.ElementType; color?: "violet" | "cyan" | "emerald" | "amber";
}) {
  const palette = {
    violet: { bg: "bg-violet/10", ring: "ring-violet/20", text: "text-violet-light", glow: "#7c3aed" },
    cyan:   { bg: "bg-cyan-500/10", ring: "ring-cyan-500/20", text: "text-cyan-400", glow: "#06b6d4" },
    emerald:{ bg: "bg-emerald/10", ring: "ring-emerald/20", text: "text-emerald", glow: "#10b981" },
    amber:  { bg: "bg-amber-500/10", ring: "ring-amber-500/20", text: "text-amber-400", glow: "#f59e0b" },
  }[color];

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-[#0d0f1a] p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.15em] text-[#64748b]">{label}</p>
          <p className="mt-2 text-3xl font-bold text-white">{value}</p>
          <p className="mt-0.5 text-[11px] text-[#374151]">{sub}</p>
        </div>
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${palette.bg} ring-1 ${palette.ring}`}>
          <Icon className={`h-5 w-5 ${palette.text}`} />
        </div>
      </div>
    </div>
  );
}

function SystemCard({
  name, status, latency, requests, health,
}: {
  name: string; status: "online" | "degraded" | "offline";
  latency: string; requests: string; health: number;
}) {
  const statusColors = {
    online:   { dot: "bg-emerald", text: "text-emerald", label: "Online" },
    degraded: { dot: "bg-amber-400", text: "text-amber-400", label: "Degraded" },
    offline:  { dot: "bg-red-500", text: "text-red-400", label: "Offline" },
  }[status];

  return (
    <div className="rounded-xl border border-white/[0.06] bg-[#111624] p-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-white">{name}</span>
        <div className="flex items-center gap-1.5">
          <span className={`h-1.5 w-1.5 rounded-full ${statusColors.dot}`} />
          <span className={`text-[11px] font-medium ${statusColors.text}`}>{statusColors.label}</span>
        </div>
      </div>
      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
        <div
          className={`h-full rounded-full ${health > 90 ? "bg-emerald" : health > 70 ? "bg-amber-400" : "bg-red-500"}`}
          style={{ width: `${health}%` }}
        />
      </div>
      <div className="mt-2 flex items-center justify-between text-[10px] text-[#374151]">
        <span>p99 {latency}</span>
        <span>{requests} req/min</span>
      </div>
    </div>
  );
}

function EventRow({ type, source, time, ok }: { type: string; source: string; time: string; ok: boolean }) {
  return (
    <div className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-white/[0.02] transition-colors">
      <div className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${ok ? "bg-emerald" : "bg-red-400"}`} />
      <span className="flex-1 truncate text-[12px] font-mono text-slate-300">{type}</span>
      <span className="text-[11px] text-[#374151]">{source}</span>
      <span className="text-[10px] text-[#374151]">{time}</span>
    </div>
  );
}

const SYSTEMS = [
  { name: "Auth Gateway",     status: "online",   latency: "12ms",  requests: "847",  health: 99 },
  { name: "AI Orchestrator",  status: "online",   latency: "340ms", requests: "124",  health: 97 },
  { name: "Memory Engine",    status: "online",   latency: "28ms",  requests: "312",  health: 95 },
  { name: "Event Bus",        status: "online",   latency: "4ms",   requests: "2.4k", health: 100 },
  { name: "Knowledge Graph",  status: "degraded", latency: "180ms", requests: "56",   health: 78 },
  { name: "Vector DB",        status: "online",   latency: "45ms",  requests: "203",  health: 93 },
] as const;

const RECENT_EVENTS = [
  { type: "auth.session.created",         source: "REACH",   time: "2s ago",   ok: true  },
  { type: "ai.inference.completed",        source: "VOICE",   time: "5s ago",   ok: true  },
  { type: "memory.record.stored",          source: "REACH",   time: "8s ago",   ok: true  },
  { type: "graph.node.created",            source: "CORE",    time: "14s ago",  ok: true  },
  { type: "event.webhook.delivery.failed", source: "OPS",     time: "22s ago",  ok: false },
  { type: "org.member.invited",            source: "CORE",    time: "1m ago",   ok: true  },
  { type: "ai.model.fallback.triggered",   source: "VOICE",   time: "2m ago",   ok: false },
  { type: "memory.vector.indexed",         source: "REACH",   time: "3m ago",   ok: true  },
];

const AI_ACTIVITY = [
  { model: "llama3-70b-8192",    provider: "Groq",      calls: 1847, tokens: "2.4M", latency: "340ms" },
  { model: "llama3-8b-8192",     provider: "Groq",      calls: 924,  tokens: "890K", latency: "120ms" },
  { model: "mixtral-8x7b-32768", provider: "Groq",      calls: 312,  tokens: "1.1M", latency: "280ms" },
  { model: "gpt-4o-mini",        provider: "OpenAI",    calls: 88,   tokens: "340K", latency: "850ms" },
];

export default function DashboardPage() {
  return (
    <AppLayout
      title="Command Center"
      description="Real-time system health and infrastructure overview"
      actions={
        <button className="flex items-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.03] px-3 py-1.5 text-[11px] font-medium text-[#64748b] hover:text-slate-300 transition-colors">
          <Clock className="h-3 w-3" />
          Last 24 hours
        </button>
      }
    >
      {/* Stats row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="AI Requests"    value="3,171"   sub="+18% vs yesterday" icon={BrainCircuit} color="violet"  />
        <StatCard label="Active Sessions" value="1,284"  sub="across 3 products"  icon={Shield}      color="cyan"   />
        <StatCard label="Memory Records" value="48.7K"   sub="vectorised + typed"  icon={Database}   color="emerald"/>
        <StatCard label="Events / min"   value="2,401"   sub="event bus throughput" icon={GitBranch}  color="amber"  />
      </div>

      {/* KENUX economy banner */}
      <div className="mt-4 rounded-2xl border border-amber-500/20 bg-amber-500/[0.04] p-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/15 ring-1 ring-amber-500/25">
              <Coins className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-amber-400/80">KENUX Economy</p>
              <p className="text-lg font-bold text-white">284,910 <span className="text-[12px] font-normal text-[#64748b]">KENUX circulating</span></p>
            </div>
          </div>
          <div className="flex items-center gap-8">
            {[
              { label: "Transactions today", value: "1,847" },
              { label: "AI compute charged", value: "12,400 KENUX" },
              { label: "Active wallets",      value: "3" },
            ].map(({ label, value }) => (
              <div key={label} className="text-center">
                <p className="text-[13px] font-bold text-white">{value}</p>
                <p className="text-[10px] text-[#374151]">{label}</p>
              </div>
            ))}
          </div>
          <a href="/wallet" className="flex items-center gap-1.5 text-[11px] font-medium text-amber-400 hover:underline">
            View wallet <ArrowUpRight className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>

      {/* Middle row */}
      <div className="mt-6 grid gap-6 lg:grid-cols-3">

        {/* System health */}
        <div className="lg:col-span-1 rounded-2xl border border-white/[0.06] bg-[#0d0f1a] p-5">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#64748b]">System Health</p>
            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald animate-pulse" />
              <span className="text-[10px] text-[#374151]">All monitored</span>
            </div>
          </div>
          <div className="mt-4 space-y-3">
            {SYSTEMS.map((s) => <SystemCard key={s.name} {...s} />)}
          </div>
        </div>

        {/* Event feed */}
        <div className="lg:col-span-2 rounded-2xl border border-white/[0.06] bg-[#0d0f1a] p-5">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#64748b]">Live Event Feed</p>
            <span className="rounded-full bg-emerald/10 px-2 py-0.5 text-[9px] font-bold text-emerald">LIVE</span>
          </div>
          <div className="mt-4 space-y-0.5">
            {RECENT_EVENTS.map((e, i) => <EventRow key={i} {...e} />)}
          </div>
          <button className="mt-3 w-full rounded-xl border border-white/[0.06] py-2 text-[11px] text-[#374151] hover:text-slate-400 hover:bg-white/[0.02] transition-colors">
            View all events →
          </button>
        </div>
      </div>

      {/* AI Activity table */}
      <div className="mt-6 rounded-2xl border border-white/[0.06] bg-[#0d0f1a] p-5">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#64748b]">AI Model Activity — Today</p>
          <div className="flex items-center gap-1 text-[11px] text-violet-light hover:underline cursor-pointer">
            <span>Full report</span><ArrowUpRight className="h-3 w-3" />
          </div>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.05]">
                {["Model", "Provider", "Calls", "Tokens", "Avg Latency"].map((h) => (
                  <th key={h} className="pb-3 text-left text-[10px] font-medium uppercase tracking-[0.12em] text-[#374151]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.03]">
              {AI_ACTIVITY.map((row) => (
                <tr key={row.model} className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-3 font-mono text-[12px] text-slate-300">{row.model}</td>
                  <td className="py-3">
                    <span className="rounded-md bg-violet/10 px-2 py-0.5 text-[10px] font-medium text-violet-light">{row.provider}</span>
                  </td>
                  <td className="py-3 text-[12px] text-white font-medium">{row.calls.toLocaleString()}</td>
                  <td className="py-3 text-[12px] text-[#64748b]">{row.tokens}</td>
                  <td className="py-3 text-[12px] text-[#64748b]">{row.latency}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bottom row */}
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* Quick stats */}
        <div className="rounded-2xl border border-white/[0.06] bg-[#0d0f1a] p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#64748b]">Platform Summary</p>
          <div className="mt-4 space-y-3">
            {[
              { label: "Organizations",   value: "3",     icon: Users },
              { label: "API Keys Active", value: "12",    icon: KeyRound },
              { label: "Integrations",    value: "7",     icon: Globe },
              { label: "Active Workflows",value: "4",     icon: Network },
              { label: "Graph Nodes",     value: "2,847", icon: Network },
            ].map(({ label, value, icon: Icon }) => (
              <div key={label} className="flex items-center justify-between rounded-xl bg-white/[0.02] px-3 py-2">
                <div className="flex items-center gap-2.5">
                  <Icon className="h-3.5 w-3.5 text-[#374151]" />
                  <span className="text-[12px] text-[#64748b]">{label}</span>
                </div>
                <span className="text-sm font-semibold text-white">{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Uptime */}
        <div className="rounded-2xl border border-white/[0.06] bg-[#0d0f1a] p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#64748b]">30-Day Uptime</p>
          <div className="mt-4 space-y-3">
            {[
              { name: "Auth Gateway",    uptime: 99.98 },
              { name: "AI Orchestrator", uptime: 99.71 },
              { name: "Memory Engine",   uptime: 99.94 },
              { name: "Event Bus",       uptime: 100.00 },
              { name: "Knowledge Graph", uptime: 98.12 },
            ].map(({ name, uptime }) => (
              <div key={name}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] text-[#64748b]">{name}</span>
                  <span className={`text-[11px] font-semibold ${uptime > 99.9 ? "text-emerald" : uptime > 99 ? "text-amber-400" : "text-red-400"}`}>
                    {uptime.toFixed(2)}%
                  </span>
                </div>
                <div className="h-1 w-full overflow-hidden rounded-full bg-white/[0.06]">
                  <div
                    className={`h-full rounded-full ${uptime > 99.9 ? "bg-emerald" : uptime > 99 ? "bg-amber-400" : "bg-red-400"}`}
                    style={{ width: `${uptime}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent alerts */}
        <div className="rounded-2xl border border-white/[0.06] bg-[#0d0f1a] p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#64748b]">Alerts</p>
          <div className="mt-4 space-y-2">
            {[
              { msg: "Knowledge Graph index rebuild pending",   level: "warn",  time: "12m ago" },
              { msg: "Webhook delivery failure: OPS → Slack",  level: "error", time: "22m ago" },
              { msg: "AI model fallback triggered on VOICE",   level: "warn",  time: "1h ago"  },
              { msg: "Memory vector reindex completed",         level: "ok",    time: "2h ago"  },
              { msg: "New org 'Accra FinTech' onboarded",      level: "ok",    time: "3h ago"  },
            ].map(({ msg, level, time }, i) => (
              <div key={i} className="flex gap-2.5 rounded-xl bg-white/[0.02] px-3 py-2.5">
                {level === "ok"    && <CheckCircle2 className="mt-px h-3.5 w-3.5 flex-shrink-0 text-emerald" />}
                {level === "warn"  && <AlertCircle  className="mt-px h-3.5 w-3.5 flex-shrink-0 text-amber-400" />}
                {level === "error" && <AlertCircle  className="mt-px h-3.5 w-3.5 flex-shrink-0 text-red-400" />}
                <div className="min-w-0">
                  <p className="text-[11px] text-slate-300 leading-snug">{msg}</p>
                  <p className="mt-0.5 text-[10px] text-[#374151]">{time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
