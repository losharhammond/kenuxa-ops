"use client";

import { useState } from "react";
import { AppLayout } from "@/components/app-layout";
import { Plus, Search, X } from "lucide-react";

type NodeType = "company" | "person" | "product" | "community" | "location" | "country" | "sector" | "event" | "technology" | "trend";

interface GraphNode {
  id: string; canonical_name: string; type: NodeType;
  tags: string[]; edge_count: number; created: string;
}

interface GraphEdge {
  id: string; from: string; to: string; relation: string; weight: number;
}

const NODE_TYPE_COLORS: Record<NodeType, string> = {
  company:   "bg-violet/10 text-violet-light ring-violet/20",
  person:    "bg-cyan-500/10 text-cyan-400 ring-cyan-500/20",
  product:   "bg-emerald/10 text-emerald ring-emerald/20",
  community: "bg-amber-400/10 text-amber-400 ring-amber-400/20",
  location:  "bg-pink-500/10 text-pink-400 ring-pink-500/20",
  country:   "bg-orange-500/10 text-orange-400 ring-orange-500/20",
  sector:    "bg-indigo-400/10 text-indigo-400 ring-indigo-400/20",
  event:     "bg-red-500/10 text-red-400 ring-red-500/20",
  technology:"bg-teal-400/10 text-teal-400 ring-teal-400/20",
  trend:     "bg-lime-400/10 text-lime-400 ring-lime-400/20",
};

const NODES: GraphNode[] = [
  { id: "n1",  canonical_name: "GTBank",            type: "company",    tags: ["banking","nigeria"],             edge_count: 24, created: "2d ago"  },
  { id: "n2",  canonical_name: "Safaricom",          type: "company",    tags: ["telco","kenya","m-pesa"],        edge_count: 31, created: "2d ago"  },
  { id: "n3",  canonical_name: "M-Pesa",             type: "product",    tags: ["fintech","mobile-money"],        edge_count: 18, created: "1d ago"  },
  { id: "n4",  canonical_name: "East Africa",        type: "location",   tags: ["region","africa"],               edge_count: 12, created: "3d ago"  },
  { id: "n5",  canonical_name: "FinTech",            type: "sector",     tags: ["finance","technology"],          edge_count: 47, created: "5d ago"  },
  { id: "n6",  canonical_name: "Bank of Ghana",      type: "company",    tags: ["central-bank","ghana","regulator"],edge_count: 15, created: "4d ago"  },
  { id: "n7",  canonical_name: "Patrick Njoroge",    type: "person",     tags: ["cbn","kenya","governor"],        edge_count: 8,  created: "3d ago"  },
  { id: "n8",  canonical_name: "Mobile Money",       type: "trend",      tags: ["fintech","payments","africa"],   edge_count: 38, created: "1d ago"  },
  { id: "n9",  canonical_name: "Lagos",              type: "location",   tags: ["city","nigeria"],                edge_count: 22, created: "2d ago"  },
  { id: "n10", canonical_name: "Ghana",              type: "country",    tags: ["west-africa"],                   edge_count: 19, created: "4d ago"  },
];

const EDGES: GraphEdge[] = [
  { id: "e1", from: "Safaricom",    to: "M-Pesa",        relation: "OPERATES",   weight: 0.98 },
  { id: "e2", from: "M-Pesa",       to: "Mobile Money",  relation: "EXEMPLIFIES", weight: 0.92 },
  { id: "e3", from: "GTBank",       to: "FinTech",       relation: "OPERATES_IN", weight: 0.88 },
  { id: "e4", from: "Bank of Ghana",to: "Ghana",         relation: "REGULATES",  weight: 0.99 },
  { id: "e5", from: "Patrick Njoroge",to:"Safaricom",    relation: "LEADS",      weight: 0.91 },
  { id: "e6", from: "East Africa",  to: "Safaricom",     relation: "CONTAINS",   weight: 0.95 },
];

const NODE_TYPES: NodeType[] = ["company","person","product","community","location","country","sector","event","technology","trend"];

export default function GraphPage() {
  const [search, setSearch]       = useState("");
  const [typeFilter, setTypeFilter] = useState<NodeType | "all">("all");
  const [showCreate, setShowCreate] = useState(false);
  const [tab, setTab]             = useState<"nodes"|"edges">("nodes");
  const [form, setForm]           = useState({ canonical_name: "", type: "company" as NodeType, tags: "" });

  const filtered = NODES.filter(n => {
    if (typeFilter !== "all" && n.type !== typeFilter) return false;
    if (search && !n.canonical_name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <AppLayout title="Knowledge Graph" description="Entity nodes, relationships, and intelligence edges"
      actions={
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 rounded-xl bg-violet px-4 py-2 text-[12px] font-semibold text-white hover:bg-violet/90 transition-colors">
          <Plus className="h-3.5 w-3.5" />Add Node
        </button>
      }
    >
      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        {[{l:"Total Nodes",v:"2,847"},{l:"Edge Connections",v:"8,412"},{l:"Node Types",v:"10"},{l:"Avg Degree",v:"5.9"}].map(({l,v})=>(
          <div key={l} className="rounded-2xl border border-white/[0.06] bg-[#0d0f1a] px-5 py-4">
            <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-[#374151]">{l}</p>
            <p className="mt-1.5 text-2xl font-bold text-white">{v}</p>
          </div>
        ))}
      </div>

      {/* Node type distribution */}
      <div className="mt-6 rounded-2xl border border-white/[0.06] bg-[#0d0f1a] p-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#64748b] mb-4">Node Distribution</p>
        <div className="flex flex-wrap gap-2">
          {[
            { type: "company",    count: 847 },
            { type: "person",     count: 412 },
            { type: "product",    count: 238 },
            { type: "sector",     count: 64  },
            { type: "location",   count: 318 },
            { type: "country",    count: 54  },
            { type: "community",  count: 201 },
            { type: "technology", count: 183 },
            { type: "trend",      count: 412 },
            { type: "event",      count: 118 },
          ].map(({ type, count }) => (
            <div key={type} className={`flex items-center gap-2 rounded-xl px-3 py-2 ring-1 ${NODE_TYPE_COLORS[type as NodeType]}`}>
              <span className="text-[11px] font-medium capitalize">{type}</span>
              <span className="text-[10px] opacity-70">{count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Tab: nodes / edges */}
      <div className="mt-6 rounded-2xl border border-white/[0.06] bg-[#0d0f1a]">
        <div className="flex items-center gap-6 border-b border-white/[0.06] px-5 pt-4">
          {(["nodes","edges"] as const).map(t=>(
            <button key={t} onClick={()=>setTab(t)}
              className={`pb-3 text-[11px] font-semibold uppercase tracking-[0.12em] border-b-2 transition-all ${tab===t?"border-violet-light text-violet-light":"border-transparent text-[#374151] hover:text-[#64748b]"}`}>
              {t === "nodes" ? `Nodes (${filtered.length})` : `Edges (${EDGES.length})`}
            </button>
          ))}
          {tab === "nodes" && (
            <div className="ml-auto flex items-center gap-3 pb-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3 w-3 text-[#374151]" />
                <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search nodes…"
                  className="rounded-xl border border-white/[0.07] bg-[#111624] py-1.5 pl-8 pr-3 text-[12px] text-slate-300 placeholder:text-[#374151] focus:border-violet/40 focus:outline-none w-48" />
              </div>
              <select value={typeFilter} onChange={e=>setTypeFilter(e.target.value as NodeType|"all")}
                className="rounded-xl border border-white/[0.07] bg-[#111624] px-3 py-1.5 text-[12px] text-[#64748b] focus:border-violet/40 focus:outline-none">
                <option value="all">All types</option>
                {NODE_TYPES.map(t=><option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          )}
        </div>
        <div className="p-5">
          {tab === "nodes" && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/[0.05]">
                    {["Canonical Name","Type","Tags","Edges","Added"].map(h=>(
                      <th key={h} className="pb-3 text-left text-[10px] font-medium uppercase tracking-[0.12em] text-[#374151]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(n=>(
                    <tr key={n.id} className="border-b border-white/[0.03] hover:bg-white/[0.015] transition-colors">
                      <td className="py-3 font-semibold text-white text-sm">{n.canonical_name}</td>
                      <td className="py-3">
                        <span className={`rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ring-1 ${NODE_TYPE_COLORS[n.type]}`}>{n.type}</span>
                      </td>
                      <td className="py-3">
                        <div className="flex flex-wrap gap-1">
                          {n.tags.slice(0,2).map(t=><span key={t} className="rounded-md bg-white/[0.04] px-1.5 py-0.5 text-[10px] text-[#374151]">{t}</span>)}
                        </div>
                      </td>
                      <td className="py-3 text-[12px] text-[#64748b]">{n.edge_count}</td>
                      <td className="py-3 text-[11px] text-[#374151]">{n.created}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {tab === "edges" && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/[0.05]">
                    {["From","Relation","To","Weight"].map(h=>(
                      <th key={h} className="pb-3 text-left text-[10px] font-medium uppercase tracking-[0.12em] text-[#374151]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {EDGES.map(e=>(
                    <tr key={e.id} className="border-b border-white/[0.03] hover:bg-white/[0.015] transition-colors">
                      <td className="py-3 font-medium text-white text-sm">{e.from}</td>
                      <td className="py-3">
                        <span className="rounded-md bg-violet/10 px-2 py-0.5 text-[10px] font-mono font-medium text-violet-light">{e.relation}</span>
                      </td>
                      <td className="py-3 font-medium text-white text-sm">{e.to}</td>
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-16 overflow-hidden rounded-full bg-white/[0.06]">
                            <div className="h-full rounded-full bg-violet" style={{width:`${e.weight*100}%`}} />
                          </div>
                          <span className="text-[11px] text-[#374151]">{e.weight.toFixed(2)}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-white/[0.08] bg-[#0d0f1a] p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white">Add Graph Node</h2>
              <button onClick={() => setShowCreate(false)} className="text-[#374151] hover:text-slate-300"><X className="h-4 w-4" /></button>
            </div>
            <div className="mt-5 space-y-4">
              <div>
                <label className="block text-[11px] font-medium text-[#64748b] mb-1.5">Canonical Name</label>
                <input value={form.canonical_name} onChange={e=>setForm(f=>({...f,canonical_name:e.target.value}))} placeholder="e.g. Safaricom, M-Pesa, Nairobi"
                  className="w-full rounded-xl border border-white/[0.07] bg-[#111624] px-4 py-2.5 text-[13px] text-slate-300 placeholder:text-[#374151] focus:border-violet/40 focus:outline-none" />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-[#64748b] mb-1.5">Node Type</label>
                <div className="grid grid-cols-3 gap-2">
                  {NODE_TYPES.map(t=>(
                    <button key={t} onClick={()=>setForm(f=>({...f,type:t}))}
                      className={`rounded-xl border px-2 py-1.5 text-[10px] font-medium capitalize transition-all ${form.type===t?"border-violet/40 bg-violet/10 text-violet-light":"border-white/[0.06] text-[#374151] hover:border-white/[0.1]"}`}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-medium text-[#64748b] mb-1.5">Tags</label>
                <input value={form.tags} onChange={e=>setForm(f=>({...f,tags:e.target.value}))} placeholder="fintech, africa, mobile"
                  className="w-full rounded-xl border border-white/[0.07] bg-[#111624] px-4 py-2.5 text-[13px] text-slate-300 placeholder:text-[#374151] focus:border-violet/40 focus:outline-none" />
              </div>
            </div>
            <div className="mt-6 flex gap-3">
              <button onClick={() => setShowCreate(false)} className="flex-1 rounded-xl border border-white/[0.07] py-2.5 text-[12px] font-medium text-[#64748b] hover:text-slate-300 transition-colors">Cancel</button>
              <button onClick={() => setShowCreate(false)} className="flex-1 rounded-xl bg-violet py-2.5 text-[12px] font-semibold text-white hover:bg-violet/90 transition-colors">Create Node</button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
