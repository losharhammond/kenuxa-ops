"use client";

import { useState } from "react";
import { AppLayout } from "@/components/app-layout";
import {
  Database, Search, Plus, Tag, Clock,
  Brain, FileText, Layers, X,
} from "lucide-react";

/* ── types ────────────────────────────────────────────────────────── */
type MemType = "all" | "episodic" | "semantic" | "procedural" | "working";

interface MemRecord {
  id: string; type: Exclude<MemType, "all">; content: string;
  tags: string[]; product: string; score?: number; created: string;
}

const RECORDS: MemRecord[] = [
  { id: "mem_9f2a1b", type: "semantic",   created: "2 hours ago",   product: "REACH",   score: 0.94, tags: ["fintech","ghana","growth"],       content: "FinTech sector in Ghana is growing at 34% CAGR driven by mobile money adoption and regulatory sandboxes established by Bank of Ghana." },
  { id: "mem_8e1c2d", type: "episodic",   created: "4 hours ago",   product: "REACH",   score: 0.87, tags: ["session","analyst","investment"],   content: "User session: Analyst queried African market intelligence for Q2 2026 investment thesis. Focus on East Africa logistics and West Africa fintech." },
  { id: "mem_7d0b3e", type: "procedural", created: "1 day ago",     product: "REACH",   score: 0.91, tags: ["workflow","pipeline"],             content: "Workflow for myth analysis: 1) Collect news signals 2) Cross-reference graph 3) Apply contradiction detection 4) Generate forecast." },
  { id: "mem_6c9a4f", type: "working",    created: "10 minutes ago", product: "VOICE",   score: 0.76, tags: ["voice","agri-tech","rwanda"],      content: "Active context: VOICE conversation thread with entrepreneur building agri-tech platform in Rwanda. Discussing land ownership constraints." },
  { id: "mem_5b8e5g", type: "semantic",   created: "3 days ago",    product: "REACH",   score: 0.98, tags: ["m-pesa","safaricom","kenya"],       content: "Safaricom M-Pesa handles $314B in annual transaction volume, representing 87% of Kenya's mobile money market share as of 2025." },
  { id: "mem_4a7f6h", type: "episodic",   created: "6 hours ago",   product: "CORE",    tags: ["graph","enrichment","batch"],       content: "Graph enrichment job completed: 847 company nodes updated, 234 new relationship edges inferred from news corpus." },
];

const TYPE_COLORS: Record<Exclude<MemType,"all">, string> = {
  episodic:   "bg-cyan-500/10 text-cyan-400 ring-cyan-500/20",
  semantic:   "bg-violet/10 text-violet-light ring-violet/20",
  procedural: "bg-amber-400/10 text-amber-400 ring-amber-400/20",
  working:    "bg-emerald/10 text-emerald ring-emerald/20",
};

const FILTER_TYPES = [
  { key: "all"        as MemType, label: "All Records",  icon: Database },
  { key: "episodic"   as MemType, label: "Episodic",     icon: Clock    },
  { key: "semantic"   as MemType, label: "Semantic",     icon: Brain    },
  { key: "procedural" as MemType, label: "Procedural",   icon: Layers   },
  { key: "working"    as MemType, label: "Working",      icon: FileText },
];

function MemCard({ r }: { r: MemRecord }) {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-[#111624] p-5 hover:border-white/[0.1] transition-colors">
      <div className="flex items-center gap-2 flex-wrap">
        <span className={`rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ring-1 ${TYPE_COLORS[r.type]}`}>{r.type}</span>
        <span className="rounded-md bg-white/[0.03] px-1.5 py-0.5 text-[9px] text-[#374151]">{r.product}</span>
        {r.score !== undefined && <span className="text-[10px] text-[#374151]">sim {(r.score * 100).toFixed(0)}%</span>}
      </div>
      <p className="mt-3 text-[13px] leading-relaxed text-slate-300">{r.content}</p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {r.tags.map((t) => (
          <span key={t} className="flex items-center gap-1 rounded-lg bg-white/[0.03] px-2 py-0.5 text-[10px] text-[#374151]">
            <Tag className="h-2.5 w-2.5" />{t}
          </span>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between border-t border-white/[0.05] pt-3">
        <p className="font-mono text-[10px] text-[#374151]">{r.id}</p>
        <p className="text-[10px] text-[#374151]">{r.created}</p>
      </div>
    </div>
  );
}

export default function MemoryPage() {
  const [activeType, setActiveType] = useState<MemType>("all");
  const [search, setSearch]         = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm]             = useState({ type: "semantic", content: "", tags: "", product: "REACH" });

  const filtered = RECORDS.filter((r) => {
    if (activeType !== "all" && r.type !== activeType) return false;
    if (search && !r.content.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <AppLayout
      title="Memory Engine"
      description="Typed memory records with vector search and semantic retrieval"
      actions={
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 rounded-xl bg-violet px-4 py-2 text-[12px] font-semibold text-white hover:bg-violet/90 transition-colors">
          <Plus className="h-3.5 w-3.5" />New Memory
        </button>
      }
    >
      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        {[{ l: "Total Records", v: "48,712" }, { l: "Vectorised", v: "47,381" }, { l: "Avg Tokens", v: "284" }, { l: "Retrieval p50", v: "28ms" }].map(({ l, v }) => (
          <div key={l} className="rounded-2xl border border-white/[0.06] bg-[#0d0f1a] px-5 py-4">
            <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-[#374151]">{l}</p>
            <p className="mt-1.5 text-2xl font-bold text-white">{v}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 flex gap-6">
        {/* Filter sidebar */}
        <div className="w-48 flex-shrink-0 space-y-1">
          {FILTER_TYPES.map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => setActiveType(key)}
              className={`w-full flex items-center justify-between rounded-xl px-3 py-2.5 transition-all ${activeType === key ? "bg-violet/15 text-violet-light" : "text-[#64748b] hover:bg-white/[0.03] hover:text-slate-300"}`}>
              <div className="flex items-center gap-2.5">
                <Icon className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="text-[12px] font-medium">{label}</span>
              </div>
              <span className="text-[10px] text-[#374151]">{key === "all" ? RECORDS.length : RECORDS.filter((r) => r.type === key).length}</span>
            </button>
          ))}
        </div>

        {/* Main */}
        <div className="flex-1 min-w-0">
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#374151]" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Semantic search across memory records…"
              className="w-full rounded-xl border border-white/[0.07] bg-[#111624] py-2.5 pl-9 pr-4 text-[13px] text-slate-300 placeholder:text-[#374151] focus:border-violet/40 focus:outline-none" />
          </div>
          <div className="space-y-3">
            {filtered.map((r) => <MemCard key={r.id} r={r} />)}
            {filtered.length === 0 && (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-white/[0.06] bg-[#0d0f1a] py-16">
                <Database className="h-8 w-8 text-[#374151]" />
                <p className="mt-3 text-sm text-[#374151]">No records found</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-white/[0.08] bg-[#0d0f1a] p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white">Create Memory Record</h2>
              <button onClick={() => setShowCreate(false)} className="text-[#374151] hover:text-slate-300 transition-colors"><X className="h-4 w-4" /></button>
            </div>
            <div className="mt-5 space-y-4">
              <div>
                <label className="block text-[11px] font-medium text-[#64748b] mb-1.5">Type</label>
                <div className="grid grid-cols-2 gap-2">
                  {(["semantic","episodic","procedural","working"] as const).map((t) => (
                    <button key={t} onClick={() => setForm((f) => ({ ...f, type: t }))}
                      className={`rounded-xl border px-3 py-2 text-[11px] font-medium capitalize transition-all ${form.type === t ? "border-violet/40 bg-violet/10 text-violet-light" : "border-white/[0.06] text-[#374151] hover:border-white/[0.1]"}`}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-medium text-[#64748b] mb-1.5">Content</label>
                <textarea value={form.content} onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))} rows={4} placeholder="Memory content to store and vectorise…"
                  className="w-full rounded-xl border border-white/[0.07] bg-[#111624] px-4 py-3 text-[13px] text-slate-300 placeholder:text-[#374151] focus:border-violet/40 focus:outline-none resize-none" />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-[#64748b] mb-1.5">Tags</label>
                <input value={form.tags} onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))} placeholder="fintech, ghana, market"
                  className="w-full rounded-xl border border-white/[0.07] bg-[#111624] px-4 py-2.5 text-[13px] text-slate-300 placeholder:text-[#374151] focus:border-violet/40 focus:outline-none" />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-[#64748b] mb-1.5">Product</label>
                <select value={form.product} onChange={(e) => setForm((f) => ({ ...f, product: e.target.value }))}
                  className="w-full rounded-xl border border-white/[0.07] bg-[#111624] px-4 py-2.5 text-[13px] text-slate-300 focus:border-violet/40 focus:outline-none">
                  {["CORE","REACH","VOICE","ACADEMY","OPS"].map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>
            <div className="mt-6 flex gap-3">
              <button onClick={() => setShowCreate(false)} className="flex-1 rounded-xl border border-white/[0.07] py-2.5 text-[12px] font-medium text-[#64748b] hover:text-slate-300 transition-colors">Cancel</button>
              <button onClick={() => setShowCreate(false)} className="flex-1 rounded-xl bg-violet py-2.5 text-[12px] font-semibold text-white hover:bg-violet/90 transition-colors">Store Memory</button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
