"use client";

import { useState } from "react";
import { AppLayout } from "@/components/app-layout";
import { Play, Pause, Plus, CheckCircle2, AlertCircle, X, Zap } from "lucide-react";

type WFStatus = "active" | "paused" | "draft" | "error";

interface WFDef {
  id: string; name: string; description: string; trigger: string;
  steps: number; runs: number; lastRun: string; status: WFStatus;
  product: string;
}

const STATUS_CONFIG: Record<WFStatus, { label: string; color: string; dot: string }> = {
  active:  { label: "Active",  color: "text-emerald",   dot: "bg-emerald animate-pulse"   },
  paused:  { label: "Paused",  color: "text-amber-400", dot: "bg-amber-400"               },
  draft:   { label: "Draft",   color: "text-[#374151]", dot: "bg-[#374151]"               },
  error:   { label: "Error",   color: "text-red-400",   dot: "bg-red-400"                 },
};

const WORKFLOWS: WFDef[] = [
  { id: "wf_1", name: "Daily Market Intelligence",   trigger: "cron:0 6 * * *",       steps: 6,  runs: 28,  lastRun: "6h ago",  status: "active",  product: "REACH",   description: "Collect news, run extraction, update graph nodes, synthesise knowledge, generate myth forecast." },
  { id: "wf_2", name: "Entity Enrichment Pipeline",  trigger: "event:graph.node.created", steps: 4, runs: 847, lastRun: "2m ago",  status: "active",  product: "REACH",   description: "On new graph node: fetch web data, extract relationships, update knowledge base." },
  { id: "wf_3", name: "VOICE Session Memory Store",  trigger: "event:voice.session.end",  steps: 3, runs: 312, lastRun: "8m ago",  status: "active",  product: "VOICE",   description: "At end of voice session: extract key insights, store as episodic memory, update user profile." },
  { id: "wf_4", name: "Weekly Performance Report",   trigger: "cron:0 8 * * 1",       steps: 5,  runs: 4,   lastRun: "3d ago",  status: "active",  product: "CORE",    description: "Aggregate metrics, generate executive summary via AI, send email digest." },
  { id: "wf_5", name: "Anomaly Detection Monitor",   trigger: "cron:*/15 * * * *",    steps: 3,  runs: 0,   lastRun: "Never",   status: "draft",   product: "CORE",    description: "Monitor system metrics for anomalies, trigger alerts if thresholds exceeded." },
  { id: "wf_6", name: "Graph Contradiction Sweep",   trigger: "cron:0 2 * * *",       steps: 4,  runs: 2,   lastRun: "1d ago",  status: "paused",  product: "REACH",   description: "Nightly contradiction detection across knowledge graph edges." },
];

const RECENT_RUNS = [
  { wf: "Entity Enrichment Pipeline", status: "ok",      duration: "1.2s",  time: "2m ago"  },
  { wf: "VOICE Session Memory Store", status: "ok",      duration: "0.8s",  time: "8m ago"  },
  { wf: "Entity Enrichment Pipeline", status: "ok",      duration: "1.4s",  time: "14m ago" },
  { wf: "Daily Market Intelligence",  status: "ok",      duration: "4m 12s",time: "6h ago"  },
  { wf: "Graph Contradiction Sweep",  status: "error",   duration: "—",     time: "1d ago"  },
  { wf: "Weekly Performance Report",  status: "ok",      duration: "2m 8s", time: "3d ago"  },
];

export default function WorkflowsPage() {
  const [selected, setSelected] = useState<WFDef | null>(null);
  const [tab, setTab] = useState<"workflows"|"runs">("workflows");

  return (
    <AppLayout title="Workflows" description="Automated intelligence and data processing pipelines"
      actions={<button className="flex items-center gap-2 rounded-xl bg-violet px-4 py-2 text-[12px] font-semibold text-white hover:bg-violet/90 transition-colors"><Plus className="h-3.5 w-3.5" />New Workflow</button>}>
      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        {[{l:"Active",v:"4"},{l:"Total Runs Today",v:"1,187"},{l:"Success Rate",v:"99.1%"},{l:"Avg Duration",v:"1.8s"}].map(({l,v})=>(
          <div key={l} className="rounded-2xl border border-white/[0.06] bg-[#0d0f1a] px-5 py-4">
            <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-[#374151]">{l}</p>
            <p className="mt-1.5 text-2xl font-bold text-white">{v}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="mt-6 rounded-2xl border border-white/[0.06] bg-[#0d0f1a]">
        <div className="flex border-b border-white/[0.06] px-5 pt-4">
          {(["workflows","runs"] as const).map(t=>(
            <button key={t} onClick={()=>setTab(t)}
              className={`mr-6 pb-3 text-[11px] font-semibold uppercase tracking-[0.12em] border-b-2 transition-all ${tab===t?"border-violet-light text-violet-light":"border-transparent text-[#374151] hover:text-[#64748b]"}`}>
              {t==="runs" ? "Run History" : "Workflows"}
            </button>
          ))}
        </div>
        <div className="p-5">
          {tab === "workflows" && (
            <div className="grid gap-3 lg:grid-cols-2">
              {WORKFLOWS.map(wf=>{
                const s = STATUS_CONFIG[wf.status];
                return (
                  <div key={wf.id} onClick={()=>setSelected(wf)} className="cursor-pointer rounded-2xl border border-white/[0.06] bg-[#111624] p-5 hover:border-white/[0.1] transition-all">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${s.dot}`} />
                          <p className="font-semibold text-white text-sm truncate">{wf.name}</p>
                        </div>
                        <p className="mt-1.5 text-[12px] leading-relaxed text-[#64748b] line-clamp-2">{wf.description}</p>
                      </div>
                      <span className="rounded-md bg-white/[0.03] px-2 py-0.5 text-[10px] text-[#374151] flex-shrink-0">{wf.product}</span>
                    </div>
                    <div className="mt-4 flex items-center gap-4 border-t border-white/[0.05] pt-3">
                      <div className="flex items-center gap-1.5 text-[10px] text-[#374151]">
                        <Zap className="h-3 w-3" /><span className="font-mono">{wf.trigger}</span>
                      </div>
                      <span className="text-[10px] text-[#374151]">{wf.steps} steps</span>
                      <span className="text-[10px] text-[#374151]">{wf.runs} runs</span>
                      <span className="ml-auto text-[10px] text-[#374151]">Last: {wf.lastRun}</span>
                    </div>
                    <div className="mt-2 flex gap-2">
                      {wf.status === "active" && (
                        <button className="flex items-center gap-1.5 rounded-xl bg-amber-400/10 px-3 py-1.5 text-[10px] font-medium text-amber-400 hover:bg-amber-400/20 transition-colors">
                          <Pause className="h-3 w-3" />Pause
                        </button>
                      )}
                      {wf.status === "paused" && (
                        <button className="flex items-center gap-1.5 rounded-xl bg-emerald/10 px-3 py-1.5 text-[10px] font-medium text-emerald hover:bg-emerald/20 transition-colors">
                          <Play className="h-3 w-3" />Resume
                        </button>
                      )}
                      {(wf.status === "draft" || wf.status === "error") && (
                        <button className="flex items-center gap-1.5 rounded-xl bg-violet/10 px-3 py-1.5 text-[10px] font-medium text-violet-light hover:bg-violet/20 transition-colors">
                          <Play className="h-3 w-3" />Run Now
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {tab === "runs" && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/[0.05]">
                    {["Workflow","Status","Duration","Time"].map(h=>(
                      <th key={h} className="pb-3 text-left text-[10px] font-medium uppercase tracking-[0.12em] text-[#374151]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {RECENT_RUNS.map((r,i)=>(
                    <tr key={i} className="border-b border-white/[0.03] hover:bg-white/[0.015] transition-colors">
                      <td className="py-3 text-[13px] font-medium text-white">{r.wf}</td>
                      <td className="py-3">
                        {r.status === "ok"
                          ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald" />
                          : <AlertCircle  className="h-3.5 w-3.5 text-red-400" />}
                      </td>
                      <td className="py-3 font-mono text-[12px] text-[#64748b]">{r.duration}</td>
                      <td className="py-3 text-[11px] text-[#374151]">{r.time}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Workflow detail panel */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/40 backdrop-blur-sm" onClick={()=>setSelected(null)}>
          <div className="h-full w-full max-w-md overflow-y-auto border-l border-white/[0.08] bg-[#0d0f1a] p-6 shadow-2xl" onClick={e=>e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white">{selected.name}</h2>
              <button onClick={()=>setSelected(null)} className="text-[#374151] hover:text-slate-300"><X className="h-4 w-4" /></button>
            </div>
            <div className="mt-4 space-y-3">
              <div className="rounded-xl bg-white/[0.03] p-3">
                <p className="text-[10px] text-[#374151] mb-1">Description</p>
                <p className="text-[13px] text-slate-300 leading-relaxed">{selected.description}</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[{l:"Status",v:selected.status},{l:"Product",v:selected.product},{l:"Steps",v:selected.steps},{l:"Total Runs",v:selected.runs},{l:"Last Run",v:selected.lastRun},{l:"Trigger",v:selected.trigger}].map(({l,v})=>(
                  <div key={l} className="rounded-xl bg-white/[0.03] px-3 py-2.5">
                    <p className="text-[10px] text-[#374151]">{l}</p>
                    <p className="mt-1 font-mono text-[12px] text-white truncate">{String(v)}</p>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 pt-2">
                <button className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-violet py-2.5 text-[12px] font-semibold text-white hover:bg-violet/90 transition-colors">
                  <Play className="h-3.5 w-3.5" />Run Now
                </button>
                <button className="rounded-xl border border-white/[0.07] px-4 py-2.5 text-[12px] text-[#64748b] hover:text-slate-300 transition-colors">Edit</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
