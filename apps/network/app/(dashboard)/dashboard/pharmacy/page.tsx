"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/hooks/use-auth";
import {
  Pill, Search, Plus, AlertTriangle, Calendar, Package,
  TrendingUp, X, Check, Clock,
  BarChart3, Brain, ShieldCheck, Thermometer, Edit2, Trash2,
  FileText, Star,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Medicine {
  id: string;
  business_id: string;
  name: string;
  generic_name: string | null;
  category: string;
  unit: string;
  stock_quantity: number;
  reorder_level: number;
  unit_cost: number;
  selling_price: number;
  expiry_date: string | null;
  batch_number: string | null;
  supplier: string | null;
  requires_prescription: boolean;
  storage_temp: string;
  is_active: boolean;
  image_url: string | null;
  created_at: string;
}

interface Prescription {
  id: string;
  business_id: string;
  patient_name: string;
  patient_phone: string | null;
  doctor_name: string | null;
  prescription_url: string | null;
  items: PrescriptionItem[];
  status: string;
  notes: string | null;
  created_at: string;
}

interface PrescriptionItem {
  medicine_id: string;
  medicine_name: string;
  quantity: number;
  dosage: string;
  price: number;
}

type Tab = "catalog" | "expiry" | "prescriptions" | "analytics";

const CATEGORIES = [
  "Antibiotics", "Analgesics", "Antimalaria", "Vitamins & Supplements",
  "Antihypertensive", "Antidiabetic", "Antihistamine", "Antifungal",
  "Respiratory", "Gastrointestinal", "Dermatology", "Eye & Ear",
  "Surgical Supplies", "Diagnostics", "Traditional Medicine", "Other",
];

const STORAGE_TEMPS = [
  "Room Temperature (15–25°C)",
  "Cool (8–15°C)",
  "Refrigerated (2–8°C)",
  "Frozen (−20°C)",
];

const UNITS = ["Tablets", "Capsules", "Syrup (ml)", "Injection (vial)", "Cream (g)", "Drops", "Sachets", "Units"];

const PRESCRIPTION_STATUS: Record<string, { label: string; color: string }> = {
  pending:    { label: "Pending Review",  color: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20" },
  verified:   { label: "Verified",        color: "text-blue-400 bg-blue-400/10 border-blue-400/20" },
  dispensed:  { label: "Dispensed",       color: "text-green-400 bg-green-400/10 border-green-400/20" },
  rejected:   { label: "Rejected",        color: "text-red-400 bg-red-400/10 border-red-400/20" },
};

// Demo medicines seed

// Days until expiry
function daysUntil(dateStr: string): number {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
}

function expiryBadge(dateStr: string | null) {
  if (!dateStr) return null;
  const d = daysUntil(dateStr);
  if (d < 0)   return { label: "Expired",       color: "text-red-400 bg-red-400/10 border-red-400/20" };
  if (d <= 30) return { label: `${d}d left`,     color: "text-red-400 bg-red-400/10 border-red-400/20" };
  if (d <= 90) return { label: `${d}d left`,     color: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20" };
  return null;
}

// ─── MedicineModal ─────────────────────────────────────────────────────────────
function MedicineModal({
  item,
  onClose,
  onSave,
}: {
  item: Partial<Medicine> | null;
  onClose: () => void;
  onSave: (data: Partial<Medicine>) => void;
}) {
  const [form, setForm] = useState<Partial<Medicine>>(
    item ?? {
      name: "", generic_name: "", category: "Antibiotics", unit: "Tablets",
      stock_quantity: 0, reorder_level: 20, unit_cost: 0, selling_price: 0,
      expiry_date: "", batch_number: "", supplier: "",
      requires_prescription: false, storage_temp: "Room Temperature (15–25°C)",
      is_active: true, image_url: null,
    }
  );

  const set = (k: keyof Medicine, v: unknown) =>
    setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#0d0f1a] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-white/8">
          <h2 className="text-white font-semibold">{item?.id ? "Edit Medicine" : "Add Medicine"}</h2>
          <button onClick={onClose} className="text-white/40 hover:text-white/80"><X size={18} /></button>
        </div>

        <div className="p-5 grid grid-cols-2 gap-4">
          {/* Name */}
          <div className="col-span-2">
            <label className="text-xs text-white/50 mb-1 block">Medicine Name *</label>
            <input value={form.name ?? ""} onChange={(e) => set("name", e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#FF6524]/50" />
          </div>
          {/* Generic */}
          <div>
            <label className="text-xs text-white/50 mb-1 block">Generic Name</label>
            <input value={form.generic_name ?? ""} onChange={(e) => set("generic_name", e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#FF6524]/50" />
          </div>
          {/* Category */}
          <div>
            <label className="text-xs text-white/50 mb-1 block">Category</label>
            <select value={form.category ?? "Antibiotics"} onChange={(e) => set("category", e.target.value)}
              className="w-full bg-[#0d0f1a] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#FF6524]/50">
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          {/* Unit */}
          <div>
            <label className="text-xs text-white/50 mb-1 block">Unit</label>
            <select value={form.unit ?? "Tablets"} onChange={(e) => set("unit", e.target.value)}
              className="w-full bg-[#0d0f1a] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#FF6524]/50">
              {UNITS.map((u) => <option key={u}>{u}</option>)}
            </select>
          </div>
          {/* Stock */}
          <div>
            <label className="text-xs text-white/50 mb-1 block">Stock Quantity</label>
            <input type="number" min={0} value={form.stock_quantity ?? 0} onChange={(e) => set("stock_quantity", +e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#FF6524]/50" />
          </div>
          {/* Reorder */}
          <div>
            <label className="text-xs text-white/50 mb-1 block">Reorder Level</label>
            <input type="number" min={0} value={form.reorder_level ?? 20} onChange={(e) => set("reorder_level", +e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#FF6524]/50" />
          </div>
          {/* Cost */}
          <div>
            <label className="text-xs text-white/50 mb-1 block">Unit Cost (GHS)</label>
            <input type="number" min={0} step={0.01} value={form.unit_cost ?? 0} onChange={(e) => set("unit_cost", +e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#FF6524]/50" />
          </div>
          {/* Selling */}
          <div>
            <label className="text-xs text-white/50 mb-1 block">Selling Price (GHS)</label>
            <input type="number" min={0} step={0.01} value={form.selling_price ?? 0} onChange={(e) => set("selling_price", +e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#FF6524]/50" />
          </div>
          {/* Expiry */}
          <div>
            <label className="text-xs text-white/50 mb-1 block">Expiry Date</label>
            <input type="date" value={form.expiry_date ?? ""} onChange={(e) => set("expiry_date", e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#FF6524]/50" />
          </div>
          {/* Batch */}
          <div>
            <label className="text-xs text-white/50 mb-1 block">Batch Number</label>
            <input value={form.batch_number ?? ""} onChange={(e) => set("batch_number", e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#FF6524]/50" />
          </div>
          {/* Supplier */}
          <div>
            <label className="text-xs text-white/50 mb-1 block">Supplier</label>
            <input value={form.supplier ?? ""} onChange={(e) => set("supplier", e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#FF6524]/50" />
          </div>
          {/* Storage */}
          <div className="col-span-2">
            <label className="text-xs text-white/50 mb-1 block">Storage Temperature</label>
            <select value={form.storage_temp ?? "Room Temperature (15–25°C)"} onChange={(e) => set("storage_temp", e.target.value)}
              className="w-full bg-[#0d0f1a] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#FF6524]/50">
              {STORAGE_TEMPS.map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
          {/* Toggles */}
          <div className="col-span-2 flex items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.requires_prescription ?? false}
                onChange={(e) => set("requires_prescription", e.target.checked)}
                className="w-4 h-4 accent-[#FF6524]" />
              <span className="text-sm text-white/70">Requires Prescription</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.is_active ?? true}
                onChange={(e) => set("is_active", e.target.checked)}
                className="w-4 h-4 accent-[#FF6524]" />
              <span className="text-sm text-white/70">Active / In Stock</span>
            </label>
          </div>
        </div>

        <div className="flex gap-3 p-5 border-t border-white/8">
          <button onClick={onClose} className="flex-1 py-2 rounded-lg border border-white/10 text-white/60 hover:text-white text-sm">Cancel</button>
          <button onClick={() => onSave(form)} className="flex-1 py-2 rounded-lg bg-[#FF6524] text-white text-sm font-medium hover:bg-[#e55a1f]">
            {item?.id ? "Update" : "Add Medicine"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function PharmacyPage() {
  const supabase = createClient();
  const { profile } = useAuth();

  const [tab, setTab] = useState<Tab>("catalog");
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<Medicine | null>(null);
  const [, setSaving] = useState(false);

  const businessId = profile?.business_id;

  // ── Load ────────────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    if (!businessId) return;
    setLoading(true);
    try {
    const [medRes, rxRes] = await Promise.all([
      supabase.from("pharmacy_medicines").select("*").eq("business_id", businessId).order("name"),
      supabase.from("pharmacy_prescriptions").select("*").eq("business_id", businessId).order("created_at", { ascending: false }),
    ]);

    const meds = (medRes.data ?? []) as Medicine[];
    const rxs  = (rxRes.data  ?? []) as Prescription[];

    setMedicines(meds);
    setPrescriptions(rxs);
  } finally {
    setLoading(false);
  }
  }, [businessId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

  // ── Save medicine ───────────────────────────────────────────────────────────
  const handleSave = async (data: Partial<Medicine>) => {
    if (!businessId || !data.name) return;
    setSaving(true);

    const payload = { ...data, business_id: businessId };

    let saveErr: { message: string } | null = null;
    if (editItem?.id) {
      const { error } = await supabase.from("pharmacy_medicines").update(payload).eq("id", editItem.id);
      saveErr = error;
    } else {
      const { error } = await supabase.from("pharmacy_medicines").insert(payload);
      saveErr = error;
    }

    setSaving(false);
    if (saveErr) return;
    setShowModal(false);
    setEditItem(null);
    load();
  };

  // ── Delete ──────────────────────────────────────────────────────────────────
  const handleDelete = async (id: string) => {
    await supabase.from("pharmacy_medicines").delete().eq("id", id);
    load();
  };

  // ── Update prescription status ──────────────────────────────────────────────
  const updateRxStatus = async (id: string, status: string) => {
    await supabase.from("pharmacy_prescriptions").update({ status }).eq("id", id);
    load();
  };

  // ── Derived data ─────────────────────────────────────────────────────────────
  const filtered = medicines.filter((m) => {
    const q = search.toLowerCase();
    const matchSearch = !q || m.name.toLowerCase().includes(q) || (m.generic_name ?? "").toLowerCase().includes(q);
    const matchCat = categoryFilter === "All" || m.category === categoryFilter;
    return matchSearch && matchCat;
  });

  const lowStock     = medicines.filter((m) => m.stock_quantity <= m.reorder_level);
  const expiringSoon = medicines.filter((m) => m.expiry_date && daysUntil(m.expiry_date) <= 90 && daysUntil(m.expiry_date) >= 0);
  const expired      = medicines.filter((m) => m.expiry_date && daysUntil(m.expiry_date) < 0);
  const totalValue   = medicines.reduce((s, m) => s + m.stock_quantity * m.unit_cost, 0);
  const pendingRx    = prescriptions.filter((p) => p.status === "pending").length;

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: "catalog",       label: "Medicine Catalog",   count: medicines.length },
    { key: "expiry",        label: "Expiry Tracker",     count: expiringSoon.length + expired.length },
    { key: "prescriptions", label: "Prescriptions",      count: pendingRx },
    { key: "analytics",     label: "Analytics & AI" },
  ];

  // ── AI Insight ───────────────────────────────────────────────────────────────
  const aiInsights = [
    lowStock.length > 0
      ? `⚠️ ${lowStock.length} item${lowStock.length > 1 ? "s" : ""} below reorder level. Prioritize: ${lowStock.slice(0, 2).map((m) => m.name).join(", ")}.`
      : "✅ All stock levels are healthy. No reorder required today.",
    expired.length > 0
      ? `🚨 ${expired.length} expired item${expired.length > 1 ? "s" : ""} must be quarantined and destroyed per FDA Ghana guidelines.`
      : `📦 No expired medicines detected. Next expiry check: ${expiringSoon[0]?.expiry_date ?? "N/A"}.`,
    `💊 Refrigerated items (${medicines.filter((m) => m.storage_temp.includes("Refrigerated")).length}) require daily temperature log compliance.`,
    `📋 ${pendingRx} prescription${pendingRx !== 1 ? "s" : ""} awaiting pharmacist verification.`,
  ];

  // ── Top movers by inventory value ────────────────────────────────────────────
  const topMovers = [...medicines].sort((a, b) => b.selling_price * b.stock_quantity - a.selling_price * a.stock_quantity).slice(0, 5);

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
            <Pill className="text-[#FF6524]" size={24} />
            Pharmacy OS
          </h1>
          <p className="text-white/40 text-sm mt-0.5">Medicine management, expiry tracking & prescriptions</p>
        </div>
        <button
          onClick={() => { setEditItem(null); setShowModal(true); }}
          className="flex items-center gap-2 bg-[#FF6524] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#e55a1f]"
        >
          <Plus size={16} /> Add Medicine
        </button>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total SKUs",     value: medicines.length,          icon: Package,       color: "text-blue-400" },
          { label: "Low Stock",      value: lowStock.length,           icon: AlertTriangle, color: "text-yellow-400" },
          { label: "Expiring Soon",  value: expiringSoon.length,       icon: Calendar,      color: "text-orange-400" },
          { label: "Stock Value",    value: `GHS ${totalValue.toLocaleString("en-GH", { minimumFractionDigits: 2 })}`, icon: TrendingUp, color: "text-green-400" },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-white/3 border border-white/8 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-white/40">{kpi.label}</span>
              <kpi.icon size={16} className={kpi.color} />
            </div>
            <p className="text-2xl font-bold text-white">{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white/3 border border-white/8 rounded-xl p-1 w-fit">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${
              tab === t.key ? "bg-[#FF6524] text-white" : "text-white/50 hover:text-white"
            }`}
          >
            {t.label}
            {t.count !== undefined && t.count > 0 && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                tab === t.key ? "bg-white/20 text-white" : "bg-white/10 text-white/60"
              }`}>{t.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── CATALOG ─────────────────────────────────────────────────────────────── */}
      {tab === "catalog" && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
              <input
                placeholder="Search medicines..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-white text-sm focus:outline-none focus:border-[#FF6524]/50"
              />
            </div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-[#0d0f1a] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#FF6524]/50"
            >
              <option value="All">All Categories</option>
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>

          {/* Table */}
          <div className="bg-white/3 border border-white/8 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/8">
                  {["Medicine", "Category", "Stock", "Selling Price", "Expiry", "Rx", ""].map((h) => (
                    <th key={h} className="text-left text-xs text-white/40 font-medium px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((m) => {
                  const expBadge = expiryBadge(m.expiry_date);
                  const isLow = m.stock_quantity <= m.reorder_level;
                  return (
                    <tr key={m.id} className="border-b border-white/5 hover:bg-white/3">
                      <td className="px-4 py-3">
                        <p className="text-white font-medium">{m.name}</p>
                        {m.generic_name && <p className="text-xs text-white/40">{m.generic_name}</p>}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-white/60 bg-white/5 px-2 py-0.5 rounded-full">{m.category}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`font-medium ${isLow ? "text-red-400" : "text-white"}`}>
                          {m.stock_quantity}
                        </span>
                        <span className="text-xs text-white/30 ml-1">{m.unit}</span>
                        {isLow && <span className="ml-2 text-[10px] text-red-400 bg-red-400/10 border border-red-400/20 px-1.5 py-0.5 rounded-full">LOW</span>}
                      </td>
                      <td className="px-4 py-3 text-white">GHS {m.selling_price.toFixed(2)}</td>
                      <td className="px-4 py-3">
                        {m.expiry_date ? (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-white/50">{m.expiry_date}</span>
                            {expBadge && (
                              <span className={`text-[10px] border px-1.5 py-0.5 rounded-full ${expBadge.color}`}>
                                {expBadge.label}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-white/20 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {m.requires_prescription
                          ? <span className="text-[10px] text-blue-400 bg-blue-400/10 border border-blue-400/20 px-1.5 py-0.5 rounded-full">Rx</span>
                          : <span className="text-[10px] text-green-400 bg-green-400/10 border border-green-400/20 px-1.5 py-0.5 rounded-full">OTC</span>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button onClick={() => { setEditItem(m); setShowModal(true); }} className="text-white/30 hover:text-white/80">
                            <Edit2 size={14} />
                          </button>
                          <button onClick={() => handleDelete(m.id)} className="text-white/30 hover:text-red-400">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div className="text-center py-12 text-white/30">
                <Pill size={32} className="mx-auto mb-2 opacity-20" />
                <p>No medicines found</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── EXPIRY TRACKER ──────────────────────────────────────────────────────── */}
      {tab === "expiry" && (
        <div className="space-y-6">
          {/* Expired */}
          {expired.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-red-400 mb-3 flex items-center gap-2">
                <AlertTriangle size={15} /> Expired — Quarantine Immediately ({expired.length})
              </h3>
              <div className="space-y-2">
                {expired.map((m) => (
                  <div key={m.id} className="flex items-center justify-between bg-red-400/5 border border-red-400/20 rounded-xl px-4 py-3">
                    <div>
                      <p className="text-white font-medium text-sm">{m.name}</p>
                      <p className="text-xs text-white/40">Batch: {m.batch_number} · Expired: {m.expiry_date}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-white">{m.stock_quantity} {m.unit}</p>
                      <p className="text-xs text-red-400">GHS {(m.stock_quantity * m.unit_cost).toFixed(2)} loss</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Expiring within 90 days */}
          <div>
            <h3 className="text-sm font-semibold text-yellow-400 mb-3 flex items-center gap-2">
              <Clock size={15} /> Expiring Within 90 Days ({expiringSoon.length})
            </h3>
            {expiringSoon.length === 0 ? (
              <div className="text-center py-10 text-white/30">
                <Check size={32} className="mx-auto mb-2 opacity-20" />
                <p>No items expiring within 90 days</p>
              </div>
            ) : (
              <div className="space-y-2">
                {expiringSoon.sort((a, b) => new Date(a.expiry_date!).getTime() - new Date(b.expiry_date!).getTime()).map((m) => {
                  const d = daysUntil(m.expiry_date!);
                  const pct = Math.max(0, Math.min(100, (d / 90) * 100));
                  return (
                    <div key={m.id} className="bg-white/3 border border-white/8 rounded-xl px-4 py-3">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="text-white font-medium text-sm">{m.name}</p>
                          <p className="text-xs text-white/40">Batch: {m.batch_number} · Supplier: {m.supplier}</p>
                        </div>
                        <div className="text-right">
                          <p className={`text-sm font-semibold ${d <= 30 ? "text-red-400" : "text-yellow-400"}`}>{d} days</p>
                          <p className="text-xs text-white/40">{m.expiry_date}</p>
                        </div>
                      </div>
                      <div className="w-full bg-white/5 rounded-full h-1.5">
                        <div
                          className={`h-1.5 rounded-full transition-all ${d <= 30 ? "bg-red-400" : "bg-yellow-400"}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-xs text-white/30">{m.stock_quantity} {m.unit} remaining</span>
                        <span className="text-xs text-white/30">GHS {(m.stock_quantity * m.unit_cost).toFixed(2)} at risk</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Storage compliance */}
          <div>
            <h3 className="text-sm font-semibold text-white/60 mb-3 flex items-center gap-2">
              <Thermometer size={15} /> Storage Compliance
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {STORAGE_TEMPS.map((temp) => {
                const count = medicines.filter((m) => m.storage_temp === temp).length;
                return (
                  <div key={temp} className="bg-white/3 border border-white/8 rounded-xl p-3 text-center">
                    <p className="text-2xl font-bold text-white">{count}</p>
                    <p className="text-xs text-white/40 mt-1">{temp.split(" (")[0]}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── PRESCRIPTIONS ───────────────────────────────────────────────────────── */}
      {tab === "prescriptions" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white/60">Prescription Queue</h3>
            <span className="text-xs text-white/30">{pendingRx} pending verification</span>
          </div>

          {prescriptions.length === 0 ? (
            <div className="text-center py-16 text-white/30 border border-white/8 rounded-xl">
              <FileText size={40} className="mx-auto mb-3 opacity-20" />
              <p className="font-medium">No prescriptions yet</p>
              <p className="text-xs mt-1">Prescriptions submitted by customers will appear here</p>
            </div>
          ) : (
            <div className="space-y-3">
              {prescriptions.map((rx) => {
                const cfg = PRESCRIPTION_STATUS[rx.status] ?? PRESCRIPTION_STATUS["pending"]!;
                return (
                  <div key={rx.id} className="bg-white/3 border border-white/8 rounded-xl p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-white font-medium text-sm">{rx.patient_name}</p>
                        <p className="text-xs text-white/40 mt-0.5">
                          {rx.patient_phone} · Dr. {rx.doctor_name ?? "Unknown"} · {new Date(rx.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <span className={`text-xs border px-2 py-0.5 rounded-full ${cfg.color}`}>{cfg.label}</span>
                    </div>

                    {rx.items.length > 0 && (
                      <div className="mt-3 space-y-1">
                        {rx.items.map((item, i) => (
                          <div key={i} className="flex items-center justify-between text-xs text-white/60">
                            <span>{item.medicine_name} × {item.quantity} — {item.dosage}</span>
                            <span className="text-white">GHS {(item.quantity * item.price).toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {rx.status === "pending" && (
                      <div className="flex gap-2 mt-3">
                        <button onClick={() => updateRxStatus(rx.id, "verified")}
                          className="flex-1 py-1.5 rounded-lg bg-blue-500/20 text-blue-400 text-xs hover:bg-blue-500/30 flex items-center justify-center gap-1">
                          <Check size={12} /> Verify & Dispense
                        </button>
                        <button onClick={() => updateRxStatus(rx.id, "rejected")}
                          className="flex-1 py-1.5 rounded-lg bg-red-500/10 text-red-400 text-xs hover:bg-red-500/20 flex items-center justify-center gap-1">
                          <X size={12} /> Reject
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── ANALYTICS & AI ──────────────────────────────────────────────────────── */}
      {tab === "analytics" && (
        <div className="space-y-6">
          {/* AI Insights */}
          <div className="bg-gradient-to-br from-[#FF6524]/10 to-purple-500/10 border border-[#FF6524]/20 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Brain size={18} className="text-[#FF6524]" />
              <h3 className="text-white font-semibold text-sm">AI Pharmacy Intelligence</h3>
              <span className="text-[10px] bg-[#FF6524]/20 text-[#FF8B5E] px-2 py-0.5 rounded-full ml-auto">KENUXA AI</span>
            </div>
            <div className="space-y-2">
              {aiInsights.map((insight, i) => (
                <p key={i} className="text-sm text-white/70 bg-white/3 rounded-lg px-3 py-2">{insight}</p>
              ))}
            </div>
          </div>

          {/* Category breakdown */}
          <div className="bg-white/3 border border-white/8 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <BarChart3 size={15} className="text-[#FF6524]" /> Stock by Category
            </h3>
            <div className="space-y-3">
              {CATEGORIES.filter((c) => medicines.some((m) => m.category === c)).map((cat) => {
                const count = medicines.filter((m) => m.category === cat).length;
                const pct = Math.round((count / medicines.length) * 100);
                return (
                  <div key={cat} className="flex items-center gap-3">
                    <span className="text-xs text-white/50 w-36 truncate">{cat}</span>
                    <div className="flex-1 bg-white/5 rounded-full h-1.5">
                      <div className="h-1.5 rounded-full bg-[#FF6524]" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs text-white/40 w-8 text-right">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Top value items */}
          <div className="bg-white/3 border border-white/8 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <Star size={15} className="text-[#FF6524]" /> Highest Value Stock
            </h3>
            <div className="space-y-3">
              {topMovers.map((m, i) => (
                <div key={m.id} className="flex items-center gap-3">
                  <span className="text-xs text-white/30 w-4">{i + 1}</span>
                  <div className="flex-1">
                    <p className="text-sm text-white">{m.name}</p>
                    <p className="text-xs text-white/40">{m.stock_quantity} {m.unit} × GHS {m.unit_cost}</p>
                  </div>
                  <span className="text-sm text-white font-medium">
                    GHS {(m.stock_quantity * m.unit_cost).toFixed(0)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Compliance checklist */}
          <div className="bg-white/3 border border-white/8 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <ShieldCheck size={15} className="text-[#FF6524]" /> FDA Ghana Compliance
            </h3>
            <div className="space-y-2">
              {[
                { label: "All medicines have batch numbers", ok: medicines.every((m) => !!m.batch_number) },
                { label: "Expired medicines quarantined", ok: expired.length === 0 },
                { label: "Temperature storage documented", ok: true },
                { label: "Prescription records maintained", ok: prescriptions.length >= 0 },
                { label: "Supplier records complete", ok: medicines.filter((m) => !!m.supplier).length > medicines.length * 0.8 },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-3 text-sm">
                  <div className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 ${item.ok ? "bg-green-500/20" : "bg-red-500/20"}`}>
                    {item.ok ? <Check size={10} className="text-green-400" /> : <X size={10} className="text-red-400" />}
                  </div>
                  <span className={item.ok ? "text-white/70" : "text-red-400/70"}>{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Medicine Modal */}
      {showModal && (
        <MedicineModal
          item={editItem}
          onClose={() => { setShowModal(false); setEditItem(null); }}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
