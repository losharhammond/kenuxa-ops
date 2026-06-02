"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/hooks/use-auth";
import { useRoleGuard } from "@/lib/hooks/use-role-guard";
import {
  ClipboardList, Plus, ChevronDown, ChevronUp, Send, Clock, CheckCircle2,
  XCircle, Gavel, Package, AlertCircle, TrendingUp, Building2, Calendar,
  DollarSign, Filter, Search, Eye, MessageSquare,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface RFQ {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  quantity: number | null;
  unit: string | null;
  budget_min: number | null;
  budget_max: number | null;
  deadline: string | null;
  status: string;
  business_id: string;
  business_name?: string;
  bids_count?: number;
  created_at: string;
}

interface Bid {
  id: string;
  rfq_id: string;
  bidder_id: string;
  bidder_name: string;
  price_per_unit: number;
  total_price: number;
  delivery_days: number | null;
  notes: string | null;
  status: string;
  created_at: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  open:      { label: "Open",      color: "text-emerald-400 bg-emerald-400/10",  icon: CheckCircle2 },
  bidding:   { label: "Bidding",   color: "text-blue-400 bg-blue-400/10",        icon: Gavel },
  awarded:   { label: "Awarded",   color: "text-orange-400 bg-orange-400/10",    icon: TrendingUp },
  fulfilled: { label: "Fulfilled", color: "text-purple-400 bg-purple-400/10",    icon: Package },
  closed:    { label: "Closed",    color: "text-slate-400 bg-slate-400/10",      icon: XCircle },
};

const CATEGORIES = [
  "Electronics", "Raw Materials", "Office Supplies", "Food & Beverages",
  "Machinery", "Chemicals", "Textiles", "Packaging", "Construction",
  "Automotive Parts", "Medical Supplies", "IT Equipment", "Agriculture",
];

const UNITS = ["units", "kg", "tonnes", "litres", "boxes", "pallets", "metres", "sets"];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return new Intl.NumberFormat("en-GH", { style: "currency", currency: "GHS", maximumFractionDigits: 0 }).format(n);
}

function daysAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  return `${days}d ago`;
}

// ─── BidCard ─────────────────────────────────────────────────────────────────

function BidCard({ bid, isOwner, onAward }: { bid: Bid; isOwner: boolean; onAward?: (bidId: string) => void }) {
  return (
    <div className="bg-white/3 border border-white/7 rounded-xl p-4 flex items-start gap-4">
      <div className="w-9 h-9 rounded-full bg-[rgba(255,101,36,0.15)] flex items-center justify-center flex-shrink-0">
        <span className="text-[#FF8B5E] font-semibold text-sm">{bid.bidder_name.charAt(0).toUpperCase()}</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[#f1f5f9] font-medium text-sm">{bid.bidder_name}</span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
            bid.status === "awarded" ? "bg-orange-400/15 text-orange-400" : "bg-white/8 text-[#64748b]"
          }`}>{bid.status}</span>
        </div>
        <div className="flex items-center gap-4 text-xs text-[#64748b] mb-2">
          <span className="text-[#FF8B5E] font-semibold">{fmt(bid.total_price)}</span>
          {bid.delivery_days && <span>· {bid.delivery_days}d delivery</span>}
          <span>· {daysAgo(bid.created_at)}</span>
        </div>
        {bid.notes && <p className="text-xs text-[#94a3b8]">{bid.notes}</p>}
      </div>
      {isOwner && bid.status === "pending" && onAward && (
        <button
          onClick={() => onAward(bid.id)}
          className="flex-shrink-0 px-3 py-1.5 bg-[rgba(255,101,36,0.15)] hover:bg-[rgba(255,101,36,0.25)] text-[#FF8B5E] text-xs font-medium rounded-lg transition-colors"
        >
          Award
        </button>
      )}
    </div>
  );
}

// ─── RFQCard ─────────────────────────────────────────────────────────────────

function RFQCard({
  rfq,
  myBusinessId,
  onBid,
  onAwardBid,
}: {
  rfq: RFQ;
  myBusinessId: string | null;
  onBid: (rfq: RFQ) => void;
  onAwardBid: (rfqId: string, bidId: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [bids, setBids] = useState<Bid[]>([]);
  const [loadingBids, setLoadingBids] = useState(false);
  const supabase = createClient();

  const isOwner = rfq.business_id === myBusinessId;
  const cfg = STATUS_CONFIG[rfq.status] ?? STATUS_CONFIG["open"]!;
  const StatusIcon = cfg!.icon;

  const loadBids = useCallback(async () => {
    if (!expanded) return;
    setLoadingBids(true);
    try {
      const { data } = await supabase
        .from("rfq_bids")
        .select("*")
        .eq("rfq_id", rfq.id)
        .order("total_price", { ascending: true });
      setBids(data ?? []);
    } finally {
      setLoadingBids(false);
    }
  }, [expanded, rfq.id, supabase]);

  useEffect(() => { loadBids(); }, [loadBids]);

  const handleAward = async (bidId: string) => {
    await supabase.from("rfq_bids").update({ status: "awarded" }).eq("id", bidId);
    await supabase.from("rfqs").update({ status: "awarded" }).eq("id", rfq.id);
    loadBids();
  };

  return (
    <div className="bg-[#131621] border border-white/7 rounded-2xl overflow-hidden hover:border-white/12 transition-colors">
      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-[#f1f5f9] font-semibold text-sm truncate">{rfq.title}</h3>
              {isOwner && (
                <span className="text-[9px] px-1.5 py-0.5 bg-[rgba(255,101,36,0.15)] text-[#FF8B5E] rounded-full font-bold flex-shrink-0">MINE</span>
              )}
            </div>
            {rfq.business_name && (
              <div className="flex items-center gap-1 text-xs text-[#64748b]">
                <Building2 size={11} />
                <span>{rfq.business_name}</span>
              </div>
            )}
          </div>
          <span className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium flex-shrink-0 ${cfg!.color}`}>
            <StatusIcon size={11} />
            {cfg!.label}
          </span>
        </div>

        {rfq.description && (
          <p className="text-xs text-[#64748b] mb-3 line-clamp-2">{rfq.description}</p>
        )}

        <div className="flex flex-wrap gap-3 text-xs text-[#94a3b8]">
          {rfq.category && (
            <span className="bg-white/5 px-2 py-1 rounded-full">{rfq.category}</span>
          )}
          {rfq.quantity && rfq.unit && (
            <span className="flex items-center gap-1">
              <Package size={11} /> {rfq.quantity} {rfq.unit}
            </span>
          )}
          {(rfq.budget_min || rfq.budget_max) && (
            <span className="flex items-center gap-1">
              <DollarSign size={11} />
              {rfq.budget_min && rfq.budget_max
                ? `${fmt(rfq.budget_min)} – ${fmt(rfq.budget_max)}`
                : rfq.budget_max ? `Up to ${fmt(rfq.budget_max)}` : `From ${fmt(rfq.budget_min!)}`}
            </span>
          )}
          {rfq.deadline && (
            <span className="flex items-center gap-1">
              <Calendar size={11} /> {new Date(rfq.deadline).toLocaleDateString("en-GH", { day: "numeric", month: "short" })}
            </span>
          )}
          <span className="flex items-center gap-1 ml-auto">
            <Clock size={11} /> {daysAgo(rfq.created_at)}
          </span>
        </div>
      </div>

      <div className="px-5 pb-4 flex items-center gap-3">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1.5 text-xs text-[#64748b] hover:text-[#94a3b8] transition-colors"
        >
          <MessageSquare size={13} />
          {rfq.bids_count ?? 0} bid{(rfq.bids_count ?? 0) !== 1 ? "s" : ""}
          {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </button>

        {!isOwner && rfq.status === "open" && (
          <button
            onClick={() => onBid(rfq)}
            className="ml-auto flex items-center gap-1.5 px-3 py-1.5 bg-[rgba(255,101,36,0.15)] hover:bg-[rgba(255,101,36,0.25)] text-[#FF8B5E] text-xs font-medium rounded-lg transition-colors"
          >
            <Gavel size={13} />
            Submit Bid
          </button>
        )}
      </div>

      {expanded && (
        <div className="border-t border-white/7 p-4 space-y-3 bg-white/2">
          {loadingBids ? (
            <p className="text-xs text-[#64748b] text-center py-4">Loading bids…</p>
          ) : bids.length === 0 ? (
            <p className="text-xs text-[#64748b] text-center py-4">No bids yet. Be the first to bid.</p>
          ) : (
            bids.map((bid) => (
              <BidCard key={bid.id} bid={bid} isOwner={isOwner} onAward={(bidId) => {
                onAwardBid(rfq.id, bidId);
                handleAward(bidId);
              }} />
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ─── BidModal ────────────────────────────────────────────────────────────────

function BidModal({ rfq, userId, businessName, onClose, onSubmitted }: {
  rfq: RFQ;
  userId: string;
  businessName: string;
  onClose: () => void;
  onSubmitted: () => void;
}) {
  const supabase = createClient();
  const [form, setForm] = useState({ price_per_unit: "", delivery_days: "", notes: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const qty = rfq.quantity ?? 1;
  const totalPrice = parseFloat(form.price_per_unit) * qty;

  const submit = async () => {
    if (!form.price_per_unit) { setError("Price is required"); return; }
    setSubmitting(true);
    const { error: err } = await supabase.from("rfq_bids").insert({
      rfq_id: rfq.id,
      bidder_id: userId,
      bidder_name: businessName,
      price_per_unit: parseFloat(form.price_per_unit),
      total_price: totalPrice,
      delivery_days: form.delivery_days ? parseInt(form.delivery_days) : null,
      notes: form.notes || null,
      status: "pending",
    });
    if (err) { setError(err.message); setSubmitting(false); return; }
    // Increment bids count
    await supabase.rpc("increment_rfq_bids", { p_rfq_id: rfq.id }).maybeSingle();
    // Update status to bidding if still open
    await supabase.from("rfqs").update({ status: "bidding" }).eq("id", rfq.id).eq("status", "open");
    onSubmitted();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div className="bg-[#131621] border border-white/10 rounded-2xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-[#f1f5f9] font-bold text-lg mb-1">Submit Bid</h2>
        <p className="text-xs text-[#64748b] mb-5">Bidding on: <span className="text-[#94a3b8]">{rfq.title}</span></p>

        <div className="space-y-4">
          <div>
            <label className="text-xs text-[#64748b] mb-1 block">Price per {rfq.unit ?? "unit"} (GHS) *</label>
            <input
              type="number"
              placeholder="0.00"
              value={form.price_per_unit}
              onChange={(e) => setForm({ ...form, price_per_unit: e.target.value })}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-[#f1f5f9] text-sm placeholder-[#374151] outline-none focus:border-[#FF6524]/50"
            />
            {form.price_per_unit && rfq.quantity && (
              <p className="text-xs text-[#FF8B5E] mt-1">Total: {fmt(totalPrice)} for {rfq.quantity} {rfq.unit}</p>
            )}
          </div>
          <div>
            <label className="text-xs text-[#64748b] mb-1 block">Delivery days</label>
            <input
              type="number"
              placeholder="e.g. 7"
              value={form.delivery_days}
              onChange={(e) => setForm({ ...form, delivery_days: e.target.value })}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-[#f1f5f9] text-sm placeholder-[#374151] outline-none focus:border-[#FF6524]/50"
            />
          </div>
          <div>
            <label className="text-xs text-[#64748b] mb-1 block">Message to buyer (optional)</label>
            <textarea
              placeholder="Describe your offer, quality guarantees, terms…"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={3}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-[#f1f5f9] text-sm placeholder-[#374151] outline-none focus:border-[#FF6524]/50 resize-none"
            />
          </div>
        </div>

        {error && <p className="text-xs text-red-400 mt-3">{error}</p>}

        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 py-3 bg-white/5 hover:bg-white/8 text-[#94a3b8] text-sm rounded-xl transition-colors">
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={submitting}
            className="flex-1 py-3 bg-[#FF6524] hover:bg-[#FF7A3D] disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            <Send size={15} />
            {submitting ? "Submitting…" : "Submit Bid"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── CreateRFQModal ───────────────────────────────────────────────────────────

function CreateRFQModal({ businessId, businessName, onClose, onCreated }: {
  businessId: string;
  businessName: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const supabase = createClient();
  const [form, setForm] = useState({
    title: "", description: "", category: "", quantity: "", unit: "units",
    budget_min: "", budget_max: "", deadline: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    if (!form.title.trim()) { setError("Title is required"); return; }
    setSubmitting(true);
    const { error: err } = await supabase.from("rfqs").insert({
      business_id: businessId,
      business_name: businessName,
      title: form.title.trim(),
      description: form.description || null,
      category: form.category || null,
      quantity: form.quantity ? parseFloat(form.quantity) : null,
      unit: form.unit,
      budget_min: form.budget_min ? parseFloat(form.budget_min) : null,
      budget_max: form.budget_max ? parseFloat(form.budget_max) : null,
      deadline: form.deadline || null,
      status: "open",
      bids_count: 0,
    });
    if (err) { setError(err.message); setSubmitting(false); return; }
    onCreated();
  };

  const field = (key: keyof typeof form, label: string, type = "text", placeholder = "") => (
    <div>
      <label className="text-xs text-[#64748b] mb-1 block">{label}</label>
      <input
        type={type}
        placeholder={placeholder}
        value={form[key]}
        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-[#f1f5f9] text-sm placeholder-[#374151] outline-none focus:border-[#FF6524]/50"
      />
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div className="bg-[#131621] border border-white/10 rounded-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-[#f1f5f9] font-bold text-lg mb-1">Post a Request for Quotation</h2>
        <p className="text-xs text-[#64748b] mb-5">Suppliers across the network will see and bid on your request.</p>

        <div className="space-y-4">
          {field("title", "What do you need? *", "text", "e.g. 500 kg of premium cocoa beans")}
          <div>
            <label className="text-xs text-[#64748b] mb-1 block">Description</label>
            <textarea
              placeholder="Describe specifications, quality requirements, packaging preferences…"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-[#f1f5f9] text-sm placeholder-[#374151] outline-none focus:border-[#FF6524]/50 resize-none"
            />
          </div>
          <div>
            <label className="text-xs text-[#64748b] mb-1 block">Category</label>
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-[#f1f5f9] text-sm outline-none focus:border-[#FF6524]/50"
            >
              <option value="">Select category…</option>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {field("quantity", "Quantity", "number", "500")}
            <div>
              <label className="text-xs text-[#64748b] mb-1 block">Unit</label>
              <select
                value={form.unit}
                onChange={(e) => setForm({ ...form, unit: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-[#f1f5f9] text-sm outline-none focus:border-[#FF6524]/50"
              >
                {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {field("budget_min", "Min budget (GHS)", "number", "0")}
            {field("budget_max", "Max budget (GHS)", "number", "10,000")}
          </div>
          {field("deadline", "Deadline", "date")}
        </div>

        {error && (
          <div className="flex items-center gap-2 text-xs text-red-400 mt-3">
            <AlertCircle size={13} /> {error}
          </div>
        )}

        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 py-3 bg-white/5 hover:bg-white/8 text-[#94a3b8] text-sm rounded-xl transition-colors">
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={submitting}
            className="flex-1 py-3 bg-[#FF6524] hover:bg-[#FF7A3D] disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            <Send size={15} />
            {submitting ? "Posting…" : "Post RFQ"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type Tab = "browse" | "my_rfqs";

export default function RFQPage() {
  useRoleGuard("suppliers.rfq");
  const { profile } = useAuth();
  const supabase = createClient();

  const [tab, setTab] = useState<Tab>("browse");
  const [rfqs, setRfqs] = useState<RFQ[]>([]);
  const [myRfqs, setMyRfqs] = useState<RFQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [bidTarget, setBidTarget] = useState<RFQ | null>(null);
  const [stats, setStats] = useState({ open: 0, myBids: 0, awarded: 0 });

  const businessId = (profile as { business_id?: string } | null)?.business_id ?? null;
  const businessName = (profile as { business_name?: string } | null)?.business_name ?? "My Business";
  const userId = (profile as { id?: string } | null)?.id ?? null;

  const loadRFQs = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("rfqs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      if (tab === "browse") {
        query = query.neq("status", "closed");
        if (businessId) query = query.neq("business_id", businessId);
      } else {
        if (!businessId) return;
        query = query.eq("business_id", businessId);
      }

      if (categoryFilter) query = query.eq("category", categoryFilter);
      if (statusFilter) query = query.eq("status", statusFilter);
      if (search.trim()) query = query.ilike("title", `%${search.trim()}%`);

      const { data } = await query;
      if (tab === "browse") setRfqs(data ?? []);
      else setMyRfqs(data ?? []);

      // Stats
      const [openRes, myBidsRes, awardedRes] = await Promise.all([
        supabase.from("rfqs").select("id", { count: "exact", head: true }).eq("status", "open"),
        userId ? supabase.from("rfq_bids").select("id", { count: "exact", head: true }).eq("bidder_id", userId) : Promise.resolve({ count: 0 }),
        businessId ? supabase.from("rfqs").select("id", { count: "exact", head: true }).eq("business_id", businessId).eq("status", "awarded") : Promise.resolve({ count: 0 }),
      ]);
      setStats({ open: openRes.count ?? 0, myBids: myBidsRes.count ?? 0, awarded: awardedRes.count ?? 0 });
    } finally {
      setLoading(false);
    }
  }, [tab, businessId, userId, categoryFilter, statusFilter, search, supabase]);

  useEffect(() => {
    const t = setTimeout(loadRFQs, 200);
    return () => clearTimeout(t);
  }, [loadRFQs]);

  const visibleRfqs = tab === "browse" ? rfqs : myRfqs;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#f1f5f9]">B2B Procurement Exchange</h1>
          <p className="text-sm text-[#64748b] mt-0.5">Source suppliers, post RFQs, and close deals on the KENUXA network</p>
        </div>
        {businessId && (
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#FF6524] hover:bg-[#FF7A3D] text-white text-sm font-semibold rounded-xl transition-colors flex-shrink-0"
          >
            <Plus size={16} />
            Post RFQ
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Open RFQs", value: stats.open,   icon: ClipboardList, color: "text-emerald-400" },
          { label: "My Bids",   value: stats.myBids, icon: Gavel,         color: "text-blue-400" },
          { label: "Awarded",   value: stats.awarded, icon: CheckCircle2, color: "text-orange-400" },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="bg-[#131621] border border-white/7 rounded-2xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center flex-shrink-0">
                <Icon size={18} className={s.color} />
              </div>
              <div>
                <p className="text-2xl font-bold text-[#f1f5f9]">{s.value}</p>
                <p className="text-xs text-[#64748b]">{s.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-white/3 rounded-xl w-fit">
        {([["browse", "Browse RFQs"], ["my_rfqs", "My RFQs"]] as [Tab, string][]).map(([t, label]) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === t ? "bg-[#FF6524] text-white" : "text-[#64748b] hover:text-[#f1f5f9]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#374151]" />
          <input
            type="text"
            placeholder="Search RFQs…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm text-[#f1f5f9] placeholder-[#374151] outline-none focus:border-[#FF6524]/50"
          />
        </div>
        <div className="relative">
          <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#374151]" />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm text-[#94a3b8] outline-none focus:border-[#FF6524]/50 appearance-none"
          >
            <option value="">All categories</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="relative">
          <Eye size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#374151]" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm text-[#94a3b8] outline-none focus:border-[#FF6524]/50 appearance-none"
          >
            <option value="">All statuses</option>
            {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>
      </div>

      {/* RFQ List */}
      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-36 bg-[#131621] border border-white/7 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : visibleRfqs.length === 0 ? (
        <div className="text-center py-16 bg-[#131621] border border-white/7 rounded-2xl">
          <ClipboardList size={40} className="mx-auto text-[#374151] mb-3" />
          <p className="text-[#94a3b8] font-medium mb-1">
            {tab === "browse" ? "No RFQs found" : "You haven't posted any RFQs yet"}
          </p>
          <p className="text-xs text-[#64748b]">
            {tab === "browse"
              ? "Try adjusting your filters or check back soon"
              : "Post your first RFQ to start receiving bids from suppliers"}
          </p>
          {tab === "my_rfqs" && businessId && (
            <button
              onClick={() => setShowCreate(true)}
              className="mt-4 px-4 py-2 bg-[rgba(255,101,36,0.15)] text-[#FF8B5E] text-sm rounded-xl hover:bg-[rgba(255,101,36,0.25)] transition-colors"
            >
              Post your first RFQ
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {visibleRfqs.map((rfq) => (
            <RFQCard
              key={rfq.id}
              rfq={rfq}
              myBusinessId={businessId}
              onBid={(r) => setBidTarget(r)}
              onAwardBid={() => loadRFQs()}
            />
          ))}
        </div>
      )}

      {/* How it works */}
      <div className="bg-[#131621] border border-white/7 rounded-2xl p-5">
        <h3 className="text-[#f1f5f9] font-semibold mb-4">How the Procurement Exchange Works</h3>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          {[
            { step: "1", label: "Post RFQ", desc: "Describe what you need — quantity, specs, budget, deadline" },
            { step: "2", label: "Receive Bids", desc: "Verified suppliers submit competitive bids within hours" },
            { step: "3", label: "Compare & Award", desc: "Review bids, compare prices, and award to your chosen supplier" },
            { step: "4", label: "Track Fulfillment", desc: "Monitor delivery and mark the order as fulfilled" },
          ].map((s) => (
            <div key={s.step} className="flex gap-3">
              <div className="w-7 h-7 rounded-full bg-[rgba(255,101,36,0.15)] text-[#FF8B5E] text-xs font-bold flex items-center justify-center flex-shrink-0">
                {s.step}
              </div>
              <div>
                <p className="text-[#f1f5f9] text-sm font-medium">{s.label}</p>
                <p className="text-xs text-[#64748b]">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modals */}
      {showCreate && businessId && (
        <CreateRFQModal
          businessId={businessId}
          businessName={businessName}
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); loadRFQs(); }}
        />
      )}

      {bidTarget && userId && (
        <BidModal
          rfq={bidTarget}
          userId={userId}
          businessName={businessName}
          onClose={() => setBidTarget(null)}
          onSubmitted={() => { setBidTarget(null); loadRFQs(); }}
        />
      )}
    </div>
  );
}
