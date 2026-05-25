"use client";

import { useState } from "react";
import { AppLayout } from "@/components/app-layout";
import { Send, Plus, Trash2, CheckCircle2, AlertCircle, Clock } from "lucide-react";

interface Event { id: string; type: string; source: string; payload: string; status: "delivered" | "failed" | "pending"; time: string; }
interface Sub    { id: string; pattern: string; target: string; product: string; active: boolean; }

const EVENTS: Event[] = [
  { id: "evt_9a2b", type: "auth.session.created",          source: "REACH",   payload: '{"user_id":"usr_x81","org_id":"org_k1"}',  status: "delivered", time: "3s ago"  },
  { id: "evt_8b3c", type: "ai.inference.completed",         source: "VOICE",   payload: '{"model":"llama3-70b","tokens":1842}',      status: "delivered", time: "8s ago"  },
  { id: "evt_7c4d", type: "memory.record.stored",           source: "REACH",   payload: '{"type":"semantic","id":"mem_9f2a1b"}',     status: "delivered", time: "15s ago" },
  { id: "evt_6d5e", type: "graph.node.created",             source: "CORE",    payload: '{"canonical_name":"GTBank","type":"company"}', status: "delivered", time: "24s ago" },
  { id: "evt_5e6f", type: "event.webhook.delivery.failed",  source: "OPS",     payload: '{"target":"https://hooks.slack.com/..."}', status: "failed",    time: "38s ago" },
  { id: "evt_4f7g", type: "org.member.invited",             source: "CORE",    payload: '{"org_id":"org_k1","email":"j@co.gh"}',    status: "delivered", time: "1m ago"  },
  { id: "evt_3g8h", type: "ai.model.fallback.triggered",    source: "VOICE",   payload: '{"from":"groq","to":"openai"}',             status: "pending",   time: "2m ago"  },
  { id: "evt_2h9i", type: "crawl.completed",                source: "REACH",   payload: '{"pages":84,"entities":312}',              status: "delivered", time: "4m ago"  },
];

const SUBS: Sub[] = [
  { id: "sub_1", pattern: "auth.*",         target: "https://hooks.reach.kenuxa.io/auth",   product: "REACH",   active: true  },
  { id: "sub_2", pattern: "ai.*",           target: "https://hooks.voice.kenuxa.io/ai",    product: "VOICE",   active: true  },
  { id: "sub_3", pattern: "memory.*",       target: "https://hooks.reach.kenuxa.io/memory",product: "REACH",   active: true  },
  { id: "sub_4", pattern: "graph.*",        target: "https://hooks.ops.kenuxa.io/graph",   product: "OPS",     active: false },
  { id: "sub_5", pattern: "org.*",          target: "https://hooks.core.kenuxa.io/org",    product: "CORE",    active: true  },
];

export default function EventsPage() {
  const [tab, setTab]               = useState<"feed"|"publish"|"subs">("feed");
  const [publishBody, setPublishBody] = useState('{\n  "user_id": "usr_xxx",\n  "action": "test"\n}');
  const [publishType, setPublishType] = useState("core.test.event");

  const StatusIcon = ({ s }: { s: Event["status"] }) => {
    if (s === "delivered") return <CheckCircle2 className="h-3.5 w-3.5 text-emerald" />;
    if (s === "failed")    return <AlertCircle  className="h-3.5 w-3.5 text-red-400" />;
    return <Clock className="h-3.5 w-3.5 text-amber-400 animate-pulse" />;
  };

  return (
    <AppLayout title="Event Bus" description="Publish, subscribe, and monitor the KENUXA event stream"
      actions={<span className="flex items-center gap-1.5 text-[11px] text-[#64748b]"><span className="h-1.5 w-1.5 rounded-full bg-emerald animate-pulse" />2,401 events/min</span>}>
      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        {[{ l:"Events Today",v:"847K"},{l:"Delivered",v:"99.7%"},{l:"Failed",v:"0.3%"},{l:"Avg Latency",v:"4ms"}].map(({l,v})=>(
          <div key={l} className="rounded-2xl border border-white/[0.06] bg-[#0d0f1a] px-5 py-4">
            <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-[#374151]">{l}</p>
            <p className="mt-1.5 text-2xl font-bold text-white">{v}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-2xl border border-white/[0.06] bg-[#0d0f1a]">
        <div className="flex border-b border-white/[0.06] px-5 pt-4">
          {(["feed","publish","subs"] as const).map((t)=>(
            <button key={t} onClick={()=>setTab(t)}
              className={`mr-6 pb-3 text-[11px] font-semibold uppercase tracking-[0.12em] border-b-2 transition-all ${tab===t?"border-violet-light text-violet-light":"border-transparent text-[#374151] hover:text-[#64748b]"}`}>
              {t === "subs" ? "Subscriptions" : t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
        <div className="p-5">
          {tab === "feed" && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/[0.05]">
                    {["ID","Event Type","Source","Payload","Status","Time"].map(h=>(
                      <th key={h} className="pb-3 text-left text-[10px] font-medium uppercase tracking-[0.12em] text-[#374151]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {EVENTS.map(e=>(
                    <tr key={e.id} className="border-b border-white/[0.03] hover:bg-white/[0.015] transition-colors">
                      <td className="py-2.5 font-mono text-[10px] text-[#374151]">{e.id}</td>
                      <td className="py-2.5 font-mono text-[11px] text-slate-300">{e.type}</td>
                      <td className="py-2.5"><span className="rounded-md bg-white/[0.03] px-1.5 py-0.5 text-[10px] text-[#64748b]">{e.source}</span></td>
                      <td className="py-2.5 max-w-xs truncate font-mono text-[10px] text-[#374151]">{e.payload}</td>
                      <td className="py-2.5"><StatusIcon s={e.status} /></td>
                      <td className="py-2.5 text-[10px] text-[#374151]">{e.time}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {tab === "publish" && (
            <div className="max-w-2xl space-y-4">
              <div>
                <label className="block text-[11px] font-medium text-[#64748b] mb-1.5">Event Type</label>
                <input value={publishType} onChange={e=>setPublishType(e.target.value)}
                  className="w-full rounded-xl border border-white/[0.07] bg-[#111624] px-4 py-2.5 font-mono text-[13px] text-slate-300 focus:border-violet/40 focus:outline-none" />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-[#64748b] mb-1.5">Payload (JSON)</label>
                <textarea value={publishBody} onChange={e=>setPublishBody(e.target.value)} rows={8}
                  className="w-full rounded-xl border border-white/[0.07] bg-[#111624] px-4 py-3 font-mono text-[12px] text-slate-300 focus:border-violet/40 focus:outline-none resize-none" />
              </div>
              <button className="flex items-center gap-2 rounded-xl bg-violet px-5 py-2.5 text-[12px] font-semibold text-white hover:bg-violet/90 transition-colors">
                <Send className="h-3.5 w-3.5" />Publish Event
              </button>
            </div>
          )}

          {tab === "subs" && (
            <div className="space-y-2">
              {SUBS.map(s=>(
                <div key={s.id} className="flex items-center gap-4 rounded-xl border border-white/[0.05] bg-[#111624] px-4 py-3">
                  <div className={`h-2 w-2 rounded-full flex-shrink-0 ${s.active?"bg-emerald":"bg-[#374151]"}`} />
                  <div className="flex-1 min-w-0 grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-[10px] text-[#374151]">Pattern</p>
                      <p className="font-mono text-[12px] text-slate-300">{s.pattern}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-[10px] text-[#374151]">Webhook Target</p>
                      <p className="truncate font-mono text-[11px] text-[#64748b]">{s.target}</p>
                    </div>
                  </div>
                  <span className="rounded-md bg-white/[0.03] px-2 py-0.5 text-[10px] text-[#374151]">{s.product}</span>
                  <button className="text-[#374151] hover:text-red-400 transition-colors"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              ))}
              <button className="mt-2 flex items-center gap-2 rounded-xl border border-white/[0.06] px-4 py-2.5 text-[12px] font-medium text-[#64748b] hover:text-slate-300 hover:border-white/[0.1] transition-all">
                <Plus className="h-3.5 w-3.5" />Add Subscription
              </button>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
