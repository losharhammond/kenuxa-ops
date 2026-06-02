"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/hooks/use-auth";
import { useRoleGuard } from "@/lib/hooks/use-role-guard";
import {
  Banknote, TrendingUp, Clock, CheckCircle2,
  X, Check, Brain, BarChart3, ChevronRight,
  FileText, Zap, Building2, Package, Star,
  CreditCard,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface LoanApplication {
  id: string;
  business_id: string;
  type: string;
  amount: number;
  term_months: number;
  notes: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

type Tab = "overview" | "apply" | "applications" | "eligibility";

// ─── Loan Products ────────────────────────────────────────────────────────────
const LOAN_PRODUCTS = [
  {
    type:        "working_capital",
    label:       "Working Capital",
    icon:        Zap,
    color:       "text-blue-400",
    bg:          "bg-blue-400/10",
    border:      "border-blue-400/20",
    range:       "GHS 500 – 50,000",
    rate:        "2.5% / month",
    terms:       "1–12 months",
    description: "Fast cash for day-to-day operations. Stock, salaries, utilities.",
    features:    ["Approval in 24 hours", "No collateral below GHS 10k", "Flexible repayment"],
  },
  {
    type:        "inventory_finance",
    label:       "Inventory Finance",
    icon:        Package,
    color:       "text-green-400",
    bg:          "bg-green-400/10",
    border:      "border-green-400/20",
    range:       "GHS 2,000 – 200,000",
    rate:        "2.0% / month",
    terms:       "3–18 months",
    description: "Finance your stock purchases. Pay as you sell.",
    features:    ["Stock as collateral", "Revolving facility", "Supplier direct payments"],
  },
  {
    type:        "invoice_finance",
    label:       "Invoice Finance",
    icon:        FileText,
    color:       "text-purple-400",
    bg:          "bg-purple-400/10",
    border:      "border-purple-400/20",
    range:       "Up to 80% of invoice value",
    rate:        "1.5% / month",
    terms:       "30–90 days",
    description: "Convert your outstanding invoices to instant cash.",
    features:    ["Advance on verified invoices", "No long-term commitment", "Quick disbursement"],
  },
  {
    type:        "equipment_loan",
    label:       "Equipment Loan",
    icon:        Building2,
    color:       "text-yellow-400",
    bg:          "bg-yellow-400/10",
    border:      "border-yellow-400/20",
    range:       "GHS 5,000 – 500,000",
    rate:        "1.8% / month",
    terms:       "12–60 months",
    description: "Fund equipment, machinery, or vehicle purchases.",
    features:    ["Equipment as collateral", "Fixed monthly payments", "Tax deductible"],
  },
  {
    type:        "revenue_based",
    label:       "Revenue-Based Finance",
    icon:        TrendingUp,
    color:       "text-orange-400",
    bg:          "bg-orange-400/10",
    border:      "border-orange-400/20",
    range:       "GHS 3,000 – 100,000",
    rate:        "8–15% of revenue",
    terms:       "Until repaid",
    description: "Repay as a fixed % of your monthly revenue. No fixed terms.",
    features:    ["Repayments flex with revenue", "No fixed deadline", "KENUXA data-powered"],
  },
  {
    type:        "bnpl",
    label:       "Buy Now Pay Later",
    icon:        CreditCard,
    color:       "text-pink-400",
    bg:          "bg-pink-400/10",
    border:      "border-pink-400/20",
    range:       "GHS 100 – 5,000",
    rate:        "0% for 30 days",
    terms:       "30–90 days",
    description: "Let your customers buy now and pay in instalments.",
    features:    ["You get paid upfront", "KENUXA absorbs credit risk", "Increase basket size"],
  },
];

const APP_STATUS: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  pending:   { label: "Under Review",  color: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20", icon: Clock },
  approved:  { label: "Approved",      color: "text-green-400 bg-green-400/10 border-green-400/20",   icon: CheckCircle2 },
  active:    { label: "Active Loan",   color: "text-blue-400 bg-blue-400/10 border-blue-400/20",      icon: Banknote },
  rejected:  { label: "Declined",      color: "text-red-400 bg-red-400/10 border-red-400/20",         icon: X },
  completed: { label: "Completed",     color: "text-white/40 bg-white/5 border-white/10",             icon: Check },
};

// ─── Eligibility factors ──────────────────────────────────────────────────────
function useEligibilityScore(businessId: string | null) {
  const [score, setScore] = useState<number | null>(null);
  const [factors, setFactors] = useState<{ label: string; score: number; max: number; tip: string }[]>([]);
  const supabase = createClient();

  useEffect(() => {
    if (!businessId) return;
    async function compute() {
      const [salesRes, invRes, cusRes] = await Promise.all([
        supabase.from("sales").select("id, total_amount", { count: "exact" }).eq("business_id", businessId!).limit(100),
        supabase.from("invoices").select("id", { count: "exact" }).eq("business_id", businessId!),
        supabase.from("crm_customers").select("id", { count: "exact" }).eq("business_id", businessId!),
      ]);

      const salesCount   = salesRes.count ?? 0;
      const salesRevenue = (salesRes.data ?? []).reduce((s: number, r: { total_amount: number }) => s + (r.total_amount ?? 0), 0);
      const invoiceCount = invRes.count ?? 0;
      const customerCount= cusRes.count ?? 0;

      const f = [
        { label: "Sales Activity",   score: Math.min(30, Math.round((salesCount / 50) * 30)),       max: 30, tip: salesCount < 10 ? "Complete more POS sales to build your lending history." : "Good sales activity." },
        { label: "Revenue History",  score: Math.min(25, Math.round((salesRevenue / 50000) * 25)),  max: 25, tip: salesRevenue < 5000 ? "Process more revenue through KENUXA to qualify for higher amounts." : "Strong revenue history." },
        { label: "Invoice Track",    score: Math.min(20, Math.round((invoiceCount / 20) * 20)),     max: 20, tip: invoiceCount < 5 ? "Send invoices through KENUXA to demonstrate B2B activity." : "Good invoicing history." },
        { label: "Customer Base",    score: Math.min(15, Math.round((customerCount / 30) * 15)),    max: 15, tip: customerCount < 10 ? "Add customers to your CRM to improve your profile." : "Healthy customer base." },
        { label: "Profile Complete", score: 10,                                                       max: 10, tip: "Complete your business profile for full score." },
      ];

      setFactors(f);
      setScore(f.reduce((s, x) => s + x.score, 0));
    }
    compute();
  }, [businessId]); // eslint-disable-line react-hooks/exhaustive-deps

  return { score, factors };
}

// ─── LoanApplicationModal ──────────────────────────────────────────────────────
function LoanApplicationModal({
  product,
  onClose,
  onSubmit,
}: {
  product: (typeof LOAN_PRODUCTS)[number];
  onClose: () => void;
  onSubmit: (type: string, amount: number, term: number, notes: string) => void;
}) {
  const [amount, setAmount] = useState(5000);
  const [term, setTerm] = useState(6);
  const [notes, setNotes] = useState("");

  const monthlyRate = parseFloat(product.rate.replace("% / month", "").replace("% of revenue", "").replace("%", "")) / 100;
  const monthlyPayment = product.type === "revenue_based" || product.type === "bnpl" ? 0
    : (amount * monthlyRate * Math.pow(1 + monthlyRate, term)) / (Math.pow(1 + monthlyRate, term) - 1);
  const totalRepay = monthlyPayment > 0 ? monthlyPayment * term : amount * (1 + monthlyRate * term);

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#0d0f1a] border border-white/10 rounded-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-white/8">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-lg ${product.bg} flex items-center justify-center`}>
              <product.icon size={15} className={product.color} />
            </div>
            <h2 className="text-white font-semibold">{product.label}</h2>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white/80"><X size={18} /></button>
        </div>

        <div className="p-5 space-y-5">
          {/* Amount slider */}
          <div>
            <div className="flex justify-between mb-1">
              <label className="text-xs text-white/50">Loan Amount</label>
              <span className="text-sm text-white font-semibold">GHS {amount.toLocaleString()}</span>
            </div>
            <input type="range" min={500} max={50000} step={500} value={amount} onChange={(e) => setAmount(+e.target.value)}
              className="w-full accent-[#FF6524]" />
            <div className="flex justify-between text-[10px] text-white/25 mt-1">
              <span>GHS 500</span><span>GHS 50,000</span>
            </div>
          </div>

          {/* Term */}
          {product.type !== "bnpl" && (
            <div>
              <div className="flex justify-between mb-1">
                <label className="text-xs text-white/50">Repayment Term</label>
                <span className="text-sm text-white font-semibold">{term} months</span>
              </div>
              <input type="range" min={1} max={24} step={1} value={term} onChange={(e) => setTerm(+e.target.value)}
                className="w-full accent-[#FF6524]" />
              <div className="flex justify-between text-[10px] text-white/25 mt-1">
                <span>1 month</span><span>24 months</span>
              </div>
            </div>
          )}

          {/* Repayment summary */}
          <div className="bg-white/3 border border-white/8 rounded-xl p-4 space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-white/50">Interest Rate</span><span className="text-white">{product.rate}</span></div>
            {monthlyPayment > 0 && <div className="flex justify-between"><span className="text-white/50">Monthly Payment</span><span className="text-white">GHS {monthlyPayment.toFixed(2)}</span></div>}
            <div className="flex justify-between border-t border-white/8 pt-2"><span className="text-white/50">Total Repayment</span><span className="text-[#FF6524] font-semibold">GHS {totalRepay.toFixed(2)}</span></div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs text-white/50 mb-1 block">Purpose / Notes (optional)</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="What will you use this for?"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#FF6524]/50 resize-none" />
          </div>
        </div>

        <div className="flex gap-3 p-5 border-t border-white/8">
          <button onClick={onClose} className="flex-1 py-2 rounded-lg border border-white/10 text-white/60 text-sm">Cancel</button>
          <button onClick={() => onSubmit(product.type, amount, term, notes)}
            className="flex-1 py-2 rounded-lg bg-[#FF6524] text-white text-sm font-medium hover:bg-[#e55a1f]">
            Submit Application
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function LendingPage() {
  useRoleGuard("lending.view");
  const supabase = createClient();
  const { profile } = useAuth();

  const [tab, setTab] = useState<Tab>("overview");
  const [applications, setApplications] = useState<LoanApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [applyProduct, setApplyProduct] = useState<(typeof LOAN_PRODUCTS)[number] | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [, setSubmitting] = useState(false);

  const businessId = profile?.business_id;
  const { score: eligScore, factors } = useEligibilityScore(businessId ?? null);

  const load = useCallback(async () => {
    if (!businessId) return;
    setLoading(true);
    const { data } = await supabase.from("loan_applications").select("*").eq("business_id", businessId).order("created_at", { ascending: false });
    setApplications((data ?? []) as LoanApplication[]);
    setLoading(false);
  }, [businessId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

  const handleApply = async (type: string, amount: number, term: number, notes: string) => {
    if (!businessId) return;
    setSubmitting(true);
    await supabase.from("loan_applications").insert({ business_id: businessId, type, amount, term_months: term, notes: notes || null });
    setSubmitting(false);
    setApplyProduct(null);
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 3000);
    load();
    setTab("applications");
  };

  // Derived
  const activeLoans     = applications.filter((a) => a.status === "active");
  const pendingLoans    = applications.filter((a) => a.status === "pending");
  const totalBorrowed   = applications.filter((a) => ["active", "completed"].includes(a.status)).reduce((s, a) => s + a.amount, 0);

  const eligibilityTier = eligScore === null ? null
    : eligScore >= 80 ? { label: "Excellent",  color: "text-green-400",  bg: "bg-green-400/10", maxAmount: "GHS 200,000" }
    : eligScore >= 60 ? { label: "Good",        color: "text-blue-400",   bg: "bg-blue-400/10",  maxAmount: "GHS 50,000" }
    : eligScore >= 40 ? { label: "Fair",        color: "text-yellow-400", bg: "bg-yellow-400/10",maxAmount: "GHS 15,000" }
    : { label: "Building",   color: "text-white/40",  bg: "bg-white/5",         maxAmount: "GHS 2,000" };

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: "overview",     label: "Products" },
    { key: "eligibility",  label: "Eligibility" },
    { key: "applications", label: "My Applications", count: applications.length },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-[#FF6524] border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Banknote className="text-[#FF6524]" size={24} />
            KENUXA Lending
          </h1>
          <p className="text-white/40 text-sm mt-0.5">Merchant financing powered by your business data</p>
        </div>
        {submitted && (
          <div className="flex items-center gap-2 bg-green-400/10 border border-green-400/20 text-green-400 px-3 py-2 rounded-xl text-sm">
            <Check size={14} /> Application submitted!
          </div>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Credit Score", value: eligScore !== null ? `${eligScore}/100` : "—", sub: eligibilityTier?.label ?? "Calculating", color: eligibilityTier?.color ?? "text-white/40" },
          { label: "Max Available", value: eligibilityTier?.maxAmount ?? "—", sub: "pre-qualified", color: "text-green-400" },
          { label: "Active Loans", value: activeLoans.length, sub: "in progress", color: "text-blue-400" },
          { label: "Total Borrowed", value: `GHS ${totalBorrowed.toLocaleString()}`, sub: "lifetime", color: "text-[#FF6524]" },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-white/3 border border-white/8 rounded-xl p-4">
            <p className="text-xs text-white/40 mb-1">{kpi.label}</p>
            <p className={`text-xl font-bold ${kpi.color}`}>{kpi.value}</p>
            <p className="text-xs text-white/30 mt-0.5">{kpi.sub}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white/3 border border-white/8 rounded-xl p-1 w-fit">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${
              tab === t.key ? "bg-[#FF6524] text-white" : "text-white/50 hover:text-white"
            }`}>
            {t.label}
            {t.count !== undefined && t.count > 0 && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${tab === t.key ? "bg-white/20" : "bg-white/10 text-white/60"}`}>{t.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW / PRODUCTS ──────────────────────────────────────────────── */}
      {tab === "overview" && (
        <div className="space-y-4">
          <p className="text-sm text-white/50">Choose the financing product that fits your business needs.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {LOAN_PRODUCTS.map((product) => (
              <div key={product.type} className={`bg-white/3 border ${product.border} rounded-2xl p-5 hover:bg-white/5 transition-all flex flex-col`}>
                <div className="flex items-start justify-between mb-3">
                  <div className={`w-10 h-10 rounded-xl ${product.bg} flex items-center justify-center`}>
                    <product.icon size={18} className={product.color} />
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${product.bg} ${product.color} border ${product.border}`}>{product.rate}</span>
                </div>
                <h3 className="text-white font-semibold text-sm">{product.label}</h3>
                <p className="text-xs text-white/40 mt-1 flex-1">{product.description}</p>

                <div className="mt-3 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-white/40">Amount</span>
                    <span className="text-white/70">{product.range}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-white/40">Terms</span>
                    <span className="text-white/70">{product.terms}</span>
                  </div>
                </div>

                <ul className="mt-3 space-y-1">
                  {product.features.map((f) => (
                    <li key={f} className="flex items-center gap-1.5 text-xs text-white/50">
                      <Check size={10} className="text-green-400 flex-shrink-0" /> {f}
                    </li>
                  ))}
                </ul>

                <button onClick={() => setApplyProduct(product)}
                  className="mt-4 w-full py-2 rounded-xl bg-[#FF6524]/15 border border-[#FF6524]/20 text-[#FF8B5E] text-sm font-medium hover:bg-[#FF6524]/25 transition-all flex items-center justify-center gap-2">
                  Apply Now <ChevronRight size={14} />
                </button>
              </div>
            ))}
          </div>

          {/* Partners */}
          <div className="bg-white/3 border border-white/8 rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <Building2 size={14} className="text-[#FF6524]" /> Lending Partners
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              {["Fido Finance", "Asaase Capital", "ABSA SME", "MTN Xtralife"].map((partner) => (
                <div key={partner} className="bg-white/3 border border-white/8 rounded-xl px-3 py-2.5 text-center">
                  <p className="text-white/70 text-xs font-medium">{partner}</p>
                  <p className="text-white/30 text-[10px] mt-0.5">Verified Partner</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── ELIGIBILITY ──────────────────────────────────────────────────────── */}
      {tab === "eligibility" && (
        <div className="space-y-6">
          {/* Score card */}
          <div className="bg-gradient-to-br from-[#FF6524]/10 to-purple-500/8 border border-[#FF6524]/20 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-white font-semibold">KENUXA Credit Score</h3>
                <p className="text-xs text-white/40 mt-0.5">Powered by your business data</p>
              </div>
              <div className="text-right">
                <p className={`text-4xl font-bold ${eligibilityTier?.color ?? "text-white/40"}`}>
                  {eligScore ?? "—"}
                </p>
                <p className="text-xs text-white/30">/ 100</p>
              </div>
            </div>

            {/* Score bar */}
            <div className="w-full bg-white/5 rounded-full h-3 mb-2">
              <div
                className="h-3 rounded-full transition-all"
                style={{
                  width: `${eligScore ?? 0}%`,
                  background: "linear-gradient(90deg, #FF6524, #FF8B5E)",
                }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-white/25">
              <span>0 — Building</span><span>40 — Fair</span><span>60 — Good</span><span>80 — Excellent</span><span>100</span>
            </div>

            {eligibilityTier && (
              <div className={`mt-4 inline-flex items-center gap-2 ${eligibilityTier.bg} ${eligibilityTier.color} px-3 py-1.5 rounded-lg text-sm font-medium`}>
                <Star size={14} /> {eligibilityTier.label} — Pre-qualified up to {eligibilityTier.maxAmount}
              </div>
            )}
          </div>

          {/* Factors */}
          <div className="bg-white/3 border border-white/8 rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <BarChart3 size={14} className="text-[#FF6524]" /> Score Breakdown
            </h3>
            <div className="space-y-4">
              {factors.map((f) => {
                const pct = Math.round((f.score / f.max) * 100);
                return (
                  <div key={f.label}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-white/60">{f.label}</span>
                      <span className="text-white">{f.score}/{f.max}</span>
                    </div>
                    <div className="w-full bg-white/5 rounded-full h-1.5">
                      <div className="h-1.5 rounded-full bg-[#FF6524] transition-all" style={{ width: `${pct}%` }} />
                    </div>
                    <p className="text-[10px] text-white/30 mt-1">{f.tip}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* AI insight */}
          <div className="bg-white/3 border border-white/8 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <Brain size={15} className="text-[#FF6524]" />
              <h3 className="text-sm font-semibold text-white">How to Improve Your Score</h3>
            </div>
            <div className="space-y-2 text-sm text-white/60">
              <p className="bg-white/3 rounded-lg px-3 py-2">📊 Process more transactions through KENUXA POS — every sale builds your lending profile.</p>
              <p className="bg-white/3 rounded-lg px-3 py-2">📄 Send invoices to your B2B customers via KENUXA Invoicing — verified receivables are credit-positive.</p>
              <p className="bg-white/3 rounded-lg px-3 py-2">👥 Maintain an active CRM — regular customer relationships signal business stability.</p>
              <p className="bg-white/3 rounded-lg px-3 py-2">✅ Complete your business verification — verified businesses qualify for 2× higher loan amounts.</p>
            </div>
          </div>
        </div>
      )}

      {/* ── APPLICATIONS ─────────────────────────────────────────────────────── */}
      {tab === "applications" && (
        <div className="space-y-4">
          {pendingLoans.length > 0 && (
            <div className="flex items-center gap-2 bg-yellow-400/8 border border-yellow-400/20 rounded-xl px-4 py-3 text-sm text-yellow-400">
              <Clock size={14} /> {pendingLoans.length} application{pendingLoans.length > 1 ? "s" : ""} under review. Expect a decision within 24–48 hours.
            </div>
          )}

          {applications.length === 0 ? (
            <div className="text-center py-16 border border-white/8 rounded-2xl text-white/30">
              <Banknote size={40} className="mx-auto mb-3 opacity-20" />
              <p className="font-medium">No loan applications yet</p>
              <p className="text-xs mt-1">Browse products above to get started</p>
              <button onClick={() => setTab("overview")} className="mt-4 text-xs text-[#FF6524] hover:text-[#FF8B5E]">View loan products →</button>
            </div>
          ) : (
            <div className="space-y-3">
              {applications.map((app) => {
                const cfg = APP_STATUS[app.status] ?? APP_STATUS["pending"]!;
                const StatusIcon = cfg.icon;
                const product = LOAN_PRODUCTS.find((p) => p.type === app.type);
                return (
                  <div key={app.id} className="bg-white/3 border border-white/8 rounded-2xl p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl ${product?.bg ?? "bg-white/5"} flex items-center justify-center flex-shrink-0`}>
                          {product ? <product.icon size={18} className={product.color} /> : <Banknote size={18} className="text-white/40" />}
                        </div>
                        <div>
                          <p className="text-white font-medium text-sm">{product?.label ?? app.type}</p>
                          <p className="text-xs text-white/40 mt-0.5">
                            GHS {app.amount.toLocaleString()} · {app.term_months} months · {new Date(app.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <span className={`text-[10px] border px-2 py-0.5 rounded-full flex items-center gap-1 ${cfg.color}`}>
                        <StatusIcon size={10} /> {cfg.label}
                      </span>
                    </div>
                    {app.notes && <p className="text-xs text-white/30 mt-2 italic">"{app.notes}"</p>}
                    {app.status === "approved" && (
                      <div className="mt-3 bg-green-400/5 border border-green-400/20 rounded-lg px-3 py-2 text-xs text-green-400">
                        🎉 Congratulations! Your loan has been approved. Funds will be disbursed within 2 business days.
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Apply modal */}
      {applyProduct && (
        <LoanApplicationModal
          product={applyProduct}
          onClose={() => setApplyProduct(null)}
          onSubmit={handleApply}
        />
      )}
    </div>
  );
}
