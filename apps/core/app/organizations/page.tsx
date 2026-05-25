"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AppLayout } from "@/components/app-layout";
import {
  Building2, Users, Plus, ChevronRight, Mail, Coins,
  BarChart3, ShieldCheck, Crown, Star, Zap,
  CreditCard, Activity, Clock, CheckCircle2,
  AlertCircle, ArrowUpRight, X, Send,
} from "lucide-react";

/* ── types ───────────────────────────────────────────────── */
interface Org {
  id: string; name: string; plan: "Enterprise" | "Growth" | "Starter";
  members: number; apiCalls: number; storage: string; created: string;
  status: "active" | "suspended"; kenuxBalance: number; aiTokens: string;
  monthlySpend: number;
}
interface Member {
  name: string; email: string; role: string;
  joined: string; lastSeen: string; avatar: string;
}
interface AuditEntry {
  action: string; actor: string; target: string; time: string; level: "ok" | "warn" | "error";
}

/* ── data ────────────────────────────────────────────────── */
const ORGS: Org[] = [
  { id: "org_k1", name: "KENUXA Systems",    plan: "Enterprise", members: 8,  apiCalls: 12400, storage: "4.2 GB", created: "Jan 2025", status: "active",    kenuxBalance: 147800, aiTokens: "2.4M",  monthlySpend: 148 },
  { id: "org_k2", name: "Accra FinTech Co.", plan: "Growth",     members: 12, apiCalls: 3840,  storage: "1.8 GB", created: "Mar 2025", status: "active",    kenuxBalance: 24100,  aiTokens: "890K",  monthlySpend: 24 },
  { id: "org_k3", name: "Lagos Ventures",    plan: "Starter",    members: 3,  apiCalls: 420,   storage: "340 MB", created: "May 2025", status: "active",    kenuxBalance: 4200,   aiTokens: "124K",  monthlySpend: 4 },
];

const MEMBERS: Member[] = [
  { name: "Shailendra Kumar",  email: "shailendra@procusghana.com", role: "super_admin",     joined: "Jan 2025", lastSeen: "Now",    avatar: "S" },
  { name: "Amara Diallo",      email: "amara@kenuxa.io",            role: "org_admin",        joined: "Feb 2025", lastSeen: "2h ago", avatar: "A" },
  { name: "Kofi Mensah",       email: "kofi@kenuxa.io",             role: "analyst",          joined: "Mar 2025", lastSeen: "1d ago", avatar: "K" },
  { name: "Fatima Al-Rashidi", email: "fatima@kenuxa.io",           role: "operator",         joined: "Apr 2025", lastSeen: "3d ago", avatar: "F" },
  { name: "Nia Owusu",         email: "nia@kenuxa.io",              role: "contributor",      joined: "May 2025", lastSeen: "1w ago", avatar: "N" },
];

const AUDIT: AuditEntry[] = [
  { action: "member.invited",       actor: "Shailendra K.",  target: "amara@kenuxa.io",      time: "2h ago",  level: "ok"    },
  { action: "api_key.created",      actor: "Shailendra K.",  target: "key_prod_core_01",     time: "6h ago",  level: "ok"    },
  { action: "org.plan.upgraded",    actor: "Billing System", target: "Enterprise",           time: "1d ago",  level: "ok"    },
  { action: "member.role.changed",  actor: "Shailendra K.",  target: "Kofi → analyst",       time: "2d ago",  level: "warn"  },
  { action: "api_key.deleted",      actor: "Amara D.",       target: "key_test_reach_02",    time: "4d ago",  level: "warn"  },
  { action: "wallet.credit",        actor: "Billing System", target: "+50000 KENUX",         time: "5d ago",  level: "ok"    },
  { action: "suspicious.login",     actor: "System",         target: "Unknown IP 41.x.x.x",  time: "7d ago",  level: "error" },
];

const PLAN_ICONS: Record<string, React.ElementType> = {
  Enterprise: Crown, Growth: Star, Starter: Zap,
};

const PLAN_COLORS: Record<string, string> = {
  Enterprise: "border-violet/40 bg-violet/10 text-violet-light",
  Growth:     "border-cyan-500/30 bg-cyan-500/10 text-cyan-400",
  Starter:    "border-white/[0.1] bg-white/[0.04] text-[#64748b]",
};

const ROLE_COLORS: Record<string, string> = {
  super_admin:  "bg-violet/15 text-violet-light ring-violet/25",
  org_admin:    "bg-cyan-500/10 text-cyan-400 ring-cyan-500/20",
  operator:     "bg-amber-400/10 text-amber-400 ring-amber-400/20",
  analyst:      "bg-emerald/10 text-emerald ring-emerald/20",
  contributor:  "bg-white/[0.04] text-[#64748b] ring-white/10",
};

type Tab = "overview" | "members" | "billing" | "audit";

/* ── invite modal ────────────────────────────────────────── */
function InviteModal({ onClose }: { onClose: () => void }) {
  const [email, setEmail] = useState("");
  const [role, setRole]   = useState("contributor");
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-md rounded-2xl border border-white/[0.08] bg-[#0d0f1a] p-6 shadow-2xl"
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">Invite Team Member</h2>
          <button onClick={onClose} className="text-[#374151] hover:text-slate-300 transition-colors"><X className="h-4 w-4" /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-[11px] font-medium text-[#94a3b8]">Email address</label>
            <input value={email} onChange={e => setEmail(e.target.value)} placeholder="colleague@company.com"
              className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-[13px] text-white placeholder-[#374151] outline-none focus:border-violet/50" />
          </div>
          <div>
            <label className="mb-1.5 block text-[11px] font-medium text-[#94a3b8]">Role</label>
            <div className="grid grid-cols-2 gap-2">
              {(["contributor","analyst","operator","org_admin"] as const).map(r => (
                <button key={r} onClick={() => setRole(r)}
                  className={`rounded-xl border px-3 py-2 text-[11px] font-medium capitalize transition-all ${role === r ? "border-violet/40 bg-violet/10 text-violet-light" : "border-white/[0.06] text-[#374151] hover:border-white/[0.1]"}`}>
                  {r.replace("_", " ")}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-6 flex gap-3">
          <button onClick={onClose} className="flex-1 rounded-xl border border-white/[0.07] py-2.5 text-[12px] font-medium text-[#64748b] hover:text-slate-300 transition-colors">Cancel</button>
          <button onClick={onClose} className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-violet py-2.5 text-[12px] font-semibold text-white hover:bg-violet/90 transition-colors">
            <Send className="h-3.5 w-3.5" />Send Invite
          </button>
        </div>
      </motion.div>
    </div>
  );
}

/* ── page ────────────────────────────────────────────────── */
export default function OrgsPage() {
  const [selectedOrg, setSelectedOrg] = useState<Org>(ORGS[0]);
  const [tab,         setTab]         = useState<Tab>("overview");
  const [showInvite,  setShowInvite]  = useState(false);

  const PlanIcon = PLAN_ICONS[selectedOrg.plan];

  return (
    <AppLayout
      title="Organizations"
      description="Multi-tenant organization management, access control, and billing"
      actions={
        <button onClick={() => setShowInvite(true)} className="flex items-center gap-2 rounded-xl bg-violet px-4 py-2 text-[12px] font-semibold text-white hover:bg-violet/90 transition-colors">
          <Plus className="h-3.5 w-3.5" />New Org
        </button>
      }
    >
      {/* ── Global stats ── */}
      <div className="grid gap-4 sm:grid-cols-4">
        {[
          { l: "Organizations",   v: "3",       icon: Building2,  color: "text-violet-light bg-violet/10 ring-violet/20" },
          { l: "Total Members",   v: "23",       icon: Users,      color: "text-cyan-400 bg-cyan-500/10 ring-cyan-500/20" },
          { l: "API Calls/mo",    v: "16.7K",    icon: Activity,   color: "text-emerald bg-emerald/10 ring-emerald/20" },
          { l: "KENUX Circulating", v: "176.1K", icon: Coins,      color: "text-amber-400 bg-amber-500/10 ring-amber-500/20" },
        ].map(({ l, v, icon: Icon, color }) => (
          <div key={l} className="rounded-2xl border border-white/[0.06] bg-[#0d0f1a] p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-[#374151]">{l}</p>
                <p className="mt-2 text-2xl font-bold text-white">{v}</p>
              </div>
              <div className={`flex h-9 w-9 items-center justify-center rounded-xl ring-1 ${color}`}>
                <Icon className="h-4 w-4" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 flex gap-6">
        {/* ── Org sidebar ── */}
        <div className="w-72 flex-shrink-0 space-y-2">
          {ORGS.map(org => {
            const OrgPlanIcon = PLAN_ICONS[org.plan];
            return (
              <motion.button
                key={org.id}
                whileHover={{ x: 2 }}
                onClick={() => { setSelectedOrg(org); setTab("overview"); }}
                className={`w-full rounded-2xl border p-4 text-left transition-all ${
                  selectedOrg.id === org.id
                    ? "border-violet/40 bg-violet/[0.06] shadow-[0_0_20px_rgba(124,58,237,0.1)]"
                    : "border-white/[0.06] bg-[#0d0f1a] hover:border-white/[0.1]"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className={`flex h-9 w-9 items-center justify-center rounded-xl border ${
                      selectedOrg.id === org.id ? "border-violet/30 bg-violet/10" : "border-white/[0.06] bg-white/[0.03]"
                    }`}>
                      <Building2 className={`h-4 w-4 ${selectedOrg.id === org.id ? "text-violet-light" : "text-[#64748b]"}`} />
                    </div>
                    <div>
                      <p className="text-[13px] font-semibold text-white leading-tight">{org.name}</p>
                      <div className={`mt-0.5 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[8px] font-bold uppercase tracking-wide ${PLAN_COLORS[org.plan]}`}>
                        <OrgPlanIcon className="h-2.5 w-2.5" />{org.plan}
                      </div>
                    </div>
                  </div>
                  <ChevronRight className={`h-3.5 w-3.5 flex-shrink-0 transition-colors ${selectedOrg.id === org.id ? "text-violet-light" : "text-[#374151]"}`} />
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-[10px] text-[#374151]">
                  <div className="flex items-center gap-1">
                    <Users className="h-3 w-3" />{org.members} members
                  </div>
                  <div className="flex items-center gap-1">
                    <Coins className="h-3 w-3 text-amber-400/60" />
                    {(org.kenuxBalance / 1000).toFixed(1)}K KENUX
                  </div>
                </div>
              </motion.button>
            );
          })}
        </div>

        {/* ── Detail panel ── */}
        <div className="flex-1 min-w-0 space-y-4">
          {/* Header card */}
          <div className="rounded-2xl border border-white/[0.06] bg-[#0d0f1a] p-5">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-4">
                <motion.div
                  animate={{ boxShadow: ["0 0 20px rgba(124,58,237,0.2)", "0 0 35px rgba(124,58,237,0.35)", "0 0 20px rgba(124,58,237,0.2)"] }}
                  transition={{ duration: 3, repeat: Infinity }}
                  className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet/10 ring-1 ring-violet/25"
                >
                  <Building2 className="h-7 w-7 text-violet-light" />
                </motion.div>
                <div>
                  <div className="flex items-center gap-2.5">
                    <h2 className="text-lg font-bold text-white">{selectedOrg.name}</h2>
                    <div className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[9px] font-bold uppercase tracking-wide ${PLAN_COLORS[selectedOrg.plan]}`}>
                      <PlanIcon className="h-2.5 w-2.5" />{selectedOrg.plan}
                    </div>
                  </div>
                  <p className="mt-0.5 font-mono text-[10px] text-[#374151]">{selectedOrg.id}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 rounded-full bg-emerald/10 px-3 py-1 text-[10px] font-semibold text-emerald">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald animate-pulse" />Active
                </div>
                <button onClick={() => setShowInvite(true)} className="flex items-center gap-1.5 rounded-xl border border-white/[0.07] px-3 py-1.5 text-[11px] font-medium text-[#64748b] hover:text-slate-300 hover:border-white/[0.12] transition-all">
                  <Mail className="h-3.5 w-3.5" />Invite
                </button>
              </div>
            </div>

            {/* Metrics row */}
            <div className="mt-4 grid grid-cols-5 gap-3">
              {[
                { l: "Members",        v: String(selectedOrg.members) },
                { l: "API Calls/mo",   v: selectedOrg.apiCalls.toLocaleString() },
                { l: "Storage",        v: selectedOrg.storage },
                { l: "KENUX Balance",  v: `${(selectedOrg.kenuxBalance / 1000).toFixed(1)}K` },
                { l: "Monthly Spend",  v: `$${selectedOrg.monthlySpend}` },
              ].map(({ l, v }) => (
                <div key={l} className="rounded-xl bg-white/[0.02] px-3 py-2.5">
                  <p className="text-[9px] text-[#374151]">{l}</p>
                  <p className="mt-1 text-[13px] font-bold text-white">{v}</p>
                </div>
              ))}
            </div>

            {/* Tabs */}
            <div className="mt-4 flex border-t border-white/[0.05] pt-4 gap-1">
              {(["overview","members","billing","audit"] as Tab[]).map(t => (
                <button key={t} onClick={() => setTab(t)}
                  className={`rounded-xl px-4 py-1.5 text-[11px] font-semibold capitalize transition-all ${
                    tab === t ? "bg-violet/15 text-violet-light" : "text-[#374151] hover:text-[#64748b]"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <AnimatePresence mode="wait">
            {/* ── OVERVIEW tab ── */}
            {tab === "overview" && (
              <motion.div key="overview" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
                {/* Quotas */}
                <div className="rounded-2xl border border-white/[0.06] bg-[#0d0f1a] p-5">
                  <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.15em] text-[#64748b]">Resource Quotas</p>
                  <div className="space-y-4">
                    {[
                      { l: "API Calls",   used: selectedOrg.apiCalls, max: 50000, unit: "" },
                      { l: "Storage",     used: 4.2,                  max: 10,    unit: " GB" },
                      { l: "AI Tokens",   used: 2.4,                  max: 10,    unit: "M" },
                      { l: "Members",     used: selectedOrg.members,  max: 20,    unit: "" },
                    ].map(({ l, used, max, unit }) => {
                      const pct = Math.min(100, (used / max) * 100);
                      const barColor = pct > 90 ? "bg-red-400" : pct > 75 ? "bg-amber-400" : "bg-gradient-to-r from-violet to-violet-light";
                      return (
                        <div key={l}>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[12px] font-medium text-slate-300">{l}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] text-[#374151]">{used}{unit} / {max}{unit}</span>
                              <span className={`text-[10px] font-bold ${pct > 90 ? "text-red-400" : pct > 75 ? "text-amber-400" : "text-emerald"}`}>{pct.toFixed(0)}%</span>
                            </div>
                          </div>
                          <div className="h-2 w-full overflow-hidden rounded-full bg-white/[0.06]">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${pct}%` }}
                              transition={{ duration: 0.8, ease: "easeOut" }}
                              className={`h-full rounded-full ${barColor}`}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* KENUX wallet summary */}
                <div className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.04] p-5">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-amber-400/80">KENUX Wallet</p>
                    <a href="/wallet" className="flex items-center gap-1 text-[11px] text-amber-400 hover:underline">
                      View wallet <ArrowUpRight className="h-3 w-3" />
                    </a>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { l: "Balance",        v: `${selectedOrg.kenuxBalance.toLocaleString()} KENUX` },
                      { l: "AI compute",     v: `${selectedOrg.aiTokens} tokens` },
                      { l: "30-day spend",   v: `${(selectedOrg.monthlySpend * 1000).toLocaleString()} KENUX` },
                    ].map(({ l, v }) => (
                      <div key={l} className="rounded-xl border border-amber-500/15 bg-amber-500/[0.06] px-3 py-3">
                        <p className="text-[9px] text-amber-400/60">{l}</p>
                        <p className="mt-1 text-[13px] font-bold text-white">{v}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* ── MEMBERS tab ── */}
            {tab === "members" && (
              <motion.div key="members" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <div className="rounded-2xl border border-white/[0.06] bg-[#0d0f1a] p-5">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#64748b]">
                      {selectedOrg.members} Members
                    </p>
                    <button onClick={() => setShowInvite(true)} className="flex items-center gap-1.5 text-[11px] text-violet-light hover:underline">
                      <Mail className="h-3 w-3" />Invite member
                    </button>
                  </div>
                  <div className="space-y-1">
                    {MEMBERS.map(m => (
                      <div key={m.email} className="group flex items-center gap-4 rounded-xl px-3 py-3 hover:bg-white/[0.02] transition-colors">
                        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet/30 to-indigo/20 text-sm font-bold text-violet-light ring-1 ring-violet/20">
                          {m.avatar}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-medium text-white">{m.name}</p>
                          <p className="text-[11px] text-[#374151]">{m.email}</p>
                        </div>
                        <span className={`rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ring-1 ${ROLE_COLORS[m.role] ?? "bg-white/[0.04] text-[#64748b] ring-white/10"}`}>
                          {m.role.replace(/_/g, " ")}
                        </span>
                        <div className="text-right">
                          <p className="text-[10px] text-[#374151]">Last seen</p>
                          <p className="text-[11px] text-slate-400">{m.lastSeen}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* ── BILLING tab ── */}
            {tab === "billing" && (
              <motion.div key="billing" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
                <div className="rounded-2xl border border-white/[0.06] bg-[#0d0f1a] p-5">
                  <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.15em] text-[#64748b]">Current Plan</p>
                  <div className={`flex items-center justify-between rounded-xl border p-4 ${PLAN_COLORS[selectedOrg.plan]}`}>
                    <div className="flex items-center gap-3">
                      <PlanIcon className="h-5 w-5" />
                      <div>
                        <p className="font-bold text-white">{selectedOrg.plan} Plan</p>
                        <p className="text-[11px] opacity-70">Billed monthly · Next renewal in 6 days</p>
                      </div>
                    </div>
                    <button className="flex items-center gap-1.5 rounded-xl bg-white/10 px-3 py-1.5 text-[11px] font-medium hover:bg-white/20 transition-colors">
                      <CreditCard className="h-3.5 w-3.5" />Manage
                    </button>
                  </div>
                </div>
                <div className="rounded-2xl border border-white/[0.06] bg-[#0d0f1a] p-5">
                  <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.15em] text-[#64748b]">Usage This Month</p>
                  <div className="space-y-3">
                    {[
                      { l: "API calls",       used: "12,400",   limit: "50,000",  pct: 25 },
                      { l: "AI compute",      used: "2.4M tok", limit: "10M tok", pct: 24 },
                      { l: "Automation runs", used: "847",      limit: "5,000",   pct: 17 },
                      { l: "Webhooks",        used: "3,241",    limit: "25,000",  pct: 13 },
                    ].map(({ l, used, limit, pct }) => (
                      <div key={l} className="flex items-center gap-4">
                        <div className="w-32 flex-shrink-0">
                          <p className="text-[12px] text-[#64748b]">{l}</p>
                          <p className="text-[10px] text-[#374151]">{used} / {limit}</p>
                        </div>
                        <div className="flex-1 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                          <div className="h-full rounded-full bg-gradient-to-r from-violet to-violet-light" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="w-8 text-right text-[10px] text-[#374151]">{pct}%</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded-2xl border border-white/[0.06] bg-[#0d0f1a] p-5">
                  <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.15em] text-[#64748b]">Invoice History</p>
                  <div className="space-y-2">
                    {[
                      { period: "May 2026", amount: `$${selectedOrg.monthlySpend}`, status: "paid" },
                      { period: "Apr 2026", amount: `$${selectedOrg.monthlySpend}`, status: "paid" },
                      { period: "Mar 2026", amount: `$${Math.round(selectedOrg.monthlySpend * 0.9)}`, status: "paid" },
                    ].map(({ period, amount, status }) => (
                      <div key={period} className="flex items-center justify-between rounded-xl bg-white/[0.02] px-4 py-3">
                        <div className="flex items-center gap-3">
                          <BarChart3 className="h-4 w-4 text-[#374151]" />
                          <div>
                            <p className="text-[13px] font-medium text-white">{period}</p>
                            <p className="text-[10px] text-[#374151]">Monthly subscription</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-[13px] font-semibold text-white">{amount}</span>
                          <span className="rounded-full bg-emerald/10 px-2.5 py-0.5 text-[9px] font-bold uppercase text-emerald">{status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* ── AUDIT tab ── */}
            {tab === "audit" && (
              <motion.div key="audit" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <div className="rounded-2xl border border-white/[0.06] bg-[#0d0f1a] p-5">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#64748b]">Audit Trail</p>
                    <div className="flex items-center gap-1.5">
                      <ShieldCheck className="h-3.5 w-3.5 text-emerald" />
                      <span className="text-[10px] text-[#374151]">Immutable log</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    {AUDIT.map((e, i) => (
                      <div key={i} className="flex items-center gap-3 rounded-xl px-3 py-3 hover:bg-white/[0.02] transition-colors">
                        {e.level === "ok"    && <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0 text-emerald" />}
                        {e.level === "warn"  && <AlertCircle  className="h-3.5 w-3.5 flex-shrink-0 text-amber-400" />}
                        {e.level === "error" && <AlertCircle  className="h-3.5 w-3.5 flex-shrink-0 text-red-400" />}
                        <div className="flex-1 min-w-0 grid grid-cols-3 gap-3">
                          <span className="font-mono text-[11px] text-slate-300">{e.action}</span>
                          <span className="text-[11px] text-[#64748b] truncate">{e.actor}</span>
                          <span className="text-[11px] text-[#374151] truncate">{e.target}</span>
                        </div>
                        <div className="flex items-center gap-1 text-[10px] text-[#374151]">
                          <Clock className="h-3 w-3" />{e.time}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <AnimatePresence>
        {showInvite && <InviteModal onClose={() => setShowInvite(false)} />}
      </AnimatePresence>
    </AppLayout>
  );
}
