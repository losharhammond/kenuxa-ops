"use client";

import { useState } from "react";
import { AppLayout } from "@/components/app-layout";
import { KeyRound, Plus, Copy, Eye, EyeOff, Trash2, X, CheckCircle2 } from "lucide-react";

interface ApiKey {
  id: string; name: string; prefix: string; product: string;
  scopes: string[]; created: string; lastUsed: string; status: "active" | "revoked";
  requests: number;
}

const KEYS: ApiKey[] = [
  { id: "key_1", name: "REACH Production",       prefix: "kx_live_reach_", product: "REACH",   scopes: ["ai:read","memory:write","graph:read","events:write"], created: "Jan 2025", lastUsed: "2s ago",   status: "active",  requests: 84712 },
  { id: "key_2", name: "VOICE Production",        prefix: "kx_live_voice_", product: "VOICE",   scopes: ["ai:read","memory:write","events:write"],              created: "Feb 2025", lastUsed: "8s ago",   status: "active",  requests: 31204 },
  { id: "key_3", name: "REACH Development",       prefix: "kx_dev_reach_",  product: "REACH",   scopes: ["ai:read","memory:read","graph:read"],                 created: "Mar 2025", lastUsed: "3d ago",   status: "active",  requests: 2847  },
  { id: "key_4", name: "ACADEMY Integration",     prefix: "kx_live_acad_",  product: "ACADEMY", scopes: ["ai:read","memory:read"],                             created: "Apr 2025", lastUsed: "1h ago",   status: "active",  requests: 8412  },
  { id: "key_5", name: "Analytics Service",       prefix: "kx_svc_anal_",   product: "CORE",    scopes: ["events:read","memory:read","graph:read"],             created: "May 2025", lastUsed: "14m ago",  status: "active",  requests: 4201  },
  { id: "key_6", name: "Old REACH Key",           prefix: "kx_live_old_",   product: "REACH",   scopes: ["ai:read"],                                           created: "Dec 2024", lastUsed: "90d ago",  status: "revoked", requests: 1247  },
];

const SCOPE_GROUPS = [
  { group: "AI",     scopes: ["ai:read","ai:write"]     },
  { group: "Memory", scopes: ["memory:read","memory:write"] },
  { group: "Graph",  scopes: ["graph:read","graph:write"]   },
  { group: "Events", scopes: ["events:read","events:write"] },
  { group: "Org",    scopes: ["org:read","org:write"]       },
  { group: "Keys",   scopes: ["keys:read","keys:write"]     },
];

export default function KeysPage() {
  const [showCreate, setShowCreate] = useState(false);
  const [showKey,    setShowKey]    = useState<string | null>(null);
  const [copied,     setCopied]     = useState<string | null>(null);
  const [form,       setForm]       = useState({ name: "", product: "REACH", scopes: [] as string[] });
  const [newKeyValue, setNewKeyValue] = useState<string | null>(null);

  const active  = KEYS.filter(k => k.status === "active");
  const revoked = KEYS.filter(k => k.status === "revoked");

  function toggleScope(s: string) {
    setForm(f => ({
      ...f,
      scopes: f.scopes.includes(s) ? f.scopes.filter(x => x !== s) : [...f.scopes, s],
    }));
  }

  function handleCreate() {
    const fake = `kx_live_${form.product.toLowerCase()}_${"x".repeat(32)}`;
    setNewKeyValue(fake);
  }

  function copyText(text: string, id: string) {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <AppLayout title="API Keys" description="Manage scoped API keys for all KENUXA products"
      actions={<button onClick={() => setShowCreate(true)} className="flex items-center gap-2 rounded-xl bg-violet px-4 py-2 text-[12px] font-semibold text-white hover:bg-violet/90 transition-colors"><Plus className="h-3.5 w-3.5" />New Key</button>}>
      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        {[{l:"Active Keys",v:active.length},{l:"Total Requests",v:"131.4K"},{l:"Revoked",v:revoked.length},{l:"Avg Usage",v:"26.3K"}].map(({l,v})=>(
          <div key={l} className="rounded-2xl border border-white/[0.06] bg-[#0d0f1a] px-5 py-4">
            <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-[#374151]">{l}</p>
            <p className="mt-1.5 text-2xl font-bold text-white">{v}</p>
          </div>
        ))}
      </div>

      {/* Keys table */}
      <div className="mt-6 rounded-2xl border border-white/[0.06] bg-[#0d0f1a] p-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#64748b] mb-4">Active Keys</p>
        <div className="space-y-2">
          {KEYS.filter(k => k.status === "active").map(key => (
            <div key={key.id} className="flex items-center gap-4 rounded-xl border border-white/[0.05] bg-[#111624] px-4 py-3.5">
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-violet/10 ring-1 ring-violet/20">
                <KeyRound className="h-4 w-4 text-violet-light" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-[13px] font-semibold text-white">{key.name}</p>
                  <span className="rounded-md bg-white/[0.03] px-1.5 py-0.5 text-[9px] text-[#374151]">{key.product}</span>
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <p className="font-mono text-[11px] text-[#374151]">
                    {showKey === key.id ? `${key.prefix}${"•".repeat(32)}` : `${key.prefix}${"•".repeat(8)}...`}
                  </p>
                  <button onClick={() => setShowKey(showKey === key.id ? null : key.id)} className="text-[#374151] hover:text-slate-400 transition-colors">
                    {showKey === key.id ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                  </button>
                  <button onClick={() => copyText(key.prefix + "x".repeat(32), key.id)} className="text-[#374151] hover:text-slate-400 transition-colors">
                    {copied === key.id ? <CheckCircle2 className="h-3 w-3 text-emerald" /> : <Copy className="h-3 w-3" />}
                  </button>
                </div>
              </div>
              <div className="hidden lg:flex flex-wrap gap-1.5 max-w-xs">
                {key.scopes.slice(0, 3).map(s => (
                  <span key={s} className="rounded-lg bg-white/[0.03] px-1.5 py-0.5 font-mono text-[9px] text-[#374151]">{s}</span>
                ))}
                {key.scopes.length > 3 && (
                  <span className="rounded-lg bg-white/[0.03] px-1.5 py-0.5 text-[9px] text-[#374151]">+{key.scopes.length - 3}</span>
                )}
              </div>
              <div className="hidden md:block text-right">
                <p className="text-[11px] text-[#374151]">{key.requests.toLocaleString()} req</p>
                <p className="text-[10px] text-[#374151]">Last: {key.lastUsed}</p>
              </div>
              <button className="text-[#374151] hover:text-red-400 transition-colors">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Revoked */}
      {revoked.length > 0 && (
        <div className="mt-6 rounded-2xl border border-white/[0.06] bg-[#0d0f1a] p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#64748b] mb-4">Revoked Keys</p>
          <div className="space-y-2">
            {revoked.map(key => (
              <div key={key.id} className="flex items-center gap-4 rounded-xl bg-white/[0.01] px-4 py-3 opacity-50">
                <KeyRound className="h-4 w-4 text-[#374151]" />
                <div className="flex-1">
                  <p className="text-[13px] text-[#374151]">{key.name}</p>
                  <p className="font-mono text-[10px] text-[#374151]">{key.prefix}{"•".repeat(8)}...</p>
                </div>
                <p className="text-[11px] text-[#374151]">Revoked · {key.lastUsed}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create modal */}
      {showCreate && !newKeyValue && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-white/[0.08] bg-[#0d0f1a] p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white">Create API Key</h2>
              <button onClick={() => setShowCreate(false)} className="text-[#374151] hover:text-slate-300"><X className="h-4 w-4" /></button>
            </div>
            <div className="mt-5 space-y-4">
              <div>
                <label className="block text-[11px] font-medium text-[#64748b] mb-1.5">Key Name</label>
                <input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="e.g. REACH Production"
                  className="w-full rounded-xl border border-white/[0.07] bg-[#111624] px-4 py-2.5 text-[13px] text-slate-300 placeholder:text-[#374151] focus:border-violet/40 focus:outline-none" />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-[#64748b] mb-1.5">Product</label>
                <select value={form.product} onChange={e=>setForm(f=>({...f,product:e.target.value}))}
                  className="w-full rounded-xl border border-white/[0.07] bg-[#111624] px-4 py-2.5 text-[13px] text-slate-300 focus:border-violet/40 focus:outline-none">
                  {["CORE","REACH","VOICE","ACADEMY","OPS"].map(p=><option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-medium text-[#64748b] mb-1.5">Scopes</label>
                <div className="space-y-2">
                  {SCOPE_GROUPS.map(({ group, scopes }) => (
                    <div key={group} className="rounded-xl border border-white/[0.05] p-3">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-[#374151] mb-2">{group}</p>
                      <div className="flex gap-2">
                        {scopes.map(s => (
                          <button key={s} onClick={() => toggleScope(s)}
                            className={`rounded-lg px-2.5 py-1 text-[10px] font-medium transition-all ${form.scopes.includes(s) ? "bg-violet/15 text-violet-light" : "bg-white/[0.03] text-[#374151] hover:text-[#64748b]"}`}>
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-6 flex gap-3">
              <button onClick={() => setShowCreate(false)} className="flex-1 rounded-xl border border-white/[0.07] py-2.5 text-[12px] font-medium text-[#64748b] hover:text-slate-300 transition-colors">Cancel</button>
              <button onClick={handleCreate} className="flex-1 rounded-xl bg-violet py-2.5 text-[12px] font-semibold text-white hover:bg-violet/90 transition-colors">Generate Key</button>
            </div>
          </div>
        </div>
      )}

      {/* New key reveal */}
      {newKeyValue && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-emerald/20 bg-[#0d0f1a] p-6 shadow-2xl">
            <CheckCircle2 className="h-8 w-8 text-emerald mx-auto" />
            <h2 className="mt-3 text-center text-sm font-semibold text-white">API Key Created</h2>
            <p className="mt-1 text-center text-[12px] text-[#64748b]">Copy this key now — it will not be shown again.</p>
            <div className="mt-4 flex items-center gap-2 rounded-xl bg-[#111624] border border-white/[0.07] px-4 py-3">
              <p className="flex-1 font-mono text-[11px] text-emerald break-all">{newKeyValue}</p>
              <button onClick={() => copyText(newKeyValue, "new")} className="flex-shrink-0 text-[#374151] hover:text-slate-300">
                {copied === "new" ? <CheckCircle2 className="h-4 w-4 text-emerald" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
            <button onClick={() => { setNewKeyValue(null); setShowCreate(false); }}
              className="mt-4 w-full rounded-xl bg-violet py-2.5 text-[12px] font-semibold text-white hover:bg-violet/90 transition-colors">
              Done
            </button>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
