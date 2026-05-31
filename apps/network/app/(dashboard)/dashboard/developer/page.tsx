"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/hooks/use-auth";
import {
  Code2, Key, Plus, Copy, Eye, EyeOff, Trash2, CheckCircle2,
  AlertCircle, Zap, Globe, Shield, BarChart2, Book, ExternalLink,
  Terminal, Webhook, RefreshCw, Clock, TrendingUp, Loader2,
  ChevronRight, ChevronDown, ChevronUp, Lock, Sparkles, Briefcase,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface ApiKey {
  id: string;
  name: string;
  key_prefix: string;
  key_hash: string;
  permissions: string[];
  last_used_at: string | null;
  created_at: string;
  is_active: boolean;
  calls_count: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const API_ENDPOINTS = [
  {
    group: "Businesses",
    color: "text-orange-400",
    endpoints: [
      { method: "GET",    path: "/v1/businesses",        desc: "List businesses on the network" },
      { method: "GET",    path: "/v1/businesses/:id",    desc: "Get a specific business" },
      { method: "GET",    path: "/v1/businesses/:id/products", desc: "List products for a business" },
    ],
  },
  {
    group: "Products",
    color: "text-blue-400",
    endpoints: [
      { method: "GET",    path: "/v1/products",          desc: "Search the product catalogue" },
      { method: "GET",    path: "/v1/products/:id",      desc: "Get product details" },
    ],
  },
  {
    group: "Jobs",
    color: "text-emerald-400",
    endpoints: [
      { method: "GET",    path: "/v1/jobs",              desc: "List open job listings" },
      { method: "POST",   path: "/v1/jobs",              desc: "Create a job listing" },
      { method: "POST",   path: "/v1/jobs/:id/apply",    desc: "Submit a job application" },
    ],
  },
  {
    group: "Freelancers",
    color: "text-purple-400",
    endpoints: [
      { method: "GET",    path: "/v1/freelancers",       desc: "Search freelancer profiles" },
      { method: "GET",    path: "/v1/freelancers/:id",   desc: "Get freelancer details" },
    ],
  },
  {
    group: "Payments",
    color: "text-amber-400",
    endpoints: [
      { method: "POST",   path: "/v1/payments/initiate", desc: "Initiate a MoMo or card payment" },
      { method: "GET",    path: "/v1/payments/:ref",     desc: "Get payment status" },
      { method: "POST",   path: "/v1/webhooks",          desc: "Register a webhook endpoint" },
    ],
  },
  {
    group: "Analytics",
    color: "text-pink-400",
    endpoints: [
      { method: "GET",    path: "/v1/analytics/sales",   desc: "Sales analytics for your business" },
      { method: "GET",    path: "/v1/analytics/traffic", desc: "Discovery traffic stats" },
    ],
  },
];

const METHOD_COLOR: Record<string, string> = {
  GET:    "bg-emerald-400/10 text-emerald-400",
  POST:   "bg-blue-400/10 text-blue-400",
  PUT:    "bg-amber-400/10 text-amber-400",
  DELETE: "bg-red-400/10 text-red-400",
  PATCH:  "bg-purple-400/10 text-purple-400",
};

const PERMISSIONS = [
  { key: "businesses:read",    label: "Read Businesses" },
  { key: "products:read",      label: "Read Products" },
  { key: "jobs:read",          label: "Read Jobs" },
  { key: "jobs:write",         label: "Post Jobs" },
  { key: "freelancers:read",   label: "Read Freelancers" },
  { key: "payments:initiate",  label: "Initiate Payments" },
  { key: "analytics:read",     label: "Read Analytics" },
  { key: "webhooks:manage",    label: "Manage Webhooks" },
];

const CODE_EXAMPLES: Record<string, string> = {
  curl: `curl -X GET "https://api.kenuxa.com/v1/businesses" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json"`,
  js: `const response = await fetch(
  'https://api.kenuxa.com/v1/businesses',
  {
    headers: {
      'Authorization': \`Bearer \${process.env.KENUXA_API_KEY}\`,
      'Content-Type': 'application/json',
    },
  }
);
const data = await response.json();
console.log(data.businesses);`,
  python: `import requests

response = requests.get(
  "https://api.kenuxa.com/v1/businesses",
  headers={
    "Authorization": f"Bearer {KENUXA_API_KEY}",
    "Content-Type": "application/json",
  }
)
print(response.json())`,
};

type Tab = "overview" | "keys" | "docs" | "webhooks";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function genKeyPreview() {
  return "kx_live_" + [...Array(32)].map(() => Math.random().toString(36)[2]).join("");
}

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text).catch(() => {});
}

function daysAgo(dateStr: string | null) {
  if (!dateStr) return "Never";
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  return `${days}d ago`;
}

// ─── API Key Card ─────────────────────────────────────────────────────────────

function ApiKeyCard({ apiKey, onRevoke }: { apiKey: ApiKey; onRevoke: () => void }) {
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);
  const displayKey = revealed ? `${apiKey.key_prefix}${"x".repeat(32)}` : `${apiKey.key_prefix}••••••••••••••••••••••••••••••••`;

  function handleCopy() {
    copyToClipboard(displayKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className={`bg-[#131621] border rounded-2xl p-5 ${apiKey.is_active ? "border-white/7" : "border-red-400/20 opacity-60"}`}>
      <div className="flex items-start justify-between gap-4 mb-3">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-sm font-semibold text-[#f1f5f9]">{apiKey.name}</span>
            {!apiKey.is_active && (
              <span className="text-[10px] px-1.5 py-0.5 bg-red-400/10 text-red-400 rounded-full font-bold">REVOKED</span>
            )}
          </div>
          <p className="text-xs text-[#64748b]">
            Created {daysAgo(apiKey.created_at)} · Last used {daysAgo(apiKey.last_used_at)} · {apiKey.calls_count.toLocaleString()} calls
          </p>
        </div>
        {apiKey.is_active && (
          <button
            onClick={onRevoke}
            className="text-[#374151] hover:text-[#f87171] transition-colors p-1.5 hover:bg-red-400/5 rounded-lg"
            title="Revoke key"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>

      <div className="flex items-center gap-2 bg-black/30 border border-white/7 rounded-xl px-4 py-2.5 mb-3">
        <Key size={13} className="text-[#374151] flex-shrink-0" />
        <code className="flex-1 text-xs text-[#94a3b8] font-mono truncate">{displayKey}</code>
        <button onClick={() => setRevealed(!revealed)} className="text-[#374151] hover:text-[#64748b] transition-colors ml-1">
          {revealed ? <EyeOff size={13} /> : <Eye size={13} />}
        </button>
        <button onClick={handleCopy} className="text-[#374151] hover:text-[#FF8B5E] transition-colors ml-1">
          {copied ? <CheckCircle2 size={13} className="text-emerald-400" /> : <Copy size={13} />}
        </button>
      </div>

      {apiKey.permissions.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {apiKey.permissions.map((p) => (
            <span key={p} className="text-[10px] bg-white/5 text-[#64748b] px-2 py-0.5 rounded-full border border-white/7">
              {PERMISSIONS.find((x) => x.key === p)?.label ?? p}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Create Key Modal ─────────────────────────────────────────────────────────

function CreateKeyModal({ userId, onClose, onCreated }: {
  userId: string;
  onClose: () => void;
  onCreated: (plainKey: string) => void;
}) {
  const supabase = createClient();
  const [name, setName] = useState("");
  const [perms, setPerms] = useState<Set<string>>(new Set(["businesses:read", "products:read", "jobs:read"]));
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  function togglePerm(key: string) {
    setPerms((p) => { const n = new Set(p); if (n.has(key)) n.delete(key); else n.add(key); return n; });
  }

  async function create() {
    if (!name.trim()) { setError("Name is required"); return; }
    setCreating(true);
    const plainKey = genKeyPreview();
    const prefix = plainKey.slice(0, 16);
    // In production this would be a server-side operation that hashes the key
    const { error: err } = await supabase.from("api_keys").insert({
      user_id: userId,
      name: name.trim(),
      key_prefix: prefix,
      key_hash: plainKey, // In prod: bcrypt hash of the full key
      permissions: [...perms],
      is_active: true,
      calls_count: 0,
    });
    if (err) { setError(err.message); setCreating(false); return; }
    onCreated(plainKey);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div className="bg-[#131621] border border-white/10 rounded-2xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-[#f1f5f9] font-bold text-lg mb-1">Create API Key</h2>
        <p className="text-xs text-[#64748b] mb-5">Your key will only be shown once. Store it securely.</p>

        <div className="space-y-4">
          <div>
            <label className="text-xs text-[#64748b] mb-1 block">Key Name *</label>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Production App, Test Integration"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-[#f1f5f9] text-sm placeholder-[#374151] outline-none focus:border-[#FF6524]/50"
            />
          </div>
          <div>
            <label className="text-xs text-[#64748b] mb-2 block">Permissions</label>
            <div className="grid grid-cols-2 gap-2">
              {PERMISSIONS.map((p) => (
                <label key={p.key} className="flex items-center gap-2 cursor-pointer group">
                  <div
                    className={`w-4 h-4 rounded border flex items-center justify-center transition-colors flex-shrink-0 ${
                      perms.has(p.key) ? "bg-[#FF6524] border-[#FF6524]" : "border-white/20 group-hover:border-white/40"
                    }`}
                    onClick={() => togglePerm(p.key)}
                  >
                    {perms.has(p.key) && <CheckCircle2 size={10} className="text-white" />}
                  </div>
                  <span className="text-xs text-[#94a3b8]">{p.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {error && <p className="text-xs text-red-400 mt-3">{error}</p>}

        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 py-3 bg-white/5 hover:bg-white/8 text-[#94a3b8] text-sm rounded-xl transition-colors">
            Cancel
          </button>
          <button
            onClick={create}
            disabled={creating}
            className="flex-1 py-3 bg-[#FF6524] hover:bg-[#FF7A3D] disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            {creating ? <Loader2 size={14} className="animate-spin" /> : <Key size={14} />}
            {creating ? "Creating…" : "Create Key"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── New Key Reveal Modal ─────────────────────────────────────────────────────

function KeyRevealModal({ plainKey, onClose }: { plainKey: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  function handleCopy() {
    copyToClipboard(plainKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="bg-[#131621] border border-[rgba(255,101,36,0.3)] rounded-2xl w-full max-w-md p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-emerald-400/10 flex items-center justify-center">
            <CheckCircle2 size={20} className="text-emerald-400" />
          </div>
          <div>
            <h2 className="text-[#f1f5f9] font-bold">API Key Created</h2>
            <p className="text-xs text-[#64748b]">This is the only time you&apos;ll see this key.</p>
          </div>
        </div>

        <div className="bg-black/40 border border-amber-400/20 rounded-xl p-4 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle size={13} className="text-amber-400 flex-shrink-0" />
            <span className="text-xs font-semibold text-amber-400">Store this securely — it won&apos;t be shown again</span>
          </div>
          <code className="text-xs text-[#94a3b8] font-mono break-all leading-relaxed">{plainKey}</code>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleCopy}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-white/5 hover:bg-white/8 text-[#94a3b8] text-sm rounded-xl transition-colors"
          >
            {copied ? <CheckCircle2 size={14} className="text-emerald-400" /> : <Copy size={14} />}
            {copied ? "Copied!" : "Copy Key"}
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-3 bg-[#FF6524] hover:bg-[#FF7A3D] text-white text-sm font-semibold rounded-xl transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function DeveloperPage() {
  const { profile } = useAuth();
  const supabase = createClient();
  const userId = (profile as { id?: string } | null)?.id ?? null;

  const [tab, setTab] = useState<Tab>("overview");
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [codeTab, setCodeTab] = useState<"curl" | "js" | "python">("curl");
  const [openGroup, setOpenGroup] = useState<string | null>("Businesses");

  const loadKeys = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const { data } = await supabase
      .from("api_keys")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    setApiKeys((data as ApiKey[]) ?? []);
    setLoading(false);
  }, [userId, supabase]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { loadKeys(); }, [loadKeys]);

  async function revokeKey(id: string) {
    if (!confirm("Revoke this API key? Applications using it will stop working immediately.")) return;
    await supabase.from("api_keys").update({ is_active: false }).eq("id", id);
    loadKeys();
  }

  const activeKeys = apiKeys.filter((k) => k.is_active);
  const totalCalls = apiKeys.reduce((s, k) => s + (k.calls_count ?? 0), 0);

  const TABS: { key: Tab; label: string; icon: React.ElementType }[] = [
    { key: "overview",  label: "Overview",    icon: BarChart2 },
    { key: "keys",      label: "API Keys",    icon: Key },
    { key: "docs",      label: "API Docs",    icon: Book },
    { key: "webhooks",  label: "Webhooks",    icon: Webhook },
  ];

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-2xl bg-[rgba(255,101,36,0.12)] flex items-center justify-center">
              <Code2 size={20} className="text-[#FF8B5E]" />
            </div>
            <h1 className="text-2xl font-bold text-[#f1f5f9]">Developer Platform</h1>
          </div>
          <p className="text-sm text-[#64748b]">Build on KENUXA — access the KENUXA economic network via API</p>
        </div>
        <a
          href="https://docs.kenuxa.com"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/8 border border-white/10 text-[#94a3b8] text-sm rounded-xl transition-colors flex-shrink-0"
        >
          <Book size={14} />
          Full Docs
          <ExternalLink size={12} />
        </a>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-white/3 rounded-xl w-fit overflow-x-auto">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
              tab === key ? "bg-[#FF6524] text-white" : "text-[#64748b] hover:text-[#f1f5f9]"
            }`}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {tab === "overview" && (
        <div className="space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Active Keys",    value: activeKeys.length, icon: Key,       color: "text-[#FF8B5E]" },
              { label: "Total API Calls",value: totalCalls,         icon: Zap,       color: "text-blue-400" },
              { label: "Endpoints",      value: API_ENDPOINTS.reduce((s, g) => s + g.endpoints.length, 0), icon: Globe, color: "text-emerald-400" },
              { label: "Uptime",         value: "99.9%",            icon: TrendingUp, color: "text-amber-400" },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="bg-[#131621] border border-white/7 rounded-2xl p-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center flex-shrink-0">
                  <Icon size={16} className={color} />
                </div>
                <div>
                  <p className="text-xl font-bold text-[#f1f5f9]">{value}</p>
                  <p className="text-xs text-[#64748b]">{label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Quick Start */}
          <div className="bg-[#131621] border border-white/7 rounded-2xl overflow-hidden">
            <div className="p-5 border-b border-white/7">
              <div className="flex items-center gap-2 mb-1">
                <Terminal size={16} className="text-[#FF8B5E]" />
                <h3 className="text-[#f1f5f9] font-semibold">Quick Start</h3>
              </div>
              <p className="text-xs text-[#64748b]">Make your first API call in seconds</p>
            </div>
            <div className="p-5 space-y-4">
              {/* Step 1 */}
              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-[rgba(255,101,36,0.15)] text-[#FF8B5E] text-xs font-bold flex items-center justify-center flex-shrink-0">1</div>
                <div className="flex-1">
                  <p className="text-sm text-[#f1f5f9] font-medium mb-1">Create an API Key</p>
                  <p className="text-xs text-[#64748b] mb-2">Go to the API Keys tab and generate a key with the permissions you need.</p>
                  <button onClick={() => setTab("keys")} className="text-xs text-[#FF8B5E] hover:text-[#FF6524] flex items-center gap-1">
                    Create API Key <ChevronRight size={12} />
                  </button>
                </div>
              </div>
              {/* Step 2 */}
              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-[rgba(255,101,36,0.15)] text-[#FF8B5E] text-xs font-bold flex items-center justify-center flex-shrink-0">2</div>
                <div className="flex-1">
                  <p className="text-sm text-[#f1f5f9] font-medium mb-2">Make a request</p>
                  <div className="flex gap-2 mb-3">
                    {(["curl", "js", "python"] as const).map((l) => (
                      <button
                        key={l}
                        onClick={() => setCodeTab(l)}
                        className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${codeTab === l ? "bg-[rgba(255,101,36,0.15)] text-[#FF8B5E]" : "bg-white/5 text-[#64748b] hover:text-[#f1f5f9]"}`}
                      >
                        {l === "js" ? "JavaScript" : l === "python" ? "Python" : "cURL"}
                      </button>
                    ))}
                  </div>
                  <div className="relative bg-black/40 border border-white/7 rounded-xl p-4 overflow-x-auto">
                    <pre className="text-xs text-[#94a3b8] font-mono whitespace-pre-wrap leading-relaxed">{CODE_EXAMPLES[codeTab]}</pre>
                    <button
                      onClick={() => copyToClipboard(CODE_EXAMPLES[codeTab]!)}
                      className="absolute top-3 right-3 p-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-[#374151] hover:text-[#64748b] transition-colors"
                    >
                      <Copy size={12} />
                    </button>
                  </div>
                </div>
              </div>
              {/* Step 3 */}
              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-[rgba(255,101,36,0.15)] text-[#FF8B5E] text-xs font-bold flex items-center justify-center flex-shrink-0">3</div>
                <div className="flex-1">
                  <p className="text-sm text-[#f1f5f9] font-medium mb-1">Handle the response</p>
                  <p className="text-xs text-[#64748b]">All responses are JSON. Successful responses return a <code className="text-[#FF8B5E]">data</code> key; errors return <code className="text-[#FF8B5E]">error</code> with a message and code.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Use Cases */}
          <div>
            <h3 className="text-xs font-semibold text-[#374151] uppercase tracking-widest mb-3">What you can build</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { icon: Globe,    title: "Business Discovery App",   desc: "Build a local business directory or map experience powered by KENUXA data.", color: "bg-[rgba(255,101,36,0.1)] text-[#FF8B5E]" },
                { icon: Briefcase,title: "Job Board Integration",   desc: "Syndicate KENUXA jobs to your platform or pull listings into your app.", color: "bg-[rgba(59,130,246,0.1)] text-[#60A5FA]" },
                { icon: Zap,      title: "Payment Gateway",         desc: "Embed KENUXA payments into your POS, website, or mobile app.", color: "bg-[rgba(16,185,129,0.1)] text-[#10b981]" },
                { icon: Sparkles, title: "AI-powered Insights",     desc: "Access economic intelligence to power financial decisions and recommendations.", color: "bg-[rgba(139,92,246,0.1)] text-[#8B5CF6]" },
                { icon: BarChart2,title: "Analytics Dashboard",     desc: "Pull sales and traffic data to build custom reporting for your clients.", color: "bg-[rgba(245,158,11,0.1)] text-[#F59E0B]" },
                { icon: Webhook,  title: "Event-Driven Automation", desc: "Subscribe to webhooks for payments, new orders, or inventory alerts.", color: "bg-[rgba(236,72,153,0.1)] text-[#EC4899]" },
              ].map(({ icon: Icon, title, desc, color }) => (
                <div key={title} className="bg-[#131621] border border-white/7 rounded-2xl p-4 hover:border-white/12 transition-colors">
                  <div className={`w-9 h-9 rounded-xl ${color} flex items-center justify-center mb-3`}>
                    <Icon size={16} />
                  </div>
                  <p className="text-sm font-semibold text-[#f1f5f9] mb-1">{title}</p>
                  <p className="text-xs text-[#64748b] leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* API Keys Tab */}
      {tab === "keys" && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[#f1f5f9] font-semibold">{activeKeys.length} active key{activeKeys.length !== 1 ? "s" : ""}</p>
              <p className="text-xs text-[#64748b]">Keys authenticate your API requests. Never share them publicly.</p>
            </div>
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#FF6524] hover:bg-[#FF7A3D] text-white text-sm font-semibold rounded-xl transition-colors"
            >
              <Plus size={15} />
              New API Key
            </button>
          </div>

          {/* Security warning */}
          <div className="flex items-start gap-3 bg-amber-400/5 border border-amber-400/20 rounded-xl p-4">
            <Shield size={15} className="text-amber-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-[#94a3b8]">
              <span className="font-semibold text-amber-400">Security: </span>
              Never expose API keys in client-side code or public repositories. Use environment variables and server-side calls only.
            </p>
          </div>

          {loading ? (
            Array.from({ length: 2 }).map((_, i) => <div key={i} className="h-24 bg-[#131621] border border-white/7 rounded-2xl animate-pulse" />)
          ) : apiKeys.length === 0 ? (
            <div className="text-center py-16 bg-[#131621] border border-white/7 rounded-2xl">
              <Key size={36} className="mx-auto text-[#374151] mb-3" />
              <p className="text-[#94a3b8] font-medium mb-1">No API keys yet</p>
              <p className="text-xs text-[#64748b] mb-4">Create your first key to start building on KENUXA</p>
              <button
                onClick={() => setShowCreate(true)}
                className="px-4 py-2 bg-[rgba(255,101,36,0.15)] text-[#FF8B5E] text-sm rounded-xl hover:bg-[rgba(255,101,36,0.25)] transition-colors"
              >
                Create API Key
              </button>
            </div>
          ) : (
            apiKeys.map((k) => <ApiKeyCard key={k.id} apiKey={k} onRevoke={() => revokeKey(k.id)} />)
          )}
        </div>
      )}

      {/* Docs Tab */}
      {tab === "docs" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-[#64748b]">
              Base URL: <code className="text-[#FF8B5E] bg-[rgba(255,101,36,0.08)] px-2 py-0.5 rounded">https://api.kenuxa.com</code>
            </p>
            <a href="https://docs.kenuxa.com" target="_blank" rel="noopener noreferrer" className="text-xs text-[#64748b] hover:text-[#FF8B5E] flex items-center gap-1 transition-colors">
              Full reference <ExternalLink size={11} />
            </a>
          </div>

          {API_ENDPOINTS.map((group) => (
            <div key={group.group} className="bg-[#131621] border border-white/7 rounded-2xl overflow-hidden">
              <button
                className="w-full flex items-center justify-between p-4 hover:bg-white/2 transition-colors"
                onClick={() => setOpenGroup(openGroup === group.group ? null : group.group)}
              >
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-current opacity-70" style={{ color: "inherit" }} />
                  <span className={`text-sm font-semibold ${group.color}`}>{group.group}</span>
                  <span className="text-xs text-[#374151]">{group.endpoints.length} endpoints</span>
                </div>
                {openGroup === group.group ? <ChevronUp size={15} className="text-[#64748b]" /> : <ChevronDown size={15} className="text-[#64748b]" />}
              </button>

              {openGroup === group.group && (
                <div className="border-t border-white/7 divide-y divide-white/5">
                  {group.endpoints.map((ep) => (
                    <div key={ep.path} className="flex items-center gap-4 px-5 py-3 hover:bg-white/2 transition-colors">
                      <span className={`text-[10px] font-bold px-2 py-1 rounded-md flex-shrink-0 ${METHOD_COLOR[ep.method] ?? "bg-white/5 text-[#64748b]"}`}>
                        {ep.method}
                      </span>
                      <code className="text-xs text-[#94a3b8] font-mono flex-shrink-0">{ep.path}</code>
                      <span className="text-xs text-[#64748b] truncate">{ep.desc}</span>
                      <Lock size={11} className="text-[#374151] flex-shrink-0 ml-auto" aria-label="Requires API key" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}

          {/* Rate limits */}
          <div className="bg-[#131621] border border-white/7 rounded-2xl p-5">
            <h3 className="text-[#f1f5f9] font-semibold mb-3 flex items-center gap-2"><Clock size={15} className="text-[#64748b]" /> Rate Limits</h3>
            <div className="grid grid-cols-3 gap-4 text-center">
              {[
                { tier: "Free",        calls: "1,000/day",   color: "text-[#64748b]" },
                { tier: "Growth",      calls: "10,000/day",  color: "text-blue-400" },
                { tier: "Enterprise",  calls: "Unlimited",   color: "text-[#FF8B5E]" },
              ].map(({ tier, calls, color }) => (
                <div key={tier} className="bg-white/3 rounded-xl p-3">
                  <p className={`text-sm font-bold ${color}`}>{calls}</p>
                  <p className="text-xs text-[#64748b] mt-0.5">{tier}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Webhooks Tab */}
      {tab === "webhooks" && (
        <div className="space-y-5">
          <div className="bg-[rgba(255,101,36,0.06)] border border-[rgba(255,101,36,0.15)] rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-2">
              <Webhook size={16} className="text-[#FF8B5E]" />
              <h3 className="text-[#f1f5f9] font-semibold">Webhook Events</h3>
            </div>
            <p className="text-sm text-[#94a3b8] mb-4">
              Subscribe to real-time events from KENUXA. Your endpoint will receive a POST request whenever an event occurs.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                { event: "payment.completed",   desc: "A payment was successfully processed" },
                { event: "payment.failed",       desc: "A payment attempt failed" },
                { event: "order.created",        desc: "A new order was placed" },
                { event: "order.fulfilled",      desc: "An order was marked as fulfilled" },
                { event: "job.application",      desc: "Someone applied to your job posting" },
                { event: "rfq.bid_received",     desc: "A bid was submitted on your RFQ" },
                { event: "inventory.low_stock",  desc: "A product fell below minimum stock" },
                { event: "review.received",      desc: "A new review was posted for your business" },
              ].map(({ event, desc }) => (
                <div key={event} className="flex items-start gap-3 bg-white/3 rounded-xl p-3">
                  <div className="w-2 h-2 rounded-full bg-[#FF6524] mt-1.5 flex-shrink-0" />
                  <div>
                    <code className="text-xs text-[#FF8B5E] font-mono">{event}</code>
                    <p className="text-xs text-[#64748b] mt-0.5">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Register endpoint */}
          <div className="bg-[#131621] border border-white/7 rounded-2xl p-5">
            <h3 className="text-[#f1f5f9] font-semibold mb-3 flex items-center gap-2">
              <Plus size={15} className="text-[#64748b]" />
              Register Webhook Endpoint
            </h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-[#64748b] mb-1 block">Endpoint URL</label>
                <input
                  placeholder="https://yourapp.com/webhooks/kenuxa"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-[#f1f5f9] text-sm placeholder-[#374151] outline-none focus:border-[#FF6524]/50"
                />
              </div>
              <div>
                <label className="text-xs text-[#64748b] mb-2 block">Subscribe to events</label>
                <div className="grid grid-cols-2 gap-2">
                  {["payment.completed", "order.created", "job.application", "rfq.bid_received"].map((e) => (
                    <label key={e} className="flex items-center gap-2 text-xs text-[#94a3b8] cursor-pointer">
                      <input type="checkbox" className="accent-[#FF6524]" defaultChecked />
                      <code>{e}</code>
                    </label>
                  ))}
                </div>
              </div>
              <button className="flex items-center gap-2 px-4 py-2.5 bg-[rgba(255,101,36,0.15)] hover:bg-[rgba(255,101,36,0.25)] text-[#FF8B5E] text-sm font-medium rounded-xl transition-colors">
                <RefreshCw size={14} />
                Register Endpoint
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {showCreate && userId && (
        <CreateKeyModal
          userId={userId}
          onClose={() => setShowCreate(false)}
          onCreated={(key) => {
            setShowCreate(false);
            setNewKey(key);
            loadKeys();
          }}
        />
      )}

      {newKey && (
        <KeyRevealModal
          plainKey={newKey}
          onClose={() => setNewKey(null)}
        />
      )}
    </div>
  );
}
