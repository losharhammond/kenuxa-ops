"use client";

import { useState } from "react";
import { AppLayout } from "@/components/app-layout";
import { TrendingUp, TrendingDown } from "lucide-react";

type Period = "24h" | "7d" | "30d";

/* Simple bar chart using div widths */
function MiniBar({ value, max, color = "bg-violet" }: { value: number; max: number; color?: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${(value / max) * 100}%` }} />
      </div>
      <span className="text-[11px] text-[#374151] w-10 text-right">{value.toLocaleString()}</span>
    </div>
  );
}

/* Sparkline using SVG */
function Sparkline({ data, color = "#7c3aed" }: { data: number[]; color?: string }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const w = 80; const h = 24;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * h}`).join(" ");
  return (
    <svg width={w} height={h} className="overflow-visible">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const AI_DAILY = [120,180,240,310,280,350,290,400,380,420,390,460,440,500,480,520,510,560,540,580,600,620,580,640];
const EVENT_DAILY = [1200,1400,1800,2100,1900,2400,2200,2600,2400,2800,2600,2900,2800,3100,2900,3200,3100,3400,3200,3500,3400,3600,3400,3800];

const PRODUCT_STATS = [
  { name: "REACH",   aiCalls: 2284, events: 124000, memory: 41200, sessions: 847  },
  { name: "VOICE",   aiCalls: 570,  events: 31000,  memory: 8400,  sessions: 312  },
  { name: "ACADEMY", aiCalls: 158,  events: 8400,   memory: 2100,  sessions: 84   },
  { name: "OPS",     aiCalls: 95,   events: 4100,   memory: 840,   sessions: 42   },
  { name: "CORE",    aiCalls: 63,   events: 2100,   memory: 420,   sessions: 21   },
];

const TOP_EVENTS = [
  { type: "auth.session.created",    count: 84710 },
  { type: "memory.record.stored",    count: 48200 },
  { type: "ai.inference.completed",  count: 31840 },
  { type: "graph.node.created",      count: 8470  },
  { type: "event.webhook.delivered", count: 7210  },
  { type: "org.member.action",       count: 4100  },
];

const LATENCY_BUCKETS = [
  { label: "< 50ms",      pct: 42, color: "bg-emerald" },
  { label: "50-200ms",    pct: 31, color: "bg-cyan-400" },
  { label: "200-500ms",   pct: 18, color: "bg-amber-400" },
  { label: "500ms-1s",    pct: 7,  color: "bg-orange-400" },
  { label: "> 1s",        pct: 2,  color: "bg-red-400" },
];

export default function AnalyticsPage() {
  const [period, setPeriod] = useState<Period>("24h");

  return (
    <AppLayout title="Analytics" description="System-wide performance metrics and usage intelligence"
      actions={
        <div className="flex items-center gap-1 rounded-xl border border-white/[0.07] bg-white/[0.03] p-1">
          {(["24h","7d","30d"] as Period[]).map(p=>(
            <button key={p} onClick={()=>setPeriod(p)}
              className={`rounded-lg px-3 py-1 text-[11px] font-medium transition-all ${period===p?"bg-violet text-white":"text-[#374151] hover:text-[#64748b]"}`}>
              {p}
            </button>
          ))}
        </div>
      }
    >
      {/* Top KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { l:"Total API Requests", v:"8.4M",   trend:+12.4, data:[800,900,850,1100,1000,1200,1100,1300] },
          { l:"AI Inferences",      v:"127.2K",  trend:+18.2, data:[100,130,120,150,140,160,155,180] },
          { l:"Memory Operations",  v:"48.7K",   trend:+8.1,  data:[40,45,43,48,46,50,49,53] },
          { l:"Event Throughput",   v:"2.4M",    trend:-2.3,  data:[240,230,250,220,240,210,230,200] },
        ].map(({ l, v, trend, data }) => (
          <div key={l} className="rounded-2xl border border-white/[0.06] bg-[#0d0f1a] p-5">
            <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-[#374151]">{l}</p>
            <div className="mt-2 flex items-end justify-between">
              <p className="text-2xl font-bold text-white">{v}</p>
              <Sparkline data={data} color={trend >= 0 ? "#10b981" : "#f87171"} />
            </div>
            <div className={`mt-1.5 flex items-center gap-1 text-[11px] ${trend >= 0 ? "text-emerald" : "text-red-400"}`}>
              {trend >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              <span>{trend > 0 ? "+" : ""}{trend}% vs prev period</span>
            </div>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* AI Requests over time */}
        <div className="rounded-2xl border border-white/[0.06] bg-[#0d0f1a] p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#64748b] mb-4">AI Requests — {period}</p>
          <div className="flex items-end gap-0.5 h-32">
            {AI_DAILY.slice(-24).map((v, i) => {
              const max = Math.max(...AI_DAILY);
              const h = Math.max(4, (v / max) * 100);
              return (
                <div key={i} className="group relative flex-1 flex items-end">
                  <div className="w-full rounded-t bg-violet/40 hover:bg-violet transition-colors" style={{ height: `${h}%` }} />
                  <div className="absolute bottom-full mb-1 hidden group-hover:block rounded bg-[#111624] border border-white/[0.07] px-2 py-1 text-[10px] text-white whitespace-nowrap z-10">{v}</div>
                </div>
              );
            })}
          </div>
          <div className="mt-2 flex justify-between text-[9px] text-[#374151]">
            <span>00:00</span><span>06:00</span><span>12:00</span><span>18:00</span><span>Now</span>
          </div>
        </div>

        {/* Event volume */}
        <div className="rounded-2xl border border-white/[0.06] bg-[#0d0f1a] p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#64748b] mb-4">Event Volume — {period}</p>
          <div className="flex items-end gap-0.5 h-32">
            {EVENT_DAILY.slice(-24).map((v, i) => {
              const max = Math.max(...EVENT_DAILY);
              const h = Math.max(4, (v / max) * 100);
              return (
                <div key={i} className="group relative flex-1 flex items-end">
                  <div className="w-full rounded-t bg-cyan-500/40 hover:bg-cyan-500/70 transition-colors" style={{ height: `${h}%` }} />
                </div>
              );
            })}
          </div>
          <div className="mt-2 flex justify-between text-[9px] text-[#374151]">
            <span>00:00</span><span>06:00</span><span>12:00</span><span>18:00</span><span>Now</span>
          </div>
        </div>
      </div>

      {/* Bottom grid */}
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* Usage by product */}
        <div className="rounded-2xl border border-white/[0.06] bg-[#0d0f1a] p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#64748b] mb-4">AI Usage by Product</p>
          <div className="space-y-3">
            {PRODUCT_STATS.map(({ name, aiCalls }) => (
              <div key={name}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[12px] font-medium text-slate-300">{name}</span>
                </div>
                <MiniBar value={aiCalls} max={2284} />
              </div>
            ))}
          </div>
        </div>

        {/* Top events */}
        <div className="rounded-2xl border border-white/[0.06] bg-[#0d0f1a] p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#64748b] mb-4">Top Event Types</p>
          <div className="space-y-3">
            {TOP_EVENTS.map(({ type, count }) => (
              <div key={type}>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono text-[10px] text-[#64748b] truncate">{type}</span>
                </div>
                <MiniBar value={count} max={84710} color="bg-cyan-500/60" />
              </div>
            ))}
          </div>
        </div>

        {/* Latency distribution */}
        <div className="rounded-2xl border border-white/[0.06] bg-[#0d0f1a] p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#64748b] mb-4">Response Latency Distribution</p>
          <div className="space-y-3">
            {LATENCY_BUCKETS.map(({ label, pct, color }) => (
              <div key={label}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[12px] text-[#64748b]">{label}</span>
                  <span className="text-[11px] text-[#374151]">{pct}%</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
                  <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-xl bg-white/[0.02] px-3 py-2.5">
            <p className="text-[10px] text-[#374151]">P50 / P95 / P99</p>
            <p className="mt-1 text-sm font-semibold text-white">48ms / 312ms / 820ms</p>
          </div>
        </div>
      </div>

      {/* Product comparison table */}
      <div className="mt-6 rounded-2xl border border-white/[0.06] bg-[#0d0f1a] p-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#64748b] mb-4">Product Usage Breakdown</p>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/[0.05]">
                {["Product","AI Calls","Events","Memory Ops","Sessions"].map(h=>(
                  <th key={h} className="pb-3 text-left text-[10px] font-medium uppercase tracking-[0.12em] text-[#374151]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PRODUCT_STATS.map(r=>(
                <tr key={r.name} className="border-b border-white/[0.03] hover:bg-white/[0.015] transition-colors">
                  <td className="py-3">
                    <span className="rounded-md bg-violet/10 px-2.5 py-1 text-[11px] font-bold text-violet-light">{r.name}</span>
                  </td>
                  <td className="py-3 text-[13px] font-medium text-white">{r.aiCalls.toLocaleString()}</td>
                  <td className="py-3 text-[13px] text-[#64748b]">{r.events.toLocaleString()}</td>
                  <td className="py-3 text-[13px] text-[#64748b]">{r.memory.toLocaleString()}</td>
                  <td className="py-3 text-[13px] text-[#64748b]">{r.sessions.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppLayout>
  );
}
