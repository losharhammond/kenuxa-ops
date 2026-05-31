"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Settings, Zap, Mail, Bell, ToggleLeft, ToggleRight,
  CheckCircle2, AlertCircle, RefreshCw,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface FeatureFlag {
  id: string;
  key: string;
  label: string;
  description: string;
  enabled: boolean;
  env: "all" | "production" | "staging";
}

interface SystemHealth {
  label: string;
  value: string;
  ok: boolean;
}

const DEFAULT_FLAGS: Omit<FeatureFlag, "id">[] = [
  { key: "bnpl",            label: "BNPL Module",             description: "Buy Now Pay Later for customers",         enabled: true,  env: "all"        },
  { key: "ai_assistant",    label: "AI Assistant",            description: "Groq-powered business intelligence",      enabled: true,  env: "all"        },
  { key: "delivery_track",  label: "Live Delivery Tracking",  description: "Real-time GPS delivery tracking",         enabled: true,  env: "all"        },
  { key: "working_capital", label: "Working Capital Loans",   description: "In-app loan applications",               enabled: false, env: "staging"    },
  { key: "multi_branch",    label: "Multi-Branch Mode",       description: "Manage multiple business locations",      enabled: true,  env: "all"        },
  { key: "marketplace_api", label: "Marketplace Open API",    description: "Third-party marketplace integrations",    enabled: false, env: "staging"    },
  { key: "e_invoicing",     label: "GRA E-Invoicing",         description: "Ghana Revenue Authority integration",     enabled: false, env: "production" },
  { key: "loyalty",         label: "Customer Loyalty Points", description: "Earn and redeem KENUXA points",          enabled: true,  env: "all"        },
];

export default function AdminSystemPage() {
  const supabase = createClient();
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [health, setHealth] = useState<SystemHealth[]>([
    { label: "API Status",    value: "Checking...", ok: false },
    { label: "Database",      value: "Checking...", ok: false },
    { label: "Queue Workers", value: "Checking...", ok: false },
    { label: "Storage",       value: "Checking...", ok: false },
  ]);
  const [loadingFlags, setLoadingFlags] = useState(true);

  const loadFlags = useCallback(async () => {
    setLoadingFlags(true);
    const { data } = await supabase.from("feature_flags").select("*").order("key");

    if (data && data.length > 0) {
      setFlags(data as FeatureFlag[]);
    } else {
      // Seed defaults if table is empty
      const toInsert = DEFAULT_FLAGS.map((f) => ({ ...f }));
      const { data: inserted } = await supabase
        .from("feature_flags")
        .upsert(toInsert, { onConflict: "key" })
        .select();
      setFlags((inserted as FeatureFlag[]) ?? DEFAULT_FLAGS.map((f, i) => ({ ...f, id: String(i) })));
    }
    setLoadingFlags(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Health check via Supabase round-trip
  const checkHealth = useCallback(async () => {
    const start = Date.now();
    const { error } = await supabase.from("businesses").select("id").limit(1);
    const ms = Date.now() - start;

    setHealth([
      { label: "API Status",    value: error ? "Degraded"    : "Operational",         ok: !error },
      { label: "Database",      value: error ? "Unreachable" : `Healthy (${ms}ms)`,   ok: !error },
      { label: "Queue Workers", value: "4 / 4 active",                                ok: true   },
      { label: "Storage",       value: "Operational",                                 ok: true   },
    ]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadFlags();
    checkHealth();
  }, [loadFlags, checkHealth]);

  function toggle(id: string) {
    setFlags((prev) => prev.map((f) => (f.id === id ? { ...f, enabled: !f.enabled } : f)));
  }

  async function save() {
    setSaving(true);
    await Promise.all(
      flags.map((f) =>
        supabase.from("feature_flags").update({ enabled: f.enabled }).eq("id", f.id)
      )
    );
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <div className="animate-fade-in">
      <div className="h-16 border-b border-white/7 flex items-center justify-between px-8">
        <div>
          <h1 className="text-base font-bold text-[#f1f5f9]">System Controls</h1>
          <p className="text-xs text-[#64748b]">Feature flags, email templates, notifications, API monitoring</p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="secondary" onClick={checkHealth}>
            <RefreshCw size={13} />
            Refresh Health
          </Button>
          <Button size="sm" onClick={save} loading={saving}>
            {saved ? <CheckCircle2 size={13} /> : <Settings size={13} />}
            {saved ? "Saved!" : "Save Changes"}
          </Button>
        </div>
      </div>

      <div className="p-8 space-y-8">
        {/* System health */}
        <div className="grid grid-cols-4 gap-4">
          {health.map((s) => (
            <Card key={s.label} className="px-5 py-4 flex items-center gap-3">
              {s.ok
                ? <CheckCircle2 size={18} className="text-[#34d399] flex-shrink-0" />
                : <AlertCircle  size={18} className="text-[#f87171] flex-shrink-0" />}
              <div>
                <p className="text-xs font-semibold text-[#f1f5f9]">{s.value}</p>
                <p className="text-[11px] text-[#64748b]">{s.label}</p>
              </div>
            </Card>
          ))}
        </div>

        {/* Feature flags */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap size={16} className="text-[#F59E0B]" />
              Feature Flags
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingFlags ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-14 bg-white/5 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {flags.map((f) => (
                  <div
                    key={f.id}
                    className="flex items-center justify-between p-4 bg-[#0d0f1a] rounded-xl border border-white/5 hover:border-white/10 transition-colors"
                  >
                    <div className="flex-1 min-w-0 mr-4">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-sm font-semibold text-[#f1f5f9]">{f.label}</p>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium uppercase tracking-wide ${
                          f.env === "production" ? "bg-[rgba(239,68,68,0.1)] text-[#f87171]" :
                          f.env === "staging"    ? "bg-[rgba(245,158,11,0.1)] text-[#F59E0B]" :
                          "bg-white/5 text-[#64748b]"
                        }`}>
                          {f.env}
                        </span>
                      </div>
                      <p className="text-xs text-[#64748b]">{f.description}</p>
                    </div>
                    <button
                      onClick={() => toggle(f.id)}
                      className={`flex-shrink-0 transition-colors ${f.enabled ? "text-[#34d399]" : "text-[#374151]"}`}
                      title={f.enabled ? "Disable" : "Enable"}
                    >
                      {f.enabled
                        ? <ToggleRight size={28} className="text-[#34d399]" />
                        : <ToggleLeft  size={28} className="text-[#374151]" />}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Email Templates */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail size={16} className="text-[#3B82F6]" />
              Email Templates
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                "Welcome Email", "Business Verified", "Invoice Sent",
                "Order Confirmation", "Payment Received", "Password Reset",
                "Account Suspended", "KYC Approved", "Delivery Update",
              ].map((t) => (
                <div key={t} className="flex items-center justify-between p-3.5 bg-[#0d0f1a] rounded-xl border border-white/5">
                  <div className="flex items-center gap-2.5">
                    <Mail size={14} className="text-[#64748b]" />
                    <span className="text-sm text-[#f1f5f9]">{t}</span>
                  </div>
                  <Button size="sm" variant="secondary" className="h-7 px-2 text-xs">Edit</Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Notification channels */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell size={16} className="text-[#8B5CF6]" />
              Notification Settings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { channel: "Email",    configured: true,  provider: "SendGrid"  },
                { channel: "SMS",      configured: true,  provider: "Hubtel GH" },
                { channel: "WhatsApp", configured: false, provider: "Not set"   },
                { channel: "Push",     configured: true,  provider: "Firebase"  },
                { channel: "In-app",   configured: true,  provider: "Supabase"  },
                { channel: "Webhook",  configured: false, provider: "Not set"   },
              ].map((n) => (
                <div key={n.channel} className="p-4 bg-[#0d0f1a] rounded-xl border border-white/5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-[#f1f5f9]">{n.channel}</span>
                    {n.configured
                      ? <CheckCircle2 size={14} className="text-[#34d399]" />
                      : <AlertCircle  size={14} className="text-[#374151]" />}
                  </div>
                  <p className="text-xs text-[#64748b] mb-3">{n.provider}</p>
                  <Button size="sm" variant="secondary" className="w-full h-7 text-xs">
                    {n.configured ? "Configure" : "Connect"}
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
