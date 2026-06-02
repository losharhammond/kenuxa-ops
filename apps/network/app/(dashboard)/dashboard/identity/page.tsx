"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/hooks/use-auth";
import {
  ShieldCheck, Star, Briefcase, Award, TrendingUp, CheckCircle,
  AlertCircle, Globe, Lock, Zap, ChevronRight, BadgeCheck,
  Building2, CreditCard, BarChart3, Eye, Camera, Upload, Loader2,
} from "lucide-react";
import { ImageUpload } from "@/components/ui/image-upload";

interface IdentityScore {
  trust_score: number;
  talent_score: number;
  credit_score: number;
  professional_score: number;
  verifications: {
    email: boolean;
    phone: boolean;
    id_document: boolean;
    business: boolean;
    bank_account: boolean;
  };
  badges: string[];
  member_since: string;
  transactions_count: number;
  reviews_received: number;
  jobs_completed: number;
}

const SCORE_TIERS = [
  { min: 800, label: "Platinum", color: "#60A5FA", bg: "rgba(96,165,250,0.1)", border: "rgba(96,165,250,0.25)" },
  { min: 650, label: "Gold",     color: "#F59E0B", bg: "rgba(245,158,11,0.1)", border: "rgba(245,158,11,0.25)" },
  { min: 500, label: "Silver",   color: "#94a3b8", bg: "rgba(148,163,184,0.1)", border: "rgba(148,163,184,0.25)" },
  { min: 0,   label: "Bronze",   color: "#CD7F32", bg: "rgba(205,127,50,0.1)", border: "rgba(205,127,50,0.25)" },
];

function getTier(score: number) {
  return SCORE_TIERS.find((t) => score >= t.min) ?? SCORE_TIERS[SCORE_TIERS.length - 1]!;
}

function ScoreRing({ score, color, size = 80 }: { score: number; color: string; size?: number }) {
  const r = (size - 12) / 2;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(score / 1000, 1);
  const dash = circ * pct;
  const gap = circ - dash;
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={6} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={color} strokeWidth={6} strokeLinecap="round"
        strokeDasharray={`${dash} ${gap}`}
        style={{ transition: "stroke-dasharray 1s ease" }}
      />
    </svg>
  );
}

const VERIFICATION_ITEMS = [
  { key: "email",        label: "Email Address",   icon: Globe,       points: 50  },
  { key: "phone",        label: "Phone Number",    icon: Zap,         points: 75  },
  { key: "id_document",  label: "ID Document",     icon: CreditCard,  points: 150 },
  { key: "business",     label: "Business Profile",icon: Building2,   points: 100 },
  { key: "bank_account", label: "Bank Account",    icon: BarChart3,   points: 125 },
] as const;

export default function IdentityPage() {
  const { profile, user } = useAuth();
  const supabase = createClient();
  const [identity, setIdentity] = useState<IdentityScore | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "scores" | "verifications" | "badges" | "documents">("overview");
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [docUploads, setDocUploads] = useState<Record<string, string | null>>({});
  const [savingDoc, setSavingDoc] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const profilePhotoRes = await supabase.from("user_profiles").select("avatar_url").eq("id", user?.id ?? "").single();
    const pPhoto = (profilePhotoRes.data as { avatar_url?: string } | null)?.avatar_url;
    if (pPhoto) setProfilePhoto(pPhoto);

    const [txRes, reviewsRes, jobsRes] = await Promise.all([
      supabase.from("wallet_transactions").select("id", { count: "exact", head: true })
        .eq("user_id", profile?.id ?? ""),
      supabase.from("business_reviews").select("id", { count: "exact", head: true })
        .eq("reviewer_id", profile?.id ?? ""),
      supabase.from("skill_profiles").select("jobs_completed")
        .eq("user_id", user?.id ?? "").single(),
    ]);

    const txCount = txRes.count ?? 0;
    const reviewCount = reviewsRes.count ?? 0;
    const jobsCompleted = !jobsRes.error ? (jobsRes.data?.jobs_completed ?? 0) : 0;

    const emailVerified = user?.email_confirmed_at != null;
    const phoneVerified = user?.phone_confirmed_at != null;
    const hasBiz = !!profile?.business_id;

    const baseScore = 400;
    const emailPts = emailVerified ? 50 : 0;
    const phonePts = phoneVerified ? 75 : 0;
    const bizPts = hasBiz ? 100 : 0;
    const txPts = Math.min(txCount * 2, 150);
    const reviewPts = Math.min(reviewCount * 10, 100);
    const jobPts = Math.min(jobsCompleted * 15, 125);

    const trust = Math.min(baseScore + emailPts + phonePts + bizPts + txPts + reviewPts + jobPts, 1000);
    const talent = Math.min(400 + jobPts + reviewPts + (emailVerified ? 50 : 0), 1000);
    const credit = Math.min(350 + txPts + bizPts + (emailVerified ? 50 : 0) + phonePts, 1000);
    const professional = Math.min(400 + emailPts + phonePts + bizPts + jobPts, 1000);

    const badges: string[] = [];
    if (emailVerified) badges.push("Email Verified");
    if (hasBiz) badges.push("Business Owner");
    if (txCount > 10) badges.push("Active Trader");
    if (reviewCount > 5) badges.push("Well Reviewed");
    if (jobsCompleted > 5) badges.push("Proven Freelancer");
    if (trust >= 700) badges.push("Trusted Member");

    setIdentity({
      trust_score: trust,
      talent_score: talent,
      credit_score: credit,
      professional_score: professional,
      verifications: {
        email: emailVerified,
        phone: phoneVerified,
        id_document: false,
        business: hasBiz,
        bank_account: false,
      },
      badges,
      member_since: user?.created_at ?? new Date().toISOString(),
      transactions_count: txCount,
      reviews_received: reviewCount,
      jobs_completed: jobsCompleted,
    });
    setLoading(false);
  }, [supabase, profile, user]);

  useEffect(() => { load(); }, [load]);

  const verifiedCount = identity
    ? Object.values(identity.verifications).filter(Boolean).length
    : 0;

  const tier = identity ? getTier(identity.trust_score) : getTier(0);

  const KYC_DOC_TYPES = [
    { type: "national_id",   label: "Ghana Card / National ID", desc: "Front and back of your government ID", required: true },
    { type: "selfie",        label: "Selfie with ID",           desc: "Hold your ID clearly next to your face", required: true },
    { type: "proof_address", label: "Proof of Address",         desc: "Utility bill or bank statement (< 3 months)", required: false },
    { type: "business_reg",  label: "Business Registration",    desc: "Certificate of incorporation or business cert", required: false },
  ];

  const submitKycDoc = async (docType: string) => {
    const url = docUploads[docType];
    if (!url || !user?.id) return;
    setSavingDoc(docType);
    await supabase.from("kyc_documents").upsert({
      user_id: user.id, doc_type: docType, file_url: url,
      status: "pending", submitted_at: new Date().toISOString(),
    }, { onConflict: "user_id,doc_type" });
    setDocUploads((prev) => ({ ...prev, [docType]: null }));
    setSavingDoc(null);
  };

  const saveProfilePhoto = async (url: string | null) => {
    if (!user?.id) return;
    setProfilePhoto(url);
    await supabase.from("user_profiles").update({ avatar_url: url }).eq("id", user.id);
  };

  const TABS = [
    { key: "overview" as const,       label: "Overview" },
    { key: "scores" as const,         label: "My Scores" },
    { key: "verifications" as const,  label: "Verifications" },
    { key: "documents" as const,      label: "Documents" },
    { key: "badges" as const,         label: "Badges" },
  ];

  return (
    <div className="min-h-screen bg-[#070B14] text-white">
      {/* Header */}
      <div className="border-b border-white/7 bg-[#0d0f1a]">
        <div className="max-w-4xl mx-auto px-6 py-6">
          <div className="flex items-center gap-3 mb-1">
            <ShieldCheck size={20} className="text-[#FF6524]" />
            <h1 className="text-2xl font-bold text-white">KENUXA ID</h1>
          </div>
          <p className="text-sm text-[#64748b]">
            Your verified digital identity, trust scores, and reputation on the KENUXA network
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-6 space-y-6">
        {/* Identity Card */}
        {loading ? (
          <div className="h-40 bg-[#0d0f1a] border border-white/7 rounded-2xl animate-pulse" />
        ) : identity && (
          <div
            className="rounded-2xl p-6 border"
            style={{ background: `linear-gradient(135deg, ${tier.bg}, rgba(7,11,20,0.9))`, borderColor: tier.border }}
          >
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <ScoreRing score={identity.trust_score} color={tier.color} size={72} />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <p className="text-base font-bold text-white">{identity.trust_score}</p>
                    </div>
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-xl font-bold text-white">{profile?.full_name ?? "KENUXA User"}</p>
                    <BadgeCheck size={18} style={{ color: tier.color }} />
                  </div>
                  <p className="text-sm font-semibold" style={{ color: tier.color }}>{tier.label} Member</p>
                  <p className="text-xs text-[#64748b] mt-0.5">
                    KENUXA ID · {verifiedCount}/5 verifications · Member since {new Date(identity.member_since).getFullYear()}
                  </p>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold"
                  style={{ borderColor: tier.border, color: tier.color, background: tier.bg }}>
                  <Star size={12} fill="currentColor" />
                  Trust Score {identity.trust_score} / 1000
                </div>
                <p className="text-xs text-[#64748b]">{identity.transactions_count} transactions · {identity.reviews_received} reviews</p>
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 bg-[#0d0f1a] border border-white/7 rounded-2xl p-1.5">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${
                activeTab === t.key
                  ? "bg-[rgba(255,101,36,0.12)] text-[#FF8B5E]"
                  : "text-[#64748b] hover:text-white"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Overview */}
        {activeTab === "overview" && identity && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Trust Score",        value: identity.trust_score,        icon: ShieldCheck, color: "#FF6524" },
              { label: "Talent Score",        value: identity.talent_score,       icon: Star,        color: "#F59E0B" },
              { label: "Credit Score",        value: identity.credit_score,       icon: CreditCard,  color: "#10B981" },
              { label: "Professional Score",  value: identity.professional_score, icon: Briefcase,   color: "#8B5CF6" },
            ].map((s) => {
              const Icon = s.icon;
              const t = getTier(s.value);
              return (
                <div key={s.label} className="bg-[#0d0f1a] border border-white/7 rounded-2xl p-5 flex flex-col items-center">
                  <div className="relative mb-3">
                    <ScoreRing score={s.value} color={s.color} size={64} />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Icon size={16} style={{ color: s.color }} />
                    </div>
                  </div>
                  <p className="text-xl font-bold text-white">{s.value}</p>
                  <p className="text-xs text-[#64748b] text-center mt-0.5">{s.label}</p>
                  <span className="text-[10px] mt-2 px-2 py-0.5 rounded-full font-semibold" style={{ color: t.color, background: t.bg }}>
                    {t.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* Scores detail */}
        {activeTab === "scores" && identity && (
          <div className="space-y-4">
            {[
              {
                label: "Trust Score", value: identity.trust_score, icon: ShieldCheck, color: "#FF6524",
                desc: "Your overall trustworthiness on the KENUXA network. Based on verifications, transaction history, and community reviews.",
                factors: [
                  { label: "Email verified",        pts: identity.verifications.email ? 50 : 0,    max: 50 },
                  { label: "Phone verified",         pts: identity.verifications.phone ? 75 : 0,    max: 75 },
                  { label: "Business profile",       pts: identity.verifications.business ? 100 : 0, max: 100 },
                  { label: "Transaction history",    pts: Math.min(identity.transactions_count * 2, 150), max: 150 },
                  { label: "Community reviews",      pts: Math.min(identity.reviews_received * 10, 100), max: 100 },
                ],
              },
              {
                label: "Credit Score", value: identity.credit_score, icon: CreditCard, color: "#10B981",
                desc: "Used by financial partners to evaluate your eligibility for loans, BNPL, and credit facilities.",
                factors: [
                  { label: "Transaction volume",  pts: Math.min(identity.transactions_count * 2, 150), max: 150 },
                  { label: "Business profile",    pts: identity.verifications.business ? 100 : 0, max: 100 },
                  { label: "Verified identity",   pts: (identity.verifications.email ? 50 : 0) + (identity.verifications.phone ? 75 : 0), max: 125 },
                  { label: "Bank account linked", pts: identity.verifications.bank_account ? 125 : 0, max: 125 },
                ],
              },
            ].map((s) => {
              const Icon = s.icon;
              const t = getTier(s.value);
              return (
                <div key={s.label} className="bg-[#0d0f1a] border border-white/7 rounded-2xl p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${s.color}20` }}>
                      <Icon size={18} style={{ color: s.color }} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-white">{s.label}</p>
                        <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ color: t.color, background: t.bg }}>{t.label}</span>
                      </div>
                      <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value} <span className="text-sm text-[#64748b] font-normal">/ 1000</span></p>
                    </div>
                  </div>
                  <p className="text-xs text-[#64748b] mb-4">{s.desc}</p>
                  <div className="space-y-2.5">
                    {s.factors.map((f) => (
                      <div key={f.label}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-[#94a3b8]">{f.label}</span>
                          <span className="text-xs font-semibold text-white">{f.pts} / {f.max}</span>
                        </div>
                        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${(f.pts / f.max) * 100}%`, backgroundColor: s.color }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Verifications */}
        {activeTab === "verifications" && identity && (
          <div className="space-y-3">
            <p className="text-sm text-[#64748b]">
              Each verification increases your KENUXA scores and unlocks higher trust levels.
            </p>
            {VERIFICATION_ITEMS.map((v) => {
              const Icon = v.icon;
              const done = identity.verifications[v.key];
              return (
                <div key={v.key} className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${
                  done
                    ? "bg-[rgba(52,211,153,0.04)] border-[rgba(52,211,153,0.2)]"
                    : "bg-[#0d0f1a] border-white/7 hover:border-white/15"
                }`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${done ? "bg-[rgba(52,211,153,0.1)]" : "bg-white/5"}`}>
                      <Icon size={16} className={done ? "text-[#34d399]" : "text-[#64748b]"} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{v.label}</p>
                      <p className="text-xs text-[#64748b]">+{v.points} score points</p>
                    </div>
                  </div>
                  {done ? (
                    <div className="flex items-center gap-1.5 text-[#34d399] text-xs font-semibold">
                      <CheckCircle size={14} /> Verified
                    </div>
                  ) : (
                    <button className="flex items-center gap-1 text-xs text-[#FF8B5E] hover:text-[#FF6524] font-semibold transition-colors">
                      Verify <ChevronRight size={13} />
                    </button>
                  )}
                </div>
              );
            })}

            <div className="mt-4 p-4 bg-[rgba(59,130,246,0.05)] border border-[rgba(59,130,246,0.15)] rounded-2xl flex items-start gap-3">
              <AlertCircle size={16} className="text-[#60A5FA] flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-white mb-1">ID document verification</p>
                <p className="text-xs text-[#64748b]">
                  Verifying a government-issued ID unlocks higher credit limits and financial partner services. Contact support to complete KYC verification.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Badges */}
        {activeTab === "badges" && identity && (
          <div className="space-y-4">
            <p className="text-sm text-[#64748b]">Badges are awarded automatically as you grow on the KENUXA network.</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {identity.badges.map((badge) => (
                <div key={badge} className="flex items-center gap-3 p-4 bg-[#0d0f1a] border border-white/7 rounded-2xl">
                  <div className="w-9 h-9 rounded-xl bg-[rgba(255,101,36,0.1)] flex items-center justify-center">
                    <Award size={16} className="text-[#FF8B5E]" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{badge}</p>
                    <p className="text-xs text-[#64748b]">Earned</p>
                  </div>
                </div>
              ))}
              {/* Locked badges */}
              {[
                "Top Contributor", "100 Transactions", "Mentor", "Ambassador",
              ].map((badge) => (
                <div key={badge} className="flex items-center gap-3 p-4 bg-[#0d0f1a] border border-white/7 rounded-2xl opacity-40">
                  <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center">
                    <Lock size={16} className="text-[#64748b]" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[#94a3b8]">{badge}</p>
                    <p className="text-xs text-[#64748b]">Locked</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Privacy note */}
            <div className="p-4 bg-[#0d0f1a] border border-white/7 rounded-2xl flex items-start gap-3">
              <Eye size={15} className="text-[#64748b] flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-white mb-1">Who can see your scores?</p>
                <p className="text-xs text-[#64748b]">
                  Your KENUXA Trust Score is visible to businesses you transact with and verified financial partners. Individual score breakdown is always private to you.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Documents */}
        {activeTab === "documents" && (
          <div className="space-y-5">
            {/* Profile Photo */}
            <div className="bg-[#0d0f1a] border border-white/7 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <Camera size={14} className="text-[#FF8B5E]" />
                <p className="text-sm font-semibold text-white">Profile Photo</p>
              </div>
              <div className="flex items-center gap-5">
                <ImageUpload
                  value={profilePhoto}
                  onChange={saveProfilePhoto}
                  bucket="avatars"
                  path={`profiles/${user?.id}`}
                  shape="circle"
                  size="lg"
                  placeholder="Upload photo"
                />
                <div className="text-xs text-[#64748b] space-y-1.5">
                  <p>• Clear, well-lit face photo</p>
                  <p>• No sunglasses or face coverings</p>
                  <p>• JPG, PNG or WebP · Max 5 MB</p>
                  <p className="text-[#10b981]">✓ Used for identity verification match</p>
                </div>
              </div>
            </div>

            {/* KYC Documents */}
            <p className="text-xs text-[#374151] uppercase tracking-widest font-semibold">KYC Documents</p>
            {KYC_DOC_TYPES.map((doc) => (
              <div key={doc.type} className="bg-[#0d0f1a] border border-white/7 rounded-2xl p-5 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-white">{doc.label}</p>
                      {doc.required && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-[rgba(255,101,36,0.15)] text-[#FF8B5E] font-bold">REQUIRED</span>
                      )}
                    </div>
                    <p className="text-xs text-[#64748b] mt-0.5">{doc.desc}</p>
                  </div>
                </div>
                <div className="flex items-end gap-3">
                  <ImageUpload
                    value={docUploads[doc.type] ?? null}
                    onChange={(url) => setDocUploads((prev) => ({ ...prev, [doc.type]: url }))}
                    bucket="kyc-documents"
                    path={`${user?.id}/${doc.type}`}
                    accept="image/jpeg,image/png,image/webp"
                    maxSizeMB={10}
                    shape="square"
                    size="sm"
                    placeholder="Upload"
                  />
                  {docUploads[doc.type] && (
                    <button
                      onClick={() => submitKycDoc(doc.type)}
                      disabled={savingDoc === doc.type}
                      className="h-9 px-4 rounded-xl bg-[rgba(255,101,36,0.15)] text-[#FF8B5E] border border-[rgba(255,101,36,0.25)] text-xs font-semibold hover:bg-[rgba(255,101,36,0.25)] transition-colors flex items-center gap-1.5 disabled:opacity-50">
                      {savingDoc === doc.type ? <Loader2 size={11} className="animate-spin" /> : <Upload size={11} />}
                      Submit for Review
                    </button>
                  )}
                </div>
              </div>
            ))}

            <div className="p-4 rounded-xl bg-[rgba(16,185,129,0.05)] border border-[rgba(16,185,129,0.15)] flex items-start gap-3">
              <ShieldCheck size={14} className="text-[#10b981] flex-shrink-0 mt-0.5" />
              <p className="text-xs text-[#64748b]">
                Your documents are encrypted and only reviewed by authorized KENUXA compliance officers. They are never shared with third parties without your consent.
              </p>
            </div>
          </div>
        )}

        {/* How it works */}
        <div className="bg-[#0d0f1a] border border-white/7 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={15} className="text-[#FF6524]" />
            <p className="font-semibold text-white text-sm">How to improve your scores</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              { icon: ShieldCheck, label: "Verify your identity", desc: "Complete all 5 verification steps", color: "#10B981" },
              { icon: BarChart3,   label: "Transact more",        desc: "Each sale/purchase adds trust points", color: "#3B82F6" },
              { icon: Star,        label: "Earn reviews",         desc: "Ask satisfied customers to review you", color: "#F59E0B" },
            ].map((tip) => {
              const Icon = tip.icon;
              return (
                <div key={tip.label} className="flex items-start gap-3 p-3 bg-white/[0.02] border border-white/7 rounded-xl">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${tip.color}20` }}>
                    <Icon size={15} style={{ color: tip.color }} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{tip.label}</p>
                    <p className="text-xs text-[#64748b]">{tip.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
