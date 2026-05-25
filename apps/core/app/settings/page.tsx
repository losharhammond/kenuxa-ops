"use client";

import { useState } from "react";
import { AppLayout } from "@/components/app-layout";
import { Settings, Shield, Bell, Cpu, Database, Save, ChevronRight } from "lucide-react";

type SettingsTab = "general" | "security" | "ai" | "notifications" | "data";

const TABS: { key: SettingsTab; label: string; icon: React.ElementType }[] = [
  { key: "general",       label: "General",       icon: Settings  },
  { key: "security",      label: "Security",      icon: Shield    },
  { key: "ai",            label: "AI & Models",   icon: Cpu       },
  { key: "notifications", label: "Notifications", icon: Bell      },
  { key: "data",          label: "Data & Storage",icon: Database  },
];

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!value)}
      className={`relative h-5 w-9 rounded-full transition-colors ${value ? "bg-violet" : "bg-white/[0.1]"}`}>
      <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${value ? "translate-x-4" : "translate-x-0.5"}`} />
    </button>
  );
}

function SettingRow({ label, description, children }: { label: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-6 rounded-xl px-4 py-3.5 hover:bg-white/[0.02] transition-colors">
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-medium text-white">{label}</p>
        {description && <p className="mt-0.5 text-[11px] text-[#374151]">{description}</p>}
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-[#0d0f1a] p-5">
      <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.15em] text-[#64748b]">{title}</p>
      <div className="divide-y divide-white/[0.04]">{children}</div>
    </div>
  );
}

export default function SettingsPage() {
  const [tab, setTab] = useState<SettingsTab>("general");

  const [generalSettings, setGeneralSettings] = useState({
    platformName: "KENUXA CORE",
    defaultProduct: "REACH",
    timezone: "Africa/Accra",
    language: "en",
  });

  const [securitySettings, setSecuritySettings] = useState({
    mfa:             true,
    sessionTimeout:  true,
    auditLogs:       true,
    ipRestriction:   false,
    rateLimiting:    true,
  });

  const [aiSettings, setAiSettings] = useState({
    groqPrimary:        true,
    openrouterEnabled:  true,
    geminiEnabled:      true,
    openaiBackup:       true,
    anthropicBackup:    true,
    ollamaEnabled:      false,
    streamResponses:    true,
    cachePrompts:       true,
    usageTracking:      true,
    defaultModel:       "llama3-70b-8192",
    maxTokens:          "8192",
  });

  const [notifSettings, setNotifSettings] = useState({
    errorAlerts:    true,
    weeklyDigest:   true,
    securityAlerts: true,
    usageAlerts:    false,
    slackWebhook:   false,
  });

  const [dataSettings, setDataSettings] = useState({
    vectorAutoindex:  true,
    memoryRetention:  true,
    graphAutoEnrich:  false,
    backupEnabled:    true,
    retentionDays:    "365",
  });

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const toggle = (setter: React.Dispatch<React.SetStateAction<any>>, key: string) =>
    (v: boolean) => setter((s: any) => ({ ...s, [key]: v }));
  /* eslint-enable @typescript-eslint/no-explicit-any */

  return (
    <AppLayout title="Settings" description="Platform configuration and system preferences"
      actions={<button className="flex items-center gap-2 rounded-xl bg-violet px-4 py-2 text-[12px] font-semibold text-white hover:bg-violet/90 transition-colors"><Save className="h-3.5 w-3.5" />Save Changes</button>}>
      <div className="flex gap-6">
        {/* Sidebar nav */}
        <div className="w-48 flex-shrink-0 space-y-1">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => setTab(key)}
              className={`w-full flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-left transition-all ${tab === key ? "bg-violet/15 text-violet-light" : "text-[#64748b] hover:bg-white/[0.03] hover:text-slate-300"}`}>
              <Icon className="h-3.5 w-3.5 flex-shrink-0" />
              <span className="text-[12px] font-medium">{label}</span>
              {tab === key && <ChevronRight className="ml-auto h-3 w-3 text-violet/60" />}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-4">
          {tab === "general" && (
            <>
              <Section title="Platform Identity">
                <SettingRow label="Platform Name" description="Displayed in UI and emails">
                  <input value={generalSettings.platformName} onChange={e=>setGeneralSettings(s=>({...s,platformName:e.target.value}))}
                    className="w-40 rounded-xl border border-white/[0.07] bg-[#111624] px-3 py-1.5 text-[12px] text-slate-300 focus:border-violet/40 focus:outline-none" />
                </SettingRow>
                <SettingRow label="Default Product" description="Landing product after login">
                  <select value={generalSettings.defaultProduct} onChange={e=>setGeneralSettings(s=>({...s,defaultProduct:e.target.value}))}
                    className="rounded-xl border border-white/[0.07] bg-[#111624] px-3 py-1.5 text-[12px] text-[#64748b] focus:border-violet/40 focus:outline-none">
                    {["REACH","VOICE","ACADEMY","OPS"].map(p=><option key={p} value={p}>{p}</option>)}
                  </select>
                </SettingRow>
                <SettingRow label="Timezone" description="Used for scheduled tasks and reports">
                  <select value={generalSettings.timezone} onChange={e=>setGeneralSettings(s=>({...s,timezone:e.target.value}))}
                    className="rounded-xl border border-white/[0.07] bg-[#111624] px-3 py-1.5 text-[12px] text-[#64748b] focus:border-violet/40 focus:outline-none">
                    {["Africa/Accra","Africa/Lagos","Africa/Nairobi","Africa/Cairo","UTC"].map(t=><option key={t} value={t}>{t}</option>)}
                  </select>
                </SettingRow>
              </Section>
              <Section title="Version Info">
                <SettingRow label="Platform Version" description="Current CORE release"><span className="font-mono text-[12px] text-[#64748b]">v2.0.0</span></SettingRow>
                <SettingRow label="Environment" description="Deployment environment"><span className="rounded-full bg-emerald/10 px-2.5 py-0.5 text-[10px] font-bold text-emerald">PRODUCTION</span></SettingRow>
                <SettingRow label="Last Deploy" description="Most recent deployment"><span className="text-[12px] text-[#64748b]">2026-05-24 14:32 UTC</span></SettingRow>
              </Section>
            </>
          )}

          {tab === "security" && (
            <>
              <Section title="Authentication">
                <SettingRow label="Multi-Factor Authentication" description="Require MFA for all admin users">
                  <Toggle value={securitySettings.mfa} onChange={toggle(setSecuritySettings, "mfa")} />
                </SettingRow>
                <SettingRow label="Session Timeout" description="Auto-logout after 8 hours of inactivity">
                  <Toggle value={securitySettings.sessionTimeout} onChange={toggle(setSecuritySettings, "sessionTimeout")} />
                </SettingRow>
                <SettingRow label="IP Restriction" description="Restrict access to allowlisted IP ranges">
                  <Toggle value={securitySettings.ipRestriction} onChange={toggle(setSecuritySettings, "ipRestriction")} />
                </SettingRow>
              </Section>
              <Section title="Monitoring">
                <SettingRow label="Audit Logs" description="Log all admin actions and API calls">
                  <Toggle value={securitySettings.auditLogs} onChange={toggle(setSecuritySettings, "auditLogs")} />
                </SettingRow>
                <SettingRow label="Rate Limiting" description="Global API rate limits per key">
                  <Toggle value={securitySettings.rateLimiting} onChange={toggle(setSecuritySettings, "rateLimiting")} />
                </SettingRow>
              </Section>
            </>
          )}

          {tab === "ai" && (
            <>
              <Section title="Provider Configuration">
                <SettingRow label="Groq (Primary)" description="Free-tier Groq inference — llama3, mixtral, gemma">
                  <Toggle value={aiSettings.groqPrimary} onChange={toggle(setAiSettings, "groqPrimary")} />
                </SettingRow>
                <SettingRow label="OpenRouter" description="Multi-model gateway with auto-routing and 100+ models">
                  <Toggle value={aiSettings.openrouterEnabled} onChange={toggle(setAiSettings, "openrouterEnabled")} />
                </SettingRow>
                <SettingRow label="Gemini" description="Google Gemini 1.5 Pro/Flash for multimodal tasks">
                  <Toggle value={aiSettings.geminiEnabled} onChange={toggle(setAiSettings, "geminiEnabled")} />
                </SettingRow>
                <SettingRow label="OpenAI (Backup)" description="Falls back to OpenAI when primary providers unavailable">
                  <Toggle value={aiSettings.openaiBackup} onChange={toggle(setAiSettings, "openaiBackup")} />
                </SettingRow>
                <SettingRow label="Anthropic (Backup)" description="Fifth-tier fallback for long-context tasks">
                  <Toggle value={aiSettings.anthropicBackup} onChange={toggle(setAiSettings, "anthropicBackup")} />
                </SettingRow>
                <SettingRow label="Ollama (Local)" description="Local model inference — requires OLLAMA_BASE_URL">
                  <Toggle value={aiSettings.ollamaEnabled} onChange={toggle(setAiSettings, "ollamaEnabled")} />
                </SettingRow>
              </Section>
              <Section title="Inference Settings">
                <SettingRow label="Default Model" description="Used when no model specified">
                  <select value={aiSettings.defaultModel} onChange={e=>setAiSettings(s=>({...s,defaultModel:e.target.value}))}
                    className="rounded-xl border border-white/[0.07] bg-[#111624] px-3 py-1.5 text-[12px] text-[#64748b] focus:border-violet/40 focus:outline-none">
                    {["llama3-70b-8192","llama3-8b-8192","mixtral-8x7b-32768","gemini-1.5-flash","openai/gpt-4o-mini","gemma-7b-it"].map(m=><option key={m} value={m}>{m}</option>)}
                  </select>
                </SettingRow>
                <SettingRow label="Max Tokens (default)" description="Context window ceiling">
                  <input value={aiSettings.maxTokens} onChange={e=>setAiSettings(s=>({...s,maxTokens:e.target.value}))}
                    className="w-24 rounded-xl border border-white/[0.07] bg-[#111624] px-3 py-1.5 text-[12px] text-[#64748b] focus:border-violet/40 focus:outline-none" />
                </SettingRow>
                <SettingRow label="Stream Responses" description="Enable streaming for real-time output">
                  <Toggle value={aiSettings.streamResponses} onChange={toggle(setAiSettings, "streamResponses")} />
                </SettingRow>
                <SettingRow label="Prompt Cache" description="Cache system prompts to reduce latency">
                  <Toggle value={aiSettings.cachePrompts} onChange={toggle(setAiSettings, "cachePrompts")} />
                </SettingRow>
                <SettingRow label="Usage Tracking" description="Log token usage per request">
                  <Toggle value={aiSettings.usageTracking} onChange={toggle(setAiSettings, "usageTracking")} />
                </SettingRow>
              </Section>
            </>
          )}

          {tab === "notifications" && (
            <Section title="Alert Channels">
              <SettingRow label="Error Alerts" description="Notify on system errors and failures">
                <Toggle value={notifSettings.errorAlerts} onChange={toggle(setNotifSettings, "errorAlerts")} />
              </SettingRow>
              <SettingRow label="Security Alerts" description="Suspicious activity and auth failures">
                <Toggle value={notifSettings.securityAlerts} onChange={toggle(setNotifSettings, "securityAlerts")} />
              </SettingRow>
              <SettingRow label="Weekly Digest" description="Performance summary every Monday 08:00">
                <Toggle value={notifSettings.weeklyDigest} onChange={toggle(setNotifSettings, "weeklyDigest")} />
              </SettingRow>
              <SettingRow label="Usage Alerts" description="Notify when quota thresholds reached">
                <Toggle value={notifSettings.usageAlerts} onChange={toggle(setNotifSettings, "usageAlerts")} />
              </SettingRow>
              <SettingRow label="Slack Webhook" description="Send alerts to Slack channel">
                <Toggle value={notifSettings.slackWebhook} onChange={toggle(setNotifSettings, "slackWebhook")} />
              </SettingRow>
            </Section>
          )}

          {tab === "data" && (
            <>
              <Section title="Memory & Vectors">
                <SettingRow label="Auto-Index Vectors" description="Vectorise new memory records automatically">
                  <Toggle value={dataSettings.vectorAutoindex} onChange={toggle(setDataSettings, "vectorAutoindex")} />
                </SettingRow>
                <SettingRow label="Memory Retention" description="Retain all memory records indefinitely">
                  <Toggle value={dataSettings.memoryRetention} onChange={toggle(setDataSettings, "memoryRetention")} />
                </SettingRow>
                <SettingRow label="Retention Period" description="Days to keep event and audit logs">
                  <input value={dataSettings.retentionDays} onChange={e=>setDataSettings(s=>({...s,retentionDays:e.target.value}))}
                    className="w-20 rounded-xl border border-white/[0.07] bg-[#111624] px-3 py-1.5 text-[12px] text-[#64748b] focus:border-violet/40 focus:outline-none" />
                </SettingRow>
              </Section>
              <Section title="Knowledge Graph">
                <SettingRow label="Auto-Enrich Nodes" description="Automatically enrich new nodes with web data">
                  <Toggle value={dataSettings.graphAutoEnrich} onChange={toggle(setDataSettings, "graphAutoEnrich")} />
                </SettingRow>
              </Section>
              <Section title="Backup">
                <SettingRow label="Automated Backups" description="Daily Supabase backup to secure storage">
                  <Toggle value={dataSettings.backupEnabled} onChange={toggle(setDataSettings, "backupEnabled")} />
                </SettingRow>
                <SettingRow label="Last Backup" description="Most recent successful backup">
                  <span className="text-[12px] text-[#64748b]">2026-05-25 02:00 UTC</span>
                </SettingRow>
              </Section>
            </>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
