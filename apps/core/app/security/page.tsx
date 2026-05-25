"use client";

import { useState } from "react";
import { AppLayout } from "@/components/app-layout";
import {
  Shield, Monitor, Globe, AlertTriangle, CheckCircle2,
  Smartphone, Laptop, LogOut, Key, Eye, EyeOff, Lock,
} from "lucide-react";

// ─── Mock data ────────────────────────────────────────────────────────────────

const SESSIONS = [
  { id: "s1", device: "MacBook Pro",    browser: "Chrome 124", os: "macOS 14",    location: "Accra, GH",      ip: "196.201.xxx.xxx", current: true,  last: "Active now" },
  { id: "s2", device: "iPhone 15 Pro",  browser: "Safari 17",  os: "iOS 17",      location: "Lagos, NG",      ip: "197.210.xxx.xxx", current: false, last: "2 hours ago" },
  { id: "s3", device: "Windows Desktop",browser: "Edge 122",   os: "Windows 11",  location: "Unknown",        ip: "41.202.xxx.xxx",  current: false, last: "5 days ago" },
];

const AUDIT_ITEMS = [
  { action: "API key created",      resource: "kx_live_core_...",   time: "5 min ago",   status: "success", ip: "196.201.xxx" },
  { action: "Password changed",     resource: "account",            time: "2 days ago",  status: "success", ip: "196.201.xxx" },
  { action: "Login failed",         resource: "auth",               time: "3 days ago",  status: "failure", ip: "105.112.xxx" },
  { action: "2FA disabled",         resource: "account",            time: "1 week ago",  status: "warning", ip: "196.201.xxx" },
  { action: "New device login",     resource: "session",            time: "2 weeks ago", status: "success", ip: "197.210.xxx" },
];

const SECURITY_SCORE = 72;

// ─── Component ────────────────────────────────────────────────────────────────

export default function SecurityPage() {
  const [activeTab,   setActiveTab]   = useState<"overview" | "sessions" | "audit">("overview");
  const [showKey,     setShowKey]     = useState(false);
  const [mfaEnabled,  setMfaEnabled]  = useState(false);

  const scoreColor = SECURITY_SCORE >= 80 ? "text-emerald-400" : SECURITY_SCORE >= 60 ? "text-amber-400" : "text-red-400";

  return (
    <AppLayout title="Security Center" description="Identity protection and session management">

      <div className="p-6 space-y-6">

        {/* Security score */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="sm:col-span-1 rounded-xl border border-white/[0.06] bg-[#0d0f1a] p-5 flex items-center gap-4">
            <div className="relative flex h-16 w-16 items-center justify-center shrink-0">
              <svg className="h-16 w-16 -rotate-90" viewBox="0 0 64 64">
                <circle cx="32" cy="32" r="28" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="4" />
                <circle cx="32" cy="32" r="28" fill="none" strokeWidth="4"
                  stroke={SECURITY_SCORE >= 80 ? "#10b981" : SECURITY_SCORE >= 60 ? "#f59e0b" : "#ef4444"}
                  strokeDasharray={`${(SECURITY_SCORE / 100) * 175.9} 175.9`}
                  strokeLinecap="round"
                />
              </svg>
              <span className={`absolute text-lg font-bold ${scoreColor}`}>{SECURITY_SCORE}</span>
            </div>
            <div>
              <p className="text-[12px] font-semibold text-white">Security Score</p>
              <p className={`text-[11px] font-medium ${scoreColor}`}>{SECURITY_SCORE >= 80 ? "Strong" : SECURITY_SCORE >= 60 ? "Good" : "Weak"}</p>
            </div>
          </div>

          {[
            { label: "Active Sessions",   value: "3",    sub: "2 trusted devices",   icon: Monitor,  color: "text-cyan-400" },
            { label: "Recent Alerts",     value: "1",    sub: "1 failed login",       icon: AlertTriangle, color: "text-amber-400" },
          ].map(s => {
            const Icon = s.icon;
            return (
              <div key={s.label} className="rounded-xl border border-white/[0.06] bg-[#0d0f1a] p-5">
                <div className="flex items-center gap-2 mb-2">
                  <Icon className={`h-4 w-4 ${s.color}`} />
                  <span className="text-[12px] font-medium text-[#64748b]">{s.label}</span>
                </div>
                <p className="text-2xl font-bold text-white">{s.value}</p>
                <p className="text-[11px] text-[#374151]">{s.sub}</p>
              </div>
            );
          })}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 rounded-xl border border-white/[0.06] bg-[#0d0f1a] p-1">
          {[
            { key: "overview" as const, label: "Overview" },
            { key: "sessions" as const, label: "Sessions" },
            { key: "audit" as const,    label: "Audit Log" },
          ].map(t => (
            <button key={t.key} onClick={() => setActiveTab(t.key)} className={`flex-1 rounded-lg px-3 py-2 text-[12px] font-medium transition-all ${activeTab === t.key ? "bg-violet-600/20 text-violet-300 border border-violet-500/20" : "text-[#374151] hover:text-slate-400"}`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Overview */}
        {activeTab === "overview" && (
          <div className="space-y-3">
            {/* MFA */}
            <div className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-[#0d0f1a] px-5 py-4">
              <div className="flex items-center gap-3">
                <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${mfaEnabled ? "bg-emerald-500/10" : "bg-[#374151]/30"}`}>
                  <Smartphone className={`h-4 w-4 ${mfaEnabled ? "text-emerald-400" : "text-[#374151]"}`} />
                </div>
                <div>
                  <p className="text-[13px] font-medium text-white">Two-Factor Authentication</p>
                  <p className="text-[11px] text-[#374151]">{mfaEnabled ? "Enabled — Authenticator app" : "Not configured"}</p>
                </div>
              </div>
              <button
                onClick={() => setMfaEnabled(!mfaEnabled)}
                className={`rounded-xl px-4 py-2 text-[12px] font-semibold transition-all ${mfaEnabled ? "border border-red-500/20 text-red-400 hover:bg-red-500/10" : "bg-violet-600 text-white hover:bg-violet-500"}`}
              >
                {mfaEnabled ? "Disable" : "Enable"}
              </button>
            </div>

            {/* Password */}
            <div className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-[#0d0f1a] px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/10">
                  <Lock className="h-4 w-4 text-violet-400" />
                </div>
                <div>
                  <p className="text-[13px] font-medium text-white">Password</p>
                  <p className="text-[11px] text-[#374151]">Last changed 2 days ago</p>
                </div>
              </div>
              <button className="rounded-xl border border-white/[0.08] px-4 py-2 text-[12px] font-medium text-slate-300 hover:bg-white/[0.06] transition-colors">Change</button>
            </div>

            {/* Recovery key */}
            <div className="rounded-xl border border-white/[0.06] bg-[#0d0f1a] px-5 py-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10">
                    <Key className="h-4 w-4 text-amber-400" />
                  </div>
                  <div>
                    <p className="text-[13px] font-medium text-white">Recovery Key</p>
                    <p className="text-[11px] text-[#374151]">Store this safely — shown once</p>
                  </div>
                </div>
                <button onClick={() => setShowKey(!showKey)} className="text-[#374151] hover:text-slate-400 transition-colors">
                  {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <div className="rounded-lg bg-black/30 px-4 py-2.5 font-mono text-[12px] text-[#64748b] tracking-widest">
                {showKey ? "KENX-A4B2-9C7D-EF01-2345-6789-ABCD-EF01" : "•••• •••• •••• •••• •••• •••• •••• ••••"}
              </div>
            </div>

            {/* Score improvement tips */}
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-5">
              <h4 className="mb-3 flex items-center gap-2 text-[12px] font-semibold text-amber-400">
                <AlertTriangle className="h-3.5 w-3.5" />
                Improve Your Security Score
              </h4>
              <div className="space-y-2">
                {[
                  { done: true,  text: "Set a strong password" },
                  { done: false, text: "Enable two-factor authentication (+15 pts)" },
                  { done: true,  text: "Verified email address" },
                  { done: false, text: "Add a recovery phone number (+8 pts)" },
                  { done: false, text: "Review active sessions (+5 pts)" },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-2.5 text-[12px]">
                    {item.done
                      ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                      : <div className="h-3.5 w-3.5 rounded-full border border-amber-500/40 shrink-0" />}
                    <span className={item.done ? "text-[#374151] line-through" : "text-[#64748b]"}>{item.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Sessions */}
        {activeTab === "sessions" && (
          <div className="space-y-3">
            {SESSIONS.map(session => (
              <div key={session.id} className={`flex items-center gap-4 rounded-xl border px-5 py-4 transition-all ${session.current ? "border-violet-500/20 bg-violet-500/5" : "border-white/[0.06] bg-[#0d0f1a]"}`}>
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${session.device.includes("iPhone") ? "bg-cyan-500/10" : "bg-[#111624]"}`}>
                  {session.device.includes("iPhone")
                    ? <Smartphone className="h-4.5 w-4.5 text-cyan-400" />
                    : <Laptop className="h-4.5 w-4.5 text-slate-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-[13px] font-medium text-white truncate">{session.device}</p>
                    {session.current && <span className="rounded-full bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-bold text-emerald-400">Current</span>}
                  </div>
                  <p className="text-[11px] text-[#374151]">{session.browser} · {session.os}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Globe className="h-2.5 w-2.5 text-[#374151]" />
                    <p className="text-[11px] text-[#374151]">{session.location} · {session.ip}</p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[11px] text-[#64748b]">{session.last}</p>
                  {!session.current && (
                    <button className="mt-1 flex items-center gap-1 text-[11px] text-red-400 hover:text-red-300 transition-colors">
                      <LogOut className="h-3 w-3" /> Revoke
                    </button>
                  )}
                </div>
              </div>
            ))}
            <button className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-[12px] font-medium text-red-400 hover:bg-red-500/10 transition-all w-full justify-center">
              <LogOut className="h-3.5 w-3.5" />
              Sign out all other sessions
            </button>
          </div>
        )}

        {/* Audit log */}
        {activeTab === "audit" && (
          <div className="rounded-xl border border-white/[0.06] bg-[#0d0f1a] overflow-hidden">
            <div className="border-b border-white/[0.06] px-5 py-3.5">
              <h3 className="text-[12px] font-semibold text-white uppercase tracking-[0.1em]">Recent Activity</h3>
            </div>
            <div className="divide-y divide-white/[0.04]">
              {AUDIT_ITEMS.map((item, i) => (
                <div key={i} className="flex items-center gap-3.5 px-5 py-3.5 hover:bg-white/[0.02] transition-colors">
                  <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                    item.status === "success" ? "bg-emerald-500/10" :
                    item.status === "failure" ? "bg-red-500/10" : "bg-amber-500/10"
                  }`}>
                    {item.status === "success" ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> :
                     item.status === "failure" ? <AlertTriangle className="h-3.5 w-3.5 text-red-400" /> :
                                                 <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-white truncate">{item.action}</p>
                    <p className="text-[11px] text-[#374151]">{item.resource} · {item.ip}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[11px] text-[#374151]">{item.time}</p>
                    <div className={`mt-0.5 flex items-center justify-end gap-1 ${
                      item.status === "success" ? "text-emerald-400" :
                      item.status === "failure" ? "text-red-400" : "text-amber-400"
                    }`}>
                      <Shield className="h-2.5 w-2.5" />
                      <span className="text-[10px] font-medium capitalize">{item.status}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
