"use client";

import { useState } from "react";
import { AppLayout } from "@/components/app-layout";
import { AlertCircle, CheckCircle2, Cpu } from "lucide-react";

/* ── types ─────────────────────────────────────────────────────── */
interface Provider { name: string; status: "active" | "fallback" | "disabled"; priority: number; models: string[]; latency: string; calls: number; color: string; glow: string; }
interface RequestLog { id: string; model: string; product: string; tokens: number; latency: string; status: "ok" | "error" | "fallback"; time: string; }

/* ── data ───────────────────────────────────────────────────────── */
const PROVIDERS: Provider[] = [
  {
    name: "Groq", status: "active", priority: 1, latency: "220ms", calls: 3084,
    models: ["llama3-70b-8192", "llama3-8b-8192", "mixtral-8x7b-32768", "gemma-7b-it"],
    color: "text-violet-light", glow: "ring-violet/30 bg-violet/10",
  },
  {
    name: "OpenRouter", status: "active", priority: 2, latency: "480ms", calls: 241,
    models: ["openai/gpt-4o", "anthropic/claude-3.5-sonnet", "meta-llama/llama-3.1-70b"],
    color: "text-pink-400", glow: "ring-pink-400/30 bg-pink-400/10",
  },
  {
    name: "Gemini", status: "fallback", priority: 3, latency: "560ms", calls: 54,
    models: ["gemini-1.5-pro", "gemini-1.5-flash", "gemini-pro"],
    color: "text-blue-400", glow: "ring-blue-400/30 bg-blue-400/10",
  },
  {
    name: "OpenAI", status: "fallback", priority: 4, latency: "780ms", calls: 88,
    models: ["gpt-4o", "gpt-4o-mini", "gpt-3.5-turbo"],
    color: "text-cyan-400", glow: "ring-cyan-500/30 bg-cyan-500/10",
  },
  {
    name: "Anthropic", status: "fallback", priority: 5, latency: "920ms", calls: 12,
    models: ["claude-3-5-sonnet-20241022", "claude-3-haiku-20240307"],
    color: "text-amber-400", glow: "ring-amber-400/30 bg-amber-400/10",
  },
  {
    name: "Ollama", status: "disabled", priority: 6, latency: "—", calls: 0,
    models: ["llama3", "mistral", "codellama"],
    color: "text-[#374151]", glow: "ring-white/10 bg-white/[0.03]",
  },
];

const REQUEST_LOG: RequestLog[] = [
  { id: "req_8f2a", model: "llama3-70b-8192",    product: "REACH",   tokens: 1842, latency: "312ms", status: "ok",       time: "3s ago"   },
  { id: "req_7e1b", model: "llama3-8b-8192",     product: "VOICE",   tokens: 920,  latency: "98ms",  status: "ok",       time: "8s ago"   },
  { id: "req_6d9c", model: "mixtral-8x7b-32768", product: "REACH",   tokens: 3401, latency: "340ms", status: "ok",       time: "15s ago"  },
  { id: "req_5c8d", model: "llama3-70b-8192",    product: "CORE",    tokens: 512,  latency: "290ms", status: "ok",       time: "24s ago"  },
  { id: "req_4b7e", model: "gpt-4o-mini",        product: "VOICE",   tokens: 2100, latency: "820ms", status: "fallback", time: "38s ago"  },
  { id: "req_3a6f", model: "llama3-70b-8192",    product: "REACH",   tokens: 1240, latency: "—",     status: "error",    time: "52s ago"  },
  { id: "req_2f5g", model: "gemma-7b-it",        product: "ACADEMY", tokens: 640,  latency: "74ms",  status: "ok",       time: "1m ago"   },
  { id: "req_1e4h", model: "llama3-8b-8192",     product: "REACH",   tokens: 380,  latency: "88ms",  status: "ok",       time: "2m ago"   },
];

const ROUTING_RULES = [
  { product: "REACH",   strategy: "Groq-first",    fallback: "OpenRouter", maxTokens: "8192",  temperature: "0.7" },
  { product: "VOICE",   strategy: "Groq-first",    fallback: "Anthropic",  maxTokens: "4096",  temperature: "0.9" },
  { product: "ACADEMY", strategy: "Groq-fast",     fallback: "Gemini",     maxTokens: "4096",  temperature: "0.5" },
  { product: "OPS",     strategy: "Groq-first",    fallback: "OpenRouter", maxTokens: "8192",  temperature: "0.3" },
  { product: "ZURIA",   strategy: "Gemini-first",  fallback: "Groq",       maxTokens: "8192",  temperature: "0.8" },
  { product: "CORE",    strategy: "Auto-select",   fallback: "OpenRouter", maxTokens: "32768", temperature: "0.2" },
];

const USAGE_BARS = [
  { label: "REACH",   pct: 72, calls: 2284 },
  { label: "VOICE",   pct: 18, calls: 570  },
  { label: "ACADEMY", pct: 5,  calls: 158  },
  { label: "OPS",     pct: 3,  calls: 95   },
  { label: "CORE",    pct: 2,  calls: 63   },
];

/* ── subcomponents ───────────────────────────────────────────────── */
function ProviderCard({ p }: { p: Provider }) {
  const statusBadge = {
    active:   "bg-emerald/10 text-emerald",
    fallback: "bg-amber-400/10 text-amber-400",
    disabled: "bg-red-400/10 text-red-400",
  }[p.status];

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-[#111624] p-5">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className={`flex h-10 w-10 items-center justify-center rounded-xl ring-1 ${p.glow}`}>
            <Cpu className={`h-5 w-5 ${p.color}`} />
          </div>
          <div>
            <p className="font-semibold text-white">{p.name}</p>
            <p className="text-[10px] text-[#374151]">Priority {p.priority}</p>
          </div>
        </div>
        <span className={`rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${statusBadge}`}>
          {p.status}
        </span>
      </div>
      <div className="mt-4 flex items-center gap-4 text-center">
        <div className="flex-1 rounded-xl bg-white/[0.03] py-2">
          <p className="text-lg font-bold text-white">{p.calls.toLocaleString()}</p>
          <p className="text-[9px] text-[#374151]">Calls today</p>
        </div>
        <div className="flex-1 rounded-xl bg-white/[0.03] py-2">
          <p className="text-lg font-bold text-white">{p.latency}</p>
          <p className="text-[9px] text-[#374151]">Avg latency</p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {p.models.map((m) => (
          <span key={m} className="rounded-lg bg-white/[0.03] px-2 py-0.5 font-mono text-[9px] text-[#374151]">{m}</span>
        ))}
      </div>
    </div>
  );
}

function LogRow({ r }: { r: RequestLog }) {
  const statusConfig = {
    ok:       { icon: <CheckCircle2 className="h-3.5 w-3.5 text-emerald" />,    badge: "bg-emerald/10 text-emerald"     },
    error:    { icon: <AlertCircle  className="h-3.5 w-3.5 text-red-400" />,    badge: "bg-red-400/10 text-red-400"    },
    fallback: { icon: <AlertCircle  className="h-3.5 w-3.5 text-amber-400" />,  badge: "bg-amber-400/10 text-amber-400" },
  }[r.status];

  return (
    <tr className="border-b border-white/[0.03] hover:bg-white/[0.015] transition-colors">
      <td className="py-2.5 pl-3 font-mono text-[11px] text-[#374151]">{r.id}</td>
      <td className="py-2.5 font-mono text-[11px] text-slate-300">{r.model}</td>
      <td className="py-2.5">
        <span className="rounded-md bg-white/[0.04] px-1.5 py-0.5 text-[10px] text-[#64748b]">{r.product}</span>
      </td>
      <td className="py-2.5 text-[11px] text-[#64748b]">{r.tokens.toLocaleString()}</td>
      <td className="py-2.5 text-[11px] text-[#64748b]">{r.latency}</td>
      <td className="py-2.5">{statusConfig.icon}</td>
      <td className="py-2.5 pr-3 text-[10px] text-[#374151]">{r.time}</td>
    </tr>
  );
}

/* ── page ─────────────────────────────────────────────────────────── */
export default function AiPage() {
  const [tab, setTab] = useState<"providers" | "routing" | "log">("providers");

  const tabs = [
    { key: "providers", label: "Providers" },
    { key: "routing",   label: "Routing Rules" },
    { key: "log",       label: "Request Log" },
  ] as const;

  return (
    <AppLayout
      title="AI Control"
      description="Provider orchestration, model routing, and inference monitoring"
      actions={
        <div className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald animate-pulse" />
          <span className="text-[11px] text-[#64748b]">3,184 calls today</span>
        </div>
      }
    >
      {/* Summary stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        {[
          { label: "Total Calls",     value: "3,479",  sub: "today" },
          { label: "Tokens Used",     value: "5.2M",   sub: "today" },
          { label: "Avg Latency",     value: "248ms",  sub: "p50"   },
          { label: "Error Rate",      value: "0.3%",   sub: "last 1h" },
        ].map(({ label, value, sub }) => (
          <div key={label} className="rounded-2xl border border-white/[0.06] bg-[#0d0f1a] px-5 py-4">
            <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-[#374151]">{label}</p>
            <p className="mt-1.5 text-2xl font-bold text-white">{value}</p>
            <p className="text-[10px] text-[#374151]">{sub}</p>
          </div>
        ))}
      </div>

      {/* Usage by product */}
      <div className="mt-6 rounded-2xl border border-white/[0.06] bg-[#0d0f1a] p-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#64748b]">Usage by Product</p>
        <div className="mt-4 space-y-3">
          {USAGE_BARS.map(({ label, pct, calls }) => (
            <div key={label}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-medium text-slate-300">{label}</span>
                <span className="text-[11px] text-[#374151]">{calls.toLocaleString()} calls ({pct}%)</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-violet to-violet-light"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="mt-6 rounded-2xl border border-white/[0.06] bg-[#0d0f1a]">
        {/* Tab bar */}
        <div className="flex border-b border-white/[0.06] px-5 pt-4">
          {tabs.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`mr-6 pb-3 text-[11px] font-semibold uppercase tracking-[0.12em] transition-all border-b-2 ${
                tab === key
                  ? "border-violet-light text-violet-light"
                  : "border-transparent text-[#374151] hover:text-[#64748b]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="p-5">
          {/* Providers tab */}
          {tab === "providers" && (
            <div className="grid gap-4 lg:grid-cols-3">
              {PROVIDERS.map((p) => <ProviderCard key={p.name} p={p} />)}
            </div>
          )}

          {/* Routing rules tab */}
          {tab === "routing" && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.05]">
                    {["Product", "Strategy", "Fallback", "Max Tokens", "Temperature"].map((h) => (
                      <th key={h} className="pb-3 text-left text-[10px] font-medium uppercase tracking-[0.12em] text-[#374151]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.03]">
                  {ROUTING_RULES.map((r) => (
                    <tr key={r.product} className="hover:bg-white/[0.015] transition-colors">
                      <td className="py-3 font-medium text-white">{r.product}</td>
                      <td className="py-3">
                        <span className="rounded-md bg-violet/10 px-2 py-0.5 text-[10px] font-medium text-violet-light">{r.strategy}</span>
                      </td>
                      <td className="py-3 text-[12px] text-[#64748b]">{r.fallback}</td>
                      <td className="py-3 font-mono text-[12px] text-[#64748b]">{r.maxTokens}</td>
                      <td className="py-3 font-mono text-[12px] text-[#64748b]">{r.temperature}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Request log tab */}
          {tab === "log" && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/[0.05]">
                    {["Request ID", "Model", "Product", "Tokens", "Latency", "Status", "Time"].map((h) => (
                      <th key={h} className="pb-3 text-left text-[10px] font-medium uppercase tracking-[0.12em] text-[#374151]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {REQUEST_LOG.map((r) => <LogRow key={r.id} r={r} />)}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
