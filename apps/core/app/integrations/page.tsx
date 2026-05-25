"use client";

import { useState } from "react";
import { AppLayout } from "@/components/app-layout";
import { CheckCircle2, Clock, XCircle, Plus, ExternalLink } from "lucide-react";

interface Integration {
  name: string; category: string; status: "connected" | "pending" | "disconnected";
  description: string; events: number; icon: string;
}

const INTEGRATIONS: Integration[] = [
  { name: "Groq AI",       category: "AI Provider",    status: "connected",    events: 3084, icon: "⚡", description: "Primary LLM inference via Groq API. Llama3, Mixtral, Gemma models." },
  { name: "OpenAI",        category: "AI Provider",    status: "connected",    events: 88,   icon: "🤖", description: "Fallback provider for GPT-4o and GPT-3.5 when Groq is unavailable." },
  { name: "Anthropic",     category: "AI Provider",    status: "connected",    events: 12,   icon: "🧠", description: "Third-tier fallback. Claude models for long-context tasks." },
  { name: "Supabase",      category: "Database",       status: "connected",    events: 48200,icon: "🗄️", description: "Postgres + pgvector database. Auth, RLS, realtime subscriptions." },
  { name: "Slack",         category: "Notifications",  status: "disconnected", events: 0,    icon: "💬", description: "Webhook notifications for alerts, event failures, and org updates." },
  { name: "WhatsApp",      category: "Communication",  status: "pending",      events: 0,    icon: "📱", description: "VOICE product WhatsApp Business API. Opt-in messaging only." },
  { name: "Telegram",      category: "Communication",  status: "pending",      events: 0,    icon: "✈️", description: "Telegram Bot API for product notifications and AI interactions." },
  { name: "SendGrid",      category: "Email",          status: "connected",    events: 247,  icon: "📧", description: "Transactional email for auth flows, reports, and alerts." },
  { name: "Cloudflare",    category: "Infrastructure", status: "connected",    events: 94100,icon: "🌐", description: "CDN, DDoS protection, and edge routing for all KENUXA services." },
  { name: "GitHub Actions",category: "CI/CD",          status: "connected",    events: 84,   icon: "🔧", description: "Automated testing and deployment pipelines." },
  { name: "Sentry",        category: "Monitoring",     status: "pending",      events: 0,    icon: "🔍", description: "Error tracking and performance monitoring." },
  { name: "Resend",        category: "Email",          status: "disconnected", events: 0,    icon: "📨", description: "Alternative transactional email provider." },
];

const STATUS_CONFIG = {
  connected:    { icon: CheckCircle2, color: "text-emerald",    bg: "bg-emerald/10",    label: "Connected"    },
  pending:      { icon: Clock,        color: "text-amber-400",  bg: "bg-amber-400/10",  label: "Pending"      },
  disconnected: { icon: XCircle,      color: "text-[#374151]",  bg: "bg-white/[0.04]",  label: "Disconnected" },
};

const CATEGORIES = ["All", "AI Provider", "Database", "Communication", "Notifications", "Email", "Infrastructure", "CI/CD", "Monitoring"];

export default function IntegrationsPage() {
  const [filter, setFilter] = useState("All");

  const filtered = filter === "All" ? INTEGRATIONS : INTEGRATIONS.filter(i => i.category === filter);
  const connected = INTEGRATIONS.filter(i => i.status === "connected").length;

  return (
    <AppLayout title="Integrations" description="Connected services and third-party platform integrations"
      actions={<button className="flex items-center gap-2 rounded-xl bg-violet px-4 py-2 text-[12px] font-semibold text-white hover:bg-violet/90 transition-colors"><Plus className="h-3.5 w-3.5" />Add Integration</button>}>
      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        {[{ l:"Connected",v:`${connected}/${INTEGRATIONS.length}`},{l:"Events Today",v:"145.8K"},{l:"Uptime",v:"99.9%"},{l:"Avg Latency",v:"180ms"}].map(({l,v})=>(
          <div key={l} className="rounded-2xl border border-white/[0.06] bg-[#0d0f1a] px-5 py-4">
            <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-[#374151]">{l}</p>
            <p className="mt-1.5 text-2xl font-bold text-white">{v}</p>
          </div>
        ))}
      </div>

      {/* Category filter */}
      <div className="mt-6 flex flex-wrap gap-2">
        {CATEGORIES.map(c=>(
          <button key={c} onClick={()=>setFilter(c)}
            className={`rounded-xl px-3 py-1.5 text-[11px] font-medium transition-all ${filter===c?"bg-violet/15 text-violet-light":"bg-white/[0.03] text-[#374151] hover:text-[#64748b]"}`}>
            {c}
          </button>
        ))}
      </div>

      {/* Integration cards */}
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map(i=>{
          const cfg = STATUS_CONFIG[i.status];
          const StatusIcon = cfg.icon;
          return (
            <div key={i.name} className="rounded-2xl border border-white/[0.06] bg-[#0d0f1a] p-5 hover:border-white/[0.1] transition-all">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.04] text-xl">{i.icon}</div>
                  <div>
                    <p className="font-semibold text-white text-sm">{i.name}</p>
                    <p className="text-[10px] text-[#374151]">{i.category}</p>
                  </div>
                </div>
                <div className={`flex items-center gap-1.5 rounded-full px-2.5 py-0.5 ${cfg.bg}`}>
                  <StatusIcon className={`h-3 w-3 ${cfg.color}`} />
                  <span className={`text-[9px] font-bold uppercase tracking-wide ${cfg.color}`}>{cfg.label}</span>
                </div>
              </div>
              <p className="mt-3 text-[12px] leading-relaxed text-[#64748b]">{i.description}</p>
              {i.events > 0 && (
                <p className="mt-2 text-[11px] text-[#374151]">{i.events.toLocaleString()} events today</p>
              )}
              <div className="mt-4 flex gap-2">
                {i.status === "connected" ? (
                  <button className="flex-1 rounded-xl border border-white/[0.06] py-1.5 text-[11px] text-[#374151] hover:text-slate-300 hover:border-white/[0.1] transition-colors">Configure</button>
                ) : (
                  <button className="flex-1 rounded-xl bg-violet/10 py-1.5 text-[11px] font-medium text-violet-light hover:bg-violet/20 transition-colors">Connect</button>
                )}
                <button className="flex items-center justify-center rounded-xl border border-white/[0.06] px-3 py-1.5 text-[#374151] hover:text-slate-300 transition-colors">
                  <ExternalLink className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </AppLayout>
  );
}
