"use client";

import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useEffect, useState, useCallback } from "react";
import type { ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/hooks/use-auth";
import { Loader2,
  Shield, Globe, Store, Building2, CreditCard, User, ShoppingBag,
  Package, Bike, Target, Briefcase, Landmark,
  Facebook, Instagram, Twitter, MessageCircle, Linkedin,
  Zap, Smartphone, Radio, Cpu, Map, LayoutGrid, FileText,
  Lock, KeyRound, ShieldCheck, ShieldAlert, Eye, EyeOff,
  CheckCircle2, AlertTriangle, QrCode, Trash2, DollarSign, ChevronDown, Clock,
} from "lucide-react";
import { COUNTRIES_BY_REGION, type SupportedCountry } from "@/lib/constants/countries";
import { ImageUpload } from "@/components/ui/image-upload";

interface BusinessProfile {
  name: string;
  phone: string;
  email: string;
  website: string;
  address: string;
  lat: string;
  lng: string;
  facebook: string;
  instagram: string;
  twitter: string;
  whatsapp: string;
  linkedin: string;
}

const EMPTY_PROFILE: BusinessProfile = {
  name: "", phone: "", email: "", website: "",
  address: "", lat: "", lng: "",
  facebook: "", instagram: "", twitter: "", whatsapp: "", linkedin: "",
};

interface UsageStats {
  products: number;
  staff: number;
  invoices: number;
}

interface BusinessHours {
  day: string;
  open: boolean;
  from: string;
  to: string;
}

interface RbacRole {
  key: string; label: string; icon: ReactNode; color: "orange" | "blue" | "green" | "default";
  desc: string; permissions: string[]; scope: string;
}
const RBAC_ROLES: RbacRole[] = [
  { key: "super_admin",       label: "Super Admin",       icon: <Shield size={18} className="text-[#FF8B5E]" />,      color: "orange",  desc: "Full platform access. Manage all businesses, users, financials, and platform settings.",                                         permissions: ["All modules", "Platform config", "User management", "Financial oversight", "Data export"],                    scope: "Platform-wide"   },
  { key: "country_admin",     label: "Country Admin",     icon: <Globe size={18} className="text-[#3B82F6]" />,        color: "blue",    desc: "Oversees all businesses and users within a single country (e.g. Ghana). Manages country-level compliance.",                  permissions: ["All businesses in country", "Country analytics", "Compliance management", "KYC approvals"],                   scope: "Country-wide"    },
  { key: "business_owner",    label: "Business Owner",    icon: <Store size={18} className="text-[#FF8B5E]" />,        color: "orange",  desc: "Full control over their registered business. Manages all staff, modules, and settings.",                                       permissions: ["All modules", "Staff management", "Billing & plan", "Business profile", "Full analytics"],                    scope: "Single business" },
  { key: "branch_manager",    label: "Branch Manager",    icon: <Building2 size={18} className="text-[#3B82F6]" />,    color: "blue",    desc: "Manages a specific branch. Can view analytics, manage inventory, and approve transactions.",                                   permissions: ["Branch analytics", "Inventory", "Staff scheduling", "Approve refunds", "View financials"],                    scope: "Single branch"   },
  { key: "cashier",           label: "Cashier",           icon: <CreditCard size={18} className="text-[#10b981]" />,   color: "green",   desc: "Operates the POS terminal. Can process sales, issue receipts, and open/close registers.",                                     permissions: ["POS terminal", "Process sales", "Issue receipts", "View own sales", "Apply discounts"],                       scope: "POS only"        },
  { key: "employee",          label: "Employee",          icon: <User size={18} className="text-[#94a3b8]" />,         color: "default", desc: "General staff member. Access varies by assigned modules (e.g. delivery, stocking).",                                          permissions: ["Assigned modules only", "Clock in/out", "View own schedule", "Task management"],                               scope: "Assigned modules"},
  { key: "customer",          label: "Customer",          icon: <ShoppingBag size={18} className="text-[#94a3b8]" />,  color: "default", desc: "Registered customer of the business. Can shop, track orders, earn loyalty points, and write reviews.",                       permissions: ["Shop & checkout", "Order tracking", "Loyalty points", "Write reviews", "Invoice access"],                     scope: "Customer portal" },
  { key: "supplier",          label: "Supplier",          icon: <Package size={18} className="text-[#94a3b8]" />,      color: "default", desc: "External supplier or vendor. Can submit stock quotes, manage POs, and view transaction history.",                            permissions: ["Submit quotes", "View POs", "Transaction history", "Invoice management"],                                      scope: "Supplier portal" },
  { key: "delivery_rider",    label: "Delivery Rider",    icon: <Bike size={18} className="text-[#3B82F6]" />,         color: "blue",    desc: "Manages delivery assignments. Can view routes, update delivery status, and confirm drop-offs.",                              permissions: ["View assigned deliveries", "Update status", "GPS tracking", "Earnings dashboard"],                             scope: "Delivery module" },
  { key: "recruiter",         label: "Recruiter",         icon: <Target size={18} className="text-[#FF8B5E]" />,       color: "orange",  desc: "Posts job openings, reviews applications, and manages the hiring pipeline for the business.",                                permissions: ["Post jobs", "Review applications", "Shortlist candidates", "Send offers", "Talent analytics"],                 scope: "Jobs module"     },
  { key: "job_seeker",        label: "Job Seeker",        icon: <Briefcase size={18} className="text-[#94a3b8]" />,    color: "default", desc: "External applicant. Can browse job listings, apply, track application status, and build a profile.",                         permissions: ["Browse listings", "Apply to jobs", "Application tracking", "Build work profile"],                              scope: "Jobs portal"     },
  { key: "financial_partner", label: "Financial Partner", icon: <Landmark size={18} className="text-[#3B82F6]" />,     color: "blue",    desc: "Bank, MFI, or fintech partner. Can review credit applications, disburse BNPL, and view risk data.",                          permissions: ["Credit applications", "Risk analytics", "BNPL disbursement", "Repayment tracking", "KYC data"],               scope: "Finance module"  },
  { key: "freelancer",        label: "Freelancer",        icon: <Briefcase size={18} className="text-[#a78bfa]" />,     color: "default", desc: "Independent professional. Can offer services, list products, apply for contracts, and manage gig income.",                 permissions: ["Offer services", "Marketplace listing", "Apply to jobs", "Income analytics", "KYC verification"],              scope: "Freelancer portal"},
];

interface TeamMember {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string;
  status: string;
}

const DEFAULT_HOURS: BusinessHours[] = [
  { day: "Monday",    open: true,  from: "08:00", to: "18:00" },
  { day: "Tuesday",   open: true,  from: "08:00", to: "18:00" },
  { day: "Wednesday", open: true,  from: "08:00", to: "18:00" },
  { day: "Thursday",  open: true,  from: "08:00", to: "18:00" },
  { day: "Friday",    open: true,  from: "08:00", to: "18:00" },
  { day: "Saturday",  open: true,  from: "09:00", to: "15:00" },
  { day: "Sunday",    open: false, from: "09:00", to: "15:00" },
];

export default function SettingsPage() {
  const supabase = createClient();
  const { profile, role } = useAuth();
  const isAdmin = role === "super_admin" || role === "country_admin";
  const [activeTab, setActiveTab] = useState<"general" | "security" | "kyc" | "roles" | "team" | "notifications" | "integrations" | "country">("general");

  // Multi-country / region
  const [selectedCountry, setSelectedCountry] = useState<SupportedCountry | null>(null);
  const [countrySearch, setCountrySearch] = useState("");
  const [countrySaved, setCountrySaved] = useState(false);

  // Personal avatar
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarSaving, setAvatarSaving] = useState(false);

  // Business profile
  const [bizForm, setBizForm] = useState<BusinessProfile>(EMPTY_PROFILE);
  const [bizLogo, setBizLogo] = useState<string | null>(null);
  const [bizLoading, setBizLoading] = useState(false);
  const [bizSaving, setBizSaving] = useState(false);
  const [bizSaved, setBizSaved] = useState(false);

  // Business hours
  const [hours, setHours] = useState<BusinessHours[]>(DEFAULT_HOURS);
  const [hoursSaving, setHoursSaving] = useState(false);

  // Plan usage
  const [usage, setUsage] = useState<UsageStats | null>(null);

  // Team
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [teamLoading, setTeamLoading] = useState(false);

  // Security / MFA
  const [mfaFactors, setMfaFactors] = useState<{ id: string; friendly_name: string; factor_type: string; status: string }[]>([]);
  const [mfaEnrolling, setMfaEnrolling] = useState(false);
  const [mfaQR, setMfaQR] = useState<{ qr_code: string; secret: string; uri: string; factorId: string } | null>(null);
  const [mfaCode, setMfaCode] = useState("");
  const [mfaError, setMfaError] = useState("");
  const [mfaVerifying, setMfaVerifying] = useState(false);
  const [pwForm, setPwForm] = useState({ current: "", new: "", confirm: "" });
  const [pwSaving, setPwSaving] = useState(false);
  const [pwError, setPwError] = useState("");
  const [pwSuccess, setPwSuccess] = useState(false);
  const [showPw, setShowPw] = useState(false);

  // KYC
  const [kycDocs, setKycDocs] = useState<{ id: string; document_type: string; side: string; status: string; submitted_at: string; file_url?: string | null }[]>([]);
  const [kycLoading, setKycLoading] = useState(false);
  const [kycUploading, setKycUploading] = useState<string | null>(null);
  const [kycError, setKycError] = useState("");

  const loadKyc = useCallback(async () => {
    setKycLoading(true);
    const res = await fetch("/api/kyc/status");
    if (res.ok) {
      const json = await res.json() as { documents?: { id: string; document_type: string; side: string; status: string; submitted_at: string; file_url?: string | null }[] };
      setKycDocs(json.documents ?? []);
    }
    setKycLoading(false);
  }, []);

  async function uploadKycDoc(file: File, documentType: string, side: string) {
    setKycError("");
    setKycUploading(`${documentType}_${side}`);
    const form = new FormData();
    form.append("file", file);
    form.append("type", documentType);
    form.append("side", side);
    const res = await fetch("/api/kyc/upload", { method: "POST", body: form });
    setKycUploading(null);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Upload failed" })) as { error?: string };
      setKycError(err.error ?? "Upload failed");
      return;
    }
    await loadKyc();
  }

  const loadSecurity = useCallback(async () => {
    const { data } = await supabase.auth.mfa.listFactors();
    const factors = (data?.totp ?? []).map((f) => ({
      id: f.id,
      friendly_name: f.friendly_name ?? "Authenticator App",
      factor_type: f.factor_type,
      status: f.status,
    }));
    setMfaFactors(factors);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const startMfaEnroll = async () => {
    setMfaEnrolling(true);
    setMfaError("");
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: "Authenticator App" });
    setMfaEnrolling(false);
    if (error || !data) { setMfaError(error?.message ?? "Failed to start enrollment"); return; }
    setMfaQR({ qr_code: data.totp.qr_code, secret: data.totp.secret, uri: data.totp.uri, factorId: data.id });
  };

  const verifyMfa = async () => {
    if (!mfaQR) return;
    if (mfaCode.length !== 6) { setMfaError("Enter the 6-digit code from your authenticator app."); return; }
    setMfaVerifying(true);
    setMfaError("");
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: mfaQR.factorId, code: mfaCode });
    setMfaVerifying(false);
    if (error) { setMfaError(error.message); return; }
    setMfaQR(null);
    setMfaCode("");
    loadSecurity();
  };

  const removeMfa = async (factorId: string) => {
    if (!confirm("Remove MFA from your account?")) return;
    await supabase.auth.mfa.unenroll({ factorId });
    loadSecurity();
  };

  const changePassword = async () => {
    setPwError("");
    if (!pwForm.new || pwForm.new.length < 8) { setPwError("Password must be at least 8 characters."); return; }
    if (pwForm.new !== pwForm.confirm) { setPwError("Passwords do not match."); return; }
    setPwSaving(true);
    const { error } = await supabase.auth.updateUser({ password: pwForm.new });
    setPwSaving(false);
    if (error) { setPwError(error.message); return; }
    setPwSuccess(true);
    setPwForm({ current: "", new: "", confirm: "" });
    setTimeout(() => setPwSuccess(false), 4000);
  };

  const loadGeneral = useCallback(async () => {
    if (!profile?.business_id) return;
    setBizLoading(true);
    const [{ data: biz }, { data: products }, { data: staff }, { data: invoices }] = await Promise.all([
      supabase.from("businesses").select("name,phone,email,website,address,lat,lng,facebook,instagram,twitter,whatsapp,linkedin,business_hours,logo_url").eq("id", profile.business_id).single(),
      supabase.from("inventory_items").select("id", { count: "exact", head: true }).eq("business_id", profile.business_id),
      supabase.from("business_staff").select("id", { count: "exact", head: true }).eq("business_id", profile.business_id),
      supabase.from("invoices").select("id", { count: "exact", head: true }).eq("business_id", profile.business_id),
    ]);
    if (biz) {
      setBizForm({
        name:      biz.name ?? "",
        phone:     biz.phone ?? "",
        email:     biz.email ?? "",
        website:   biz.website ?? "",
        address:   biz.address ?? "",
        lat:       biz.lat ? String(biz.lat) : "",
        lng:       biz.lng ? String(biz.lng) : "",
        facebook:  biz.facebook ?? "",
        instagram: biz.instagram ?? "",
        twitter:   biz.twitter ?? "",
        whatsapp:  biz.whatsapp ?? "",
        linkedin:  biz.linkedin ?? "",
      });
      if (biz.business_hours) setHours(biz.business_hours as BusinessHours[]);
      setBizLogo((biz as { logo_url?: string | null }).logo_url ?? null);
    }
    setUsage({
      products: (products as unknown as { count: number })?.count ?? 0,
      staff:    (staff    as unknown as { count: number })?.count ?? 0,
      invoices: (invoices as unknown as { count: number })?.count ?? 0,
    });
    setBizLoading(false);
  }, [profile?.business_id]); // eslint-disable-line react-hooks/exhaustive-deps

  const saveBizProfile = async () => {
    if (!profile?.business_id) return;
    setBizSaving(true);
    await supabase.from("businesses").update({
      name:      bizForm.name,
      phone:     bizForm.phone || null,
      email:     bizForm.email || null,
      website:   bizForm.website || null,
      address:   bizForm.address || null,
      lat:       bizForm.lat ? parseFloat(bizForm.lat) : null,
      lng:       bizForm.lng ? parseFloat(bizForm.lng) : null,
      facebook:  bizForm.facebook || null,
      instagram: bizForm.instagram || null,
      twitter:   bizForm.twitter || null,
      whatsapp:  bizForm.whatsapp || null,
      linkedin:  bizForm.linkedin || null,
      logo_url:  bizLogo,
    }).eq("id", profile.business_id);
    setBizSaving(false);
    setBizSaved(true);
    setTimeout(() => setBizSaved(false), 3000);
  };

  const saveHours = async () => {
    if (!profile?.business_id) return;
    setHoursSaving(true);
    await supabase.from("businesses").update({ business_hours: hours }).eq("id", profile.business_id);
    setHoursSaving(false);
  };

  const loadTeam = useCallback(async () => {
    if (!profile?.business_id) return;
    setTeamLoading(true);
    const { data } = await supabase
      .from("business_staff")
      .select("id, full_name, email, role, status")
      .eq("business_id", profile.business_id)
      .order("created_at", { ascending: true });
    setTeam((data as TeamMember[]) ?? []);
    setTeamLoading(false);
  }, [profile?.business_id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (activeTab === "general")  loadGeneral();
    if (activeTab === "team")     loadTeam();
    if (activeTab === "security") loadSecurity();
    if (activeTab === "kyc")      loadKyc();
  }, [activeTab, loadGeneral, loadTeam, loadSecurity, loadKyc]);

  const TABS = [
    { key: "general" as const,       label: "General" },
    { key: "security" as const,      label: "Security" },
    { key: "kyc" as const,           label: "ID Verification" },
    ...(isAdmin ? [{ key: "roles" as const,         label: "Roles & RBAC" }] : []),
    { key: "team" as const,          label: "Team" },
    { key: "notifications" as const, label: "Notifications" },
    ...(isAdmin ? [{ key: "integrations" as const,  label: "Integrations" }] : []),
    ...(isAdmin ? [{ key: "country" as const,       label: "Country & Currency" }] : []),
  ];

  return (
    <div className="animate-fade-in">
      <Header title="Settings" subtitle="Account, team & integrations" />

      <div className="p-6 space-y-6 max-w-5xl">
        {/* Tabs */}
        <div className="flex gap-1 bg-[#111624] border border-white/7 rounded-xl p-1 w-fit">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.key
                  ? "bg-[#FF6524] text-white"
                  : "text-[#64748b] hover:text-[#f1f5f9]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* General */}
        {activeTab === "general" && (
          <div className="space-y-6">
            {/* Personal Avatar */}
            <Card>
              <CardHeader><CardTitle>Personal Profile Photo</CardTitle></CardHeader>
              <CardContent>
                <div className="flex items-center gap-6">
                  <ImageUpload
                    value={avatarUrl ?? (profile as { avatar_url?: string | null } | null)?.avatar_url ?? null}
                    onChange={async (url) => {
                      setAvatarUrl(url);
                      if (url && profile?.id) {
                        setAvatarSaving(true);
                        await supabase.from("user_profiles").update({ avatar_url: url }).eq("id", profile.id);
                        setAvatarSaving(false);
                      }
                    }}
                    bucket="avatars"
                    path={`users/${profile?.id ?? "unknown"}`}
                    shape="circle"
                    size="md"
                    placeholder="Upload photo"
                  />
                  <div>
                    <p className="text-sm font-semibold text-[#f1f5f9] mb-1">Profile Photo</p>
                    <p className="text-xs text-[#64748b] leading-relaxed max-w-xs">
                      Your photo appears on your KENUXA ID, community posts, service listings, and freelancer profile. Recommended: 400×400px.
                    </p>
                    {avatarSaving && <p className="text-xs text-[#FF8B5E] mt-1">Saving…</p>}
                    {avatarUrl && !avatarSaving && <p className="text-xs text-[#34d399] mt-1 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-[#34d399] inline-block" /> Photo updated</p>}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Plan */}
            <Card className="border-[rgba(255,101,36,0.2)] bg-[rgba(255,101,36,0.04)]">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-base font-bold text-[#f1f5f9]">Free Plan</h3>
                      <Badge variant="orange">Active</Badge>
                    </div>
                    <p className="text-sm text-[#64748b]">Great for small businesses. Upgrade for advanced features.</p>
                  </div>
                  <Button>Upgrade to Growth</Button>
                </div>
                <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-white/7">
                  {[
                    { label: "Products",    used: usage?.products ?? 0, max: 100 },
                    { label: "Staff",       used: usage?.staff ?? 0,    max: 5 },
                    { label: "Invoices",    used: usage?.invoices ?? 0, max: 25 },
                  ].map((item) => (
                    <div key={item.label}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-[#64748b]">{item.label}</span>
                        <span className="text-[#f1f5f9]">{item.used}/{item.max}</span>
                      </div>
                      <div className="h-1.5 bg-[#0d0f1a] rounded-full overflow-hidden">
                        <div className="h-full bg-[#FF6524] rounded-full" style={{ width: `${Math.min(100, (item.used / item.max) * 100)}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Business profile */}
            <Card>
              <CardHeader><CardTitle>Business Profile</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {bizLoading ? (
                  <div className="space-y-3">
                    {[...Array(4)].map((_, i) => <div key={i} className="h-9 bg-white/5 rounded-lg animate-pulse" />)}
                  </div>
                ) : (
                  <>
                    {/* Business Logo */}
                    <div className="flex items-start gap-6 pb-4 border-b border-white/7">
                      <div>
                        <p className="text-xs font-medium text-[#64748b] mb-2">Business Logo</p>
                        <ImageUpload
                          value={bizLogo}
                          onChange={setBizLogo}
                          bucket="businesses"
                          path={profile?.business_id ? `logos/${profile.business_id}` : "logos"}
                          shape="square"
                          size="md"
                          placeholder="Upload logo"
                        />
                      </div>
                      <div className="flex-1 min-w-0 pt-1">
                        <p className="text-sm font-semibold text-[#f1f5f9] mb-1">Business Logo</p>
                        <p className="text-xs text-[#64748b] leading-relaxed">
                          Upload your business logo. It will appear on your directory listing, invoices, receipts, and customer-facing pages. Recommended: 400×400px square PNG.
                        </p>
                        {bizLogo && (
                          <p className="text-xs text-[#34d399] mt-2 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#34d399] inline-block" />
                            Logo uploaded — click Save Profile to apply
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-[#64748b] mb-1.5">Business Name</label>
                        <input type="text" value={bizForm.name} onChange={(e) => setBizForm((f) => ({ ...f, name: e.target.value }))} placeholder="My Shop GH" className="w-full bg-[#111624] border border-white/7 rounded-lg px-3 h-9 text-sm text-[#f1f5f9] placeholder:text-[#374151] outline-none focus:border-[rgba(255,101,36,0.4)]" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-[#64748b] mb-1.5">Business Phone</label>
                        <input type="tel" value={bizForm.phone} onChange={(e) => setBizForm((f) => ({ ...f, phone: e.target.value }))} placeholder="+233 24 000 0000" className="w-full bg-[#111624] border border-white/7 rounded-lg px-3 h-9 text-sm text-[#f1f5f9] placeholder:text-[#374151] outline-none focus:border-[rgba(255,101,36,0.4)]" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-[#64748b] mb-1.5">Email Address</label>
                        <input type="email" value={bizForm.email} onChange={(e) => setBizForm((f) => ({ ...f, email: e.target.value }))} placeholder="business@email.com" className="w-full bg-[#111624] border border-white/7 rounded-lg px-3 h-9 text-sm text-[#f1f5f9] placeholder:text-[#374151] outline-none focus:border-[rgba(255,101,36,0.4)]" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-[#64748b] mb-1.5">Website</label>
                        <input type="url" value={bizForm.website} onChange={(e) => setBizForm((f) => ({ ...f, website: e.target.value }))} placeholder="https://myshop.com" className="w-full bg-[#111624] border border-white/7 rounded-lg px-3 h-9 text-sm text-[#f1f5f9] placeholder:text-[#374151] outline-none focus:border-[rgba(255,101,36,0.4)]" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#64748b] mb-1.5">Business Address</label>
                      <input type="text" value={bizForm.address} onChange={(e) => setBizForm((f) => ({ ...f, address: e.target.value }))} placeholder="123 Main Street, Accra, Ghana" className="w-full bg-[#111624] border border-white/7 rounded-lg px-3 h-9 text-sm text-[#f1f5f9] placeholder:text-[#374151] outline-none focus:border-[rgba(255,101,36,0.4)]" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-[#64748b] mb-1.5">GPS Latitude</label>
                        <input type="text" value={bizForm.lat} onChange={(e) => setBizForm((f) => ({ ...f, lat: e.target.value }))} placeholder="5.6037" className="w-full bg-[#111624] border border-white/7 rounded-lg px-3 h-9 text-sm text-[#f1f5f9] placeholder:text-[#374151] outline-none focus:border-[rgba(255,101,36,0.4)]" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-[#64748b] mb-1.5">GPS Longitude</label>
                        <input type="text" value={bizForm.lng} onChange={(e) => setBizForm((f) => ({ ...f, lng: e.target.value }))} placeholder="-0.1870" className="w-full bg-[#111624] border border-white/7 rounded-lg px-3 h-9 text-sm text-[#f1f5f9] placeholder:text-[#374151] outline-none focus:border-[rgba(255,101,36,0.4)]" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#64748b] mb-2">Social Links</label>
                      <div className="grid grid-cols-2 gap-3">
                        {[
                          { icon: <Facebook size={14} className="text-[#3B82F6]" />,      key: "facebook"  as const, placeholder: "facebook.com/mybusiness" },
                          { icon: <Instagram size={14} className="text-[#ec4899]" />,     key: "instagram" as const, placeholder: "instagram.com/mybusiness" },
                          { icon: <Twitter size={14} className="text-[#64748b]" />,       key: "twitter"   as const, placeholder: "twitter.com/mybusiness" },
                          { icon: <MessageCircle size={14} className="text-[#10b981]" />, key: "whatsapp"  as const, placeholder: "+233 24 000 0000" },
                          { icon: <Linkedin size={14} className="text-[#3B82F6]" />,      key: "linkedin"  as const, placeholder: "linkedin.com/company/..." },
                        ].map((s) => (
                          <div key={s.key} className="flex items-center gap-2 bg-[#111624] border border-white/7 rounded-lg px-3 h-9">
                            {s.icon}
                            <input
                              type="text"
                              value={bizForm[s.key]}
                              onChange={(e) => setBizForm((f) => ({ ...f, [s.key]: e.target.value }))}
                              placeholder={s.placeholder}
                              className="flex-1 bg-transparent text-xs text-[#f1f5f9] placeholder:text-[#374151] outline-none"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center justify-end gap-3">
                      {bizSaved && <span className="text-xs text-[#34d399]">Profile saved successfully</span>}
                      <Button size="sm" onClick={saveBizProfile} disabled={bizSaving}>
                        {bizSaving ? <><Loader2 size={13} className="animate-spin" /> Saving...</> : "Save Profile"}
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Business Hours */}
            <Card>
              <CardHeader><CardTitle>Business Hours</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {hours.map((h, i) => (
                  <div key={h.day} className="flex items-center gap-4 py-1.5">
                    <div className="w-24 text-sm text-[#f1f5f9]">{h.day}</div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={h.open}
                        onChange={(e) => setHours((prev) => prev.map((r, j) => j === i ? { ...r, open: e.target.checked } : r))}
                        className="sr-only peer"
                      />
                      <div className="w-9 bg-[#111624] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-4 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-[#374151] after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-[#FF6524] peer-checked:after:bg-white border border-white/10 relative h-[18px]" />
                    </label>
                    <div className={`flex items-center gap-2 flex-1 ${!h.open ? "opacity-40 pointer-events-none" : ""}`}>
                      <input
                        type="time"
                        value={h.from}
                        onChange={(e) => setHours((prev) => prev.map((r, j) => j === i ? { ...r, from: e.target.value } : r))}
                        className="bg-[#111624] border border-white/7 rounded-lg px-2 h-8 text-xs text-[#f1f5f9] outline-none"
                      />
                      <span className="text-[#374151] text-xs">to</span>
                      <input
                        type="time"
                        value={h.to}
                        onChange={(e) => setHours((prev) => prev.map((r, j) => j === i ? { ...r, to: e.target.value } : r))}
                        className="bg-[#111624] border border-white/7 rounded-lg px-2 h-8 text-xs text-[#f1f5f9] outline-none"
                      />
                    </div>
                  </div>
                ))}
                <div className="flex justify-end pt-2">
                  <Button size="sm" onClick={saveHours} disabled={hoursSaving}>
                    {hoursSaving ? <><Loader2 size={13} className="animate-spin" /> Saving...</> : "Save Hours"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Roles & RBAC */}
        {activeTab === "roles" && (
          <div className="space-y-4">
            <div className="bg-[rgba(255,101,36,0.06)] border border-[rgba(255,101,36,0.2)] rounded-xl p-4">
              <p className="text-sm text-[#FF8B5E] font-medium mb-1">KENUXA RBAC — 13 Role System</p>
              <p className="text-xs text-[#64748b]">
                KENUXA uses a 13-role RBAC model spanning the full ecosystem — from platform-level Super Admins
                to external stakeholders like Customers, Suppliers, Job Seekers, Financial Partners, and Freelancers.
                Each role has a defined scope and permission set.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {RBAC_ROLES.map((role) => (
                <Card key={role.key}>
                  <CardContent className="p-5">
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-10 h-10 rounded-xl bg-[rgba(255,101,36,0.08)] flex items-center justify-center text-xl flex-shrink-0">
                        {role.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <h3 className="text-sm font-bold text-[#f1f5f9]">{role.label}</h3>
                          <Badge variant={role.color} className="text-[10px] px-1.5">{role.scope}</Badge>
                        </div>
                        <p className="text-xs text-[#64748b] leading-relaxed">{role.desc}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {role.permissions.map((perm) => (
                        <span key={perm} className="text-[10px] bg-[#111624] border border-white/7 text-[#94a3b8] px-2 py-0.5 rounded-full">
                          {perm}
                        </span>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Team */}
        {activeTab === "team" && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Team Members</CardTitle>
              <Button size="sm">+ Invite Member</Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                {teamLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-14 bg-white/3 rounded-lg animate-pulse" />
                  ))
                ) : team.length === 0 ? (
                  <p className="text-sm text-[#64748b] text-center py-8">No team members found.</p>
                ) : team.map((member) => {
                  const role = RBAC_ROLES.find((r) => r.key === member.role);
                  const initials = (member.full_name ?? member.email ?? "?")[0]?.toUpperCase() ?? "?";
                  return (
                    <div key={member.id} className="flex items-center justify-between py-3 px-3 rounded-lg hover:bg-white/3 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-[rgba(255,101,36,0.12)] flex items-center justify-center text-sm font-bold text-[#FF8B5E]">
                          {initials}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-[#f1f5f9]">{member.full_name ?? "—"}</p>
                          <p className="text-xs text-[#64748b]">{member.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={role?.color ?? "default"} className="capitalize">
                          {role?.label ?? member.role}
                        </Badge>
                        <Badge variant="green" className="text-[10px]">{member.status}</Badge>
                        <button className="text-xs text-[#64748b] hover:text-[#f1f5f9] px-2 py-1 hover:bg-white/5 rounded">Edit</button>
                        <button className="text-xs text-red-400 hover:text-red-300 px-2 py-1 hover:bg-red-500/5 rounded">Remove</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Notifications */}
        {activeTab === "notifications" && (
          <Card>
            <CardHeader><CardTitle>Notification Preferences</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {[
                { label: "New sale alert",           desc: "Notify when a sale is completed",                  defaultOn: true  },
                { label: "Low stock alert",           desc: "Notify when stock falls below threshold",          defaultOn: true  },
                { label: "New customer registered",   desc: "Notify when a new customer joins",                 defaultOn: true  },
                { label: "Invoice paid",              desc: "Notify when an invoice is paid",                   defaultOn: true  },
                { label: "Delivery status update",    desc: "Notify when delivery status changes",              defaultOn: true  },
                { label: "New job application",       desc: "Notify when someone applies to a job posting",     defaultOn: false },
                { label: "Credit score change",       desc: "Notify when business credit score updates",        defaultOn: false },
                { label: "New review posted",         desc: "Notify when a customer posts a review",            defaultOn: true  },
                { label: "AI insights",               desc: "Weekly AI business insights email",                defaultOn: false },
                { label: "BNPL repayment reminder",   desc: "Remind buyers of upcoming repayment dates",        defaultOn: true  },
              ].map((n) => (
                <div key={n.label} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[#f1f5f9]">{n.label}</p>
                    <p className="text-xs text-[#64748b]">{n.desc}</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" defaultChecked={n.defaultOn} className="sr-only peer" />
                    <div className="w-10 h-5 bg-[#111624] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-5 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-[#374151] after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#FF6524] peer-checked:after:bg-white border border-white/10" />
                  </label>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Security */}
        {activeTab === "security" && (
          <div className="space-y-6">
            {/* Password */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <KeyRound size={16} className="text-[#FF8B5E]" /> Change Password
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 max-w-md">
                {pwSuccess && (
                  <div className="flex items-center gap-2 text-sm text-[#34d399] bg-[rgba(52,211,153,0.08)] border border-[rgba(52,211,153,0.2)] rounded-lg px-3 py-2">
                    <CheckCircle2 size={14} /> Password changed successfully.
                  </div>
                )}
                {pwError && (
                  <div className="flex items-center gap-2 text-sm text-[#f87171] bg-[rgba(248,113,113,0.08)] border border-[rgba(248,113,113,0.2)] rounded-lg px-3 py-2">
                    <AlertTriangle size={14} /> {pwError}
                  </div>
                )}
                {(["new", "confirm"] as const).map((field) => (
                  <div key={field}>
                    <label className="text-xs text-[#64748b] mb-1.5 block capitalize">
                      {field === "new" ? "New Password" : "Confirm New Password"}
                    </label>
                    <div className="relative">
                      <input
                        type={showPw ? "text" : "password"}
                        value={pwForm[field]}
                        onChange={(e) => setPwForm((f) => ({ ...f, [field]: e.target.value }))}
                        placeholder={field === "new" ? "Min 8 characters" : "Repeat password"}
                        className="w-full bg-[#111624] border border-white/10 rounded-lg px-3 pr-10 h-10 text-sm text-[#f1f5f9] outline-none focus:border-[#FF6524] transition-colors"
                      />
                      {field === "new" && (
                        <button
                          type="button"
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748b] hover:text-[#f1f5f9]"
                          onClick={() => setShowPw((v) => !v)}
                        >
                          {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                <Button onClick={changePassword} disabled={pwSaving} size="sm">
                  {pwSaving ? <Loader2 size={13} className="animate-spin" /> : <Lock size={13} />}
                  {pwSaving ? "Updating..." : "Update Password"}
                </Button>
              </CardContent>
            </Card>

            {/* MFA */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShieldCheck size={16} className="text-[#3B82F6]" /> Two-Factor Authentication (2FA)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-[#64748b]">
                  Protect your account with an authenticator app (Google Authenticator, Authy, etc.).
                  Once enabled, you will be asked for a 6-digit code when logging in.
                </p>

                {/* Enrolled factors */}
                {mfaFactors.map((f) => (
                  <div key={f.id} className="flex items-center justify-between p-4 bg-[rgba(52,211,153,0.05)] border border-[rgba(52,211,153,0.2)] rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-[rgba(52,211,153,0.1)] flex items-center justify-center">
                        <ShieldCheck size={16} className="text-[#34d399]" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-[#f1f5f9]">{f.friendly_name}</p>
                        <p className="text-xs text-[#34d399]">Active · TOTP</p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => removeMfa(f.id)}
                    >
                      <Trash2 size={12} /> Remove
                    </Button>
                  </div>
                ))}

                {mfaFactors.length === 0 && !mfaQR && (
                  <div className="flex items-center justify-between p-4 bg-[rgba(245,158,11,0.05)] border border-[rgba(245,158,11,0.15)] rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-[rgba(245,158,11,0.1)] flex items-center justify-center">
                        <ShieldAlert size={16} className="text-[#F59E0B]" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-[#f1f5f9]">2FA not enabled</p>
                        <p className="text-xs text-[#64748b]">Your account is less secure without 2FA</p>
                      </div>
                    </div>
                    <Button size="sm" onClick={startMfaEnroll} disabled={mfaEnrolling}>
                      {mfaEnrolling ? <Loader2 size={13} className="animate-spin" /> : <QrCode size={13} />}
                      Enable 2FA
                    </Button>
                  </div>
                )}

                {/* QR enrollment flow */}
                {mfaQR && (
                  <div className="p-5 border border-white/10 rounded-xl space-y-4 bg-[#0d0f1a]">
                    <div className="flex items-start gap-4">
                      {/* QR code displayed as image from data URI */}
                      <div className="bg-white p-2 rounded-lg flex-shrink-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={mfaQR.qr_code} alt="MFA QR Code" width={120} height={120} />
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm font-semibold text-[#f1f5f9]">Scan with your authenticator app</p>
                        <p className="text-xs text-[#64748b]">
                          Open Google Authenticator, Authy, or any TOTP app, then scan this QR code.
                        </p>
                        <div className="bg-[#111624] border border-white/7 rounded-lg px-3 py-2">
                          <p className="text-[10px] text-[#64748b] mb-0.5">Manual entry secret</p>
                          <p className="text-xs font-mono text-[#f1f5f9] tracking-widest break-all">{mfaQR.secret}</p>
                        </div>
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-[#64748b] mb-1.5 block">Enter the 6-digit code from your app</label>
                      <div className="flex gap-3">
                        <input
                          type="text"
                          inputMode="numeric"
                          maxLength={6}
                          value={mfaCode}
                          onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ""))}
                          placeholder="000000"
                          className="bg-[#111624] border border-white/10 rounded-lg px-3 h-10 text-sm text-[#f1f5f9] outline-none focus:border-[#FF6524] w-40 tracking-widest font-mono text-center"
                        />
                        <Button onClick={verifyMfa} disabled={mfaVerifying || mfaCode.length !== 6}>
                          {mfaVerifying ? <Loader2 size={13} className="animate-spin" /> : <ShieldCheck size={13} />}
                          Verify & Activate
                        </Button>
                        <Button variant="secondary" onClick={() => { setMfaQR(null); setMfaCode(""); }}>
                          Cancel
                        </Button>
                      </div>
                      {mfaError && (
                        <p className="text-xs text-[#f87171] mt-2">{mfaError}</p>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* ID Verification (KYC) */}
        {activeTab === "kyc" && (
          <div className="space-y-6">
            <div className="bg-[rgba(59,130,246,0.06)] border border-[rgba(59,130,246,0.2)] rounded-xl p-4">
              <p className="text-sm text-[#60a5fa] font-medium mb-1">Identity Verification (KYC)</p>
              <p className="text-xs text-[#64748b]">
                Verify your identity to unlock higher transaction limits, access lending products, and build trust with partners.
                Documents are encrypted and reviewed by our compliance team within 24–48 hours.
              </p>
            </div>

            {kycError && (
              <div className="flex items-center gap-2 text-sm text-[#f87171] bg-[rgba(248,113,113,0.08)] border border-[rgba(248,113,113,0.2)] rounded-xl px-4 py-3">
                <AlertTriangle size={14} /> {kycError}
              </div>
            )}

            {kycLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-24 bg-white/3 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {[
                  { type: "national_id",      label: "National ID / Voter Card",   sides: ["front", "back"]  },
                  { type: "passport",          label: "International Passport",     sides: ["front"]          },
                  { type: "drivers_license",   label: "Driver's Licence",           sides: ["front", "back"]  },
                  { type: "proof_of_address",  label: "Proof of Address (utility bill, bank statement)", sides: ["front"] },
                ].map((doc) => {
                  const docRecords = kycDocs.filter((d) => d.document_type === doc.type);
                  return (
                    <Card key={doc.type}>
                      <CardContent className="p-5">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-[rgba(59,130,246,0.1)] flex items-center justify-center">
                              <FileText size={16} className="text-[#60a5fa]" />
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-[#f1f5f9]">{doc.label}</p>
                              <p className="text-xs text-[#64748b]">
                                {doc.sides.length > 1 ? "Front & back required" : "Front side required"} · Max 5MB · JPG/PNG/PDF
                              </p>
                            </div>
                          </div>
                          {docRecords.some((d) => d.status === "approved") && (
                            <span className="flex items-center gap-1.5 text-xs font-medium text-[#34d399] bg-[rgba(52,211,153,0.1)] border border-[rgba(52,211,153,0.2)] px-3 py-1 rounded-full">
                              <CheckCircle2 size={11} /> Verified
                            </span>
                          )}
                          {!docRecords.some((d) => d.status === "approved") && docRecords.some((d) => d.status === "pending") && (
                            <span className="flex items-center gap-1.5 text-xs font-medium text-[#F59E0B] bg-[rgba(245,158,11,0.1)] border border-[rgba(245,158,11,0.2)] px-3 py-1 rounded-full">
                              <Clock size={11} /> Under Review
                            </span>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          {doc.sides.map((side) => {
                            const existing = docRecords.find((d) => d.side === side);
                            const uploading = kycUploading === `${doc.type}_${side}`;
                            return (
                              <label key={side} className={`relative flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 border-dashed cursor-pointer transition-colors ${
                                existing?.status === "approved" ? "border-[rgba(52,211,153,0.4)] bg-[rgba(52,211,153,0.04)]" :
                                existing?.status === "pending"  ? "border-[rgba(245,158,11,0.4)] bg-[rgba(245,158,11,0.04)]" :
                                existing?.status === "rejected" ? "border-[rgba(239,68,68,0.4)] bg-[rgba(239,68,68,0.04)]" :
                                "border-white/10 hover:border-white/20 bg-white/2"
                              }`}>
                                <input
                                  type="file"
                                  className="sr-only"
                                  accept="image/jpeg,image/png,image/webp,application/pdf"
                                  disabled={uploading || existing?.status === "approved"}
                                  onChange={async (e) => {
                                    const file = e.target.files?.[0];
                                    if (file) await uploadKycDoc(file, doc.type, side);
                                    e.target.value = "";
                                  }}
                                />
                                {uploading ? (
                                  <Loader2 size={20} className="animate-spin text-[#FF8B5E]" />
                                ) : existing?.status === "approved" ? (
                                  <CheckCircle2 size={20} className="text-[#34d399]" />
                                ) : existing?.status === "pending" ? (
                                  <Clock size={20} className="text-[#F59E0B]" />
                                ) : existing?.status === "rejected" ? (
                                  <AlertTriangle size={20} className="text-[#f87171]" />
                                ) : (
                                  <Eye size={20} className="text-[#374151]" />
                                )}
                                <p className="text-xs font-medium text-[#94a3b8] capitalize">{side} side</p>
                                {existing ? (
                                  <p className="text-[10px] text-[#64748b] capitalize">{existing.status}</p>
                                ) : (
                                  <p className="text-[10px] text-[#374151]">Click to upload</p>
                                )}
                              </label>
                            );
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Country & Currency */}
        {activeTab === "country" && (
          <div className="space-y-6">
            {/* Current country */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe size={16} className="text-[#FF8B5E]" />
                  Operating Country
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-[#64748b]">
                  Select your primary operating country. This determines your default currency, payment methods, mobile money providers, and compliance requirements.
                </p>

                {/* Search */}
                <div className="relative">
                  <input
                    placeholder="Search countries…"
                    value={countrySearch}
                    onChange={(e) => setCountrySearch(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-[#f1f5f9] text-sm placeholder-[#374151] outline-none focus:border-[#FF6524]/50"
                  />
                </div>

                {/* Country Grid by Region */}
                {Object.entries(COUNTRIES_BY_REGION).map(([region, countries]) => {
                  const filtered = countries.filter((c) =>
                    !countrySearch || c.name.toLowerCase().includes(countrySearch.toLowerCase())
                  );
                  if (filtered.length === 0) return null;
                  return (
                    <div key={region}>
                      <p className="text-xs font-semibold text-[#374151] uppercase tracking-widest mb-2">{region}</p>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {filtered.map((country) => (
                          <button
                            key={country.code}
                            onClick={() => setSelectedCountry(country)}
                            className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-colors ${
                              selectedCountry?.code === country.code
                                ? "bg-[rgba(255,101,36,0.1)] border-[rgba(255,101,36,0.3)]"
                                : country.active
                                ? "bg-white/3 border-white/10 hover:border-white/20"
                                : "bg-white/2 border-white/5 opacity-50"
                            }`}
                          >
                            <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0 text-base">
                              {country.code === "GH" ? "🇬🇭" : country.code === "NG" ? "🇳🇬" : country.code === "KE" ? "🇰🇪" : country.code === "ZA" ? "🇿🇦" : country.code === "EG" ? "🇪🇬" : "🌍"}
                            </div>
                            <div className="min-w-0">
                              <p className={`text-sm font-medium truncate ${selectedCountry?.code === country.code ? "text-[#FF8B5E]" : "text-[#f1f5f9]"}`}>
                                {country.name}
                              </p>
                              <p className="text-xs text-[#64748b]">{country.currencySymbol} {country.currency}</p>
                            </div>
                            {country.active && selectedCountry?.code === country.code && (
                              <CheckCircle2 size={14} className="text-[#FF8B5E] flex-shrink-0 ml-auto" />
                            )}
                            {!country.active && (
                              <span className="text-[9px] text-[#374151] flex-shrink-0 ml-auto">Soon</span>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}

                {selectedCountry && (
                  <div className="bg-[rgba(255,101,36,0.05)] border border-[rgba(255,101,36,0.15)] rounded-xl p-4 space-y-3">
                    <p className="text-sm font-semibold text-[#f1f5f9]">
                      {selectedCountry.name} — Configuration
                    </p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                      <div>
                        <p className="text-[#374151] mb-0.5">Currency</p>
                        <p className="text-[#f1f5f9] font-medium">{selectedCountry.currencySymbol} {selectedCountry.currency}</p>
                      </div>
                      <div>
                        <p className="text-[#374151] mb-0.5">Dial Code</p>
                        <p className="text-[#f1f5f9] font-medium">{selectedCountry.dialCode}</p>
                      </div>
                      <div>
                        <p className="text-[#374151] mb-0.5">Region</p>
                        <p className="text-[#f1f5f9] font-medium">{selectedCountry.region}</p>
                      </div>
                      <div>
                        <p className="text-[#374151] mb-0.5">Languages</p>
                        <p className="text-[#f1f5f9] font-medium">{selectedCountry.languages.slice(0, 2).join(", ")}</p>
                      </div>
                    </div>
                    {selectedCountry.mobileMoneyProviders && selectedCountry.mobileMoneyProviders.length > 0 && (
                      <div>
                        <p className="text-xs text-[#374151] mb-1.5">Mobile Money Providers</p>
                        <div className="flex flex-wrap gap-1.5">
                          {selectedCountry.mobileMoneyProviders.map((p) => (
                            <span key={p} className="text-[10px] bg-white/5 text-[#94a3b8] px-2 py-0.5 rounded-full border border-white/7">{p}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {selectedCountry.paymentMethods && selectedCountry.paymentMethods.length > 0 && (
                      <div>
                        <p className="text-xs text-[#374151] mb-1.5">Payment Methods</p>
                        <div className="flex flex-wrap gap-1.5">
                          {selectedCountry.paymentMethods.map((p) => (
                            <span key={p} className="text-[10px] bg-white/5 text-[#94a3b8] px-2 py-0.5 rounded-full border border-white/7">{p}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    <Button
                      size="sm"
                      onClick={() => { setCountrySaved(true); setTimeout(() => setCountrySaved(false), 3000); }}
                    >
                      {countrySaved ? <><CheckCircle2 size={13} /> Saved!</> : "Apply Country Settings"}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Currency settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign size={16} className="text-[#FF8B5E]" />
                  Currency & Display
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-[#64748b] mb-1.5 block">Primary Currency</label>
                    <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5">
                      <DollarSign size={14} className="text-[#374151]" />
                      <span className="text-sm text-[#f1f5f9]">{selectedCountry?.currency ?? "GHS"} — {selectedCountry?.name ?? "Ghana"}</span>
                      <ChevronDown size={14} className="text-[#374151] ml-auto" />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-[#64748b] mb-1.5 block">Number Format</label>
                    <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5">
                      <span className="text-sm text-[#f1f5f9]">1,234.56 (English)</span>
                      <ChevronDown size={14} className="text-[#374151] ml-auto" />
                    </div>
                  </div>
                </div>

                {/* Trade communities */}
                <div>
                  <p className="text-xs font-semibold text-[#374151] uppercase tracking-widest mb-2">Regional Communities</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {[
                      { name: "ECOWAS",   desc: "Economic Community of West States",        active: true  },
                      { name: "AfCFTA",   desc: "Continental Free Trade Area",              active: true  },
                      { name: "AU",       desc: "Economic Union (55 member states)",        active: true  },
                      { name: "EAC",      desc: "East Community",                           active: false },
                      { name: "SADC",     desc: "Southern Development Community",           active: false },
                    ].map(({ name, desc, active }) => (
                      <div key={name} className={`flex items-center gap-3 p-3 rounded-xl border ${active ? "bg-[rgba(255,101,36,0.04)] border-[rgba(255,101,36,0.15)]" : "bg-white/2 border-white/5"}`}>
                        <div className={`w-2 h-2 rounded-full ${active ? "bg-[#FF6524]" : "bg-[#374151]"}`} />
                        <div>
                          <p className="text-sm font-medium text-[#f1f5f9]">{name}</p>
                          <p className="text-xs text-[#64748b]">{desc}</p>
                        </div>
                        {active && <CheckCircle2 size={13} className="text-[#FF8B5E] ml-auto" />}
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Integrations */}
        {activeTab === "integrations" && (
          <Card>
            <CardHeader><CardTitle>Integrations</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {[
                { name: "KENUXA CORE",      icon: <LayoutGrid size={16} className="text-[#FF8B5E]" />,       connected: true,  desc: "Ecosystem identity, SSO & wallet" },
                { name: "Paystack",          icon: <CreditCard size={16} className="text-[#3B82F6]" />,       connected: false, desc: "Online card & bank payment processing" },
                { name: "MTN MoMo API",      icon: <Smartphone size={16} className="text-[#F59E0B]" />,       connected: true,  desc: "Direct MTN Mobile Money integration" },
                { name: "Telecel Cash",      icon: <Radio size={16} className="text-[#8B5CF6]" />,            connected: false, desc: "Telecel Cash payment gateway" },
                { name: "AT Money",          icon: <Zap size={16} className="text-[#10b981]" />,              connected: false, desc: "AirtelTigo Money integration" },
                { name: "Groq AI",           icon: <Cpu size={16} className="text-[#ec4899]" />,              connected: false, desc: "AI assistant, insights & automation" },
                { name: "Google Maps",       icon: <Map size={16} className="text-[#34d399]" />,              connected: false, desc: "Location services & mapping" },
                { name: "WhatsApp Business", icon: <MessageCircle size={16} className="text-[#10b981]" />,    connected: false, desc: "Customer messaging & campaigns" },
                { name: "GRA e-Tax",         icon: <FileText size={16} className="text-[#64748b]" />,         connected: false, desc: "Ghana Revenue Authority tax filing" },
              ].map((int) => (
                <div key={int.name} className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-[#111624] border border-white/7 flex items-center justify-center">
                      {int.icon}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[#f1f5f9]">{int.name}</p>
                      <p className="text-xs text-[#64748b]">{int.desc}</p>
                    </div>
                  </div>
                  {int.connected
                    ? <Badge variant="green">Connected</Badge>
                    : <Button size="sm" variant="secondary">Connect</Button>
                  }
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
