"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/hooks/use-auth";
import {
  Sprout, Plus, Search, TrendingUp, TrendingDown, Cloud, Droplets,
  Sun, Calendar, Package, AlertTriangle, Brain, BarChart3, X, Check,
  Edit2, Trash2, ShoppingBag, Truck, Leaf, Thermometer, Wind,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Crop {
  id: string;
  business_id: string;
  name: string;
  variety: string | null;
  field_name: string;
  area_acres: number;
  planting_date: string;
  expected_harvest: string;
  status: string;
  estimated_yield_kg: number;
  actual_yield_kg: number | null;
  selling_price_per_kg: number;
  input_cost: number;
  notes: string | null;
  created_at: string;
}

interface Produce {
  id: string;
  business_id: string;
  crop_name: string;
  quantity_kg: number;
  available_kg: number;
  price_per_kg: number;
  harvest_date: string;
  location: string;
  grade: string;
  is_listed: boolean;
  created_at: string;
}

type Tab = "fields" | "market" | "inputs" | "analytics";

const CROP_STATUS: Record<string, { label: string; color: string; stage: number }> = {
  land_prep:   { label: "Land Prep",    color: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20",   stage: 1 },
  planted:     { label: "Planted",      color: "text-blue-400 bg-blue-400/10 border-blue-400/20",         stage: 2 },
  growing:     { label: "Growing",      color: "text-green-400 bg-green-400/10 border-green-400/20",      stage: 3 },
  ready:       { label: "Ready",        color: "text-orange-400 bg-orange-400/10 border-orange-400/20",   stage: 4 },
  harvested:   { label: "Harvested",    color: "text-purple-400 bg-purple-400/10 border-purple-400/20",   stage: 5 },
};

const PRODUCE_GRADES = ["Grade A (Premium)", "Grade B (Standard)", "Grade C (Processing)"];


// Weather (mock)
const WEATHER = { temp: 32, humidity: 71, condition: "Partly Cloudy", rain_chance: 40, wind: 12 };

// ─── CropModal ────────────────────────────────────────────────────────────────
function CropModal({ item, onClose, onSave }: { item: Partial<Crop> | null; onClose: () => void; onSave: (d: Partial<Crop>) => void }) {
  const [form, setForm] = useState<Partial<Crop>>(item ?? {
    name: "", variety: "", field_name: "", area_acres: 1,
    planting_date: new Date().toISOString().split("T")[0]!,
    expected_harvest: "", status: "land_prep",
    estimated_yield_kg: 0, selling_price_per_kg: 0, input_cost: 0, notes: "",
  });
  const set = (k: keyof Crop, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#0d0f1a] border border-white/10 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-white/8">
          <h2 className="text-white font-semibold">{item?.id ? "Edit Crop" : "Add Crop"}</h2>
          <button onClick={onClose} className="text-white/40 hover:text-white/80"><X size={18} /></button>
        </div>
        <div className="p-5 grid grid-cols-2 gap-4">
          <div><label className="text-xs text-white/50 mb-1 block">Crop Name *</label>
            <input value={form.name ?? ""} onChange={(e) => set("name", e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#FF6524]/50" /></div>
          <div><label className="text-xs text-white/50 mb-1 block">Variety</label>
            <input value={form.variety ?? ""} onChange={(e) => set("variety", e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#FF6524]/50" /></div>
          <div><label className="text-xs text-white/50 mb-1 block">Field Name</label>
            <input value={form.field_name ?? ""} onChange={(e) => set("field_name", e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#FF6524]/50" /></div>
          <div><label className="text-xs text-white/50 mb-1 block">Area (Acres)</label>
            <input type="number" min={0.1} step={0.1} value={form.area_acres ?? 1} onChange={(e) => set("area_acres", +e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#FF6524]/50" /></div>
          <div><label className="text-xs text-white/50 mb-1 block">Planting Date</label>
            <input type="date" value={form.planting_date ?? ""} onChange={(e) => set("planting_date", e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#FF6524]/50" /></div>
          <div><label className="text-xs text-white/50 mb-1 block">Expected Harvest</label>
            <input type="date" value={form.expected_harvest ?? ""} onChange={(e) => set("expected_harvest", e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#FF6524]/50" /></div>
          <div><label className="text-xs text-white/50 mb-1 block">Status</label>
            <select value={form.status ?? "land_prep"} onChange={(e) => set("status", e.target.value)}
              className="w-full bg-[#0d0f1a] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#FF6524]/50">
              {Object.keys(CROP_STATUS).map((k) => <option key={k} value={k}>{CROP_STATUS[k]!.label}</option>)}
            </select></div>
          <div><label className="text-xs text-white/50 mb-1 block">Est. Yield (kg)</label>
            <input type="number" min={0} value={form.estimated_yield_kg ?? 0} onChange={(e) => set("estimated_yield_kg", +e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#FF6524]/50" /></div>
          <div><label className="text-xs text-white/50 mb-1 block">Price/kg (GHS)</label>
            <input type="number" min={0} step={0.01} value={form.selling_price_per_kg ?? 0} onChange={(e) => set("selling_price_per_kg", +e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#FF6524]/50" /></div>
          <div><label className="text-xs text-white/50 mb-1 block">Input Cost (GHS)</label>
            <input type="number" min={0} value={form.input_cost ?? 0} onChange={(e) => set("input_cost", +e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#FF6524]/50" /></div>
          <div className="col-span-2"><label className="text-xs text-white/50 mb-1 block">Notes</label>
            <textarea value={form.notes ?? ""} onChange={(e) => set("notes", e.target.value)} rows={2}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#FF6524]/50 resize-none" /></div>
        </div>
        <div className="flex gap-3 p-5 border-t border-white/8">
          <button onClick={onClose} className="flex-1 py-2 rounded-lg border border-white/10 text-white/60 text-sm">Cancel</button>
          <button onClick={() => onSave(form)} className="flex-1 py-2 rounded-lg bg-[#FF6524] text-white text-sm font-medium hover:bg-[#e55a1f]">
            {item?.id ? "Update" : "Add Crop"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function AgriculturePage() {
  const supabase = createClient();
  const { profile } = useAuth();

  const [tab, setTab] = useState<Tab>("fields");
  const [crops, setCrops] = useState<Crop[]>([]);
  const [produce, setProduce] = useState<Produce[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCropModal, setShowCropModal] = useState(false);
  const [editCrop, setEditCrop] = useState<Crop | null>(null);

  const businessId = profile?.business_id;

  const load = useCallback(async () => {
    if (!businessId) return;
    setLoading(true);

    const [cropRes, proRes] = await Promise.all([
      supabase.from("farm_crops").select("*").eq("business_id", businessId).order("created_at", { ascending: false }),
      supabase.from("farm_produce").select("*").eq("business_id", businessId).order("harvest_date", { ascending: false }),
    ]);

    const cropData = (cropRes.data ?? []) as Crop[];
    const proData  = (proRes.data  ?? []) as Produce[];

    setCrops(cropData);
    setProduce(proData);
    setLoading(false);
  }, [businessId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

  const handleSaveCrop = async (data: Partial<Crop>) => {
    if (!businessId || !data.name) return;
    if (editCrop?.id) {
      await supabase.from("farm_crops").update(data).eq("id", editCrop.id);
    } else {
      await supabase.from("farm_crops").insert({ ...data, business_id: businessId });
    }
    setShowCropModal(false);
    setEditCrop(null);
    load();
  };

  const handleDeleteCrop = async (id: string) => {
    await supabase.from("farm_crops").delete().eq("id", id);
    load();
  };

  const toggleListing = async (id: string, listed: boolean) => {
    await supabase.from("farm_produce").update({ is_listed: listed }).eq("id", id);
    load();
  };

  // Derived
  const totalAcres    = crops.reduce((s, c) => s + c.area_acres, 0);
  const estRevenue    = crops.reduce((s, c) => s + c.estimated_yield_kg * c.selling_price_per_kg, 0);
  const totalCost     = crops.reduce((s, c) => s + c.input_cost, 0);
  const readyToHarvest = crops.filter((c) => c.status === "ready").length;
  const listedProduce = produce.filter((p) => p.is_listed);

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: "fields",    label: "My Fields",         count: crops.length },
    { key: "market",    label: "Produce Market",     count: listedProduce.length },
    { key: "inputs",    label: "Inputs & Forecast" },
    { key: "analytics", label: "Analytics & AI" },
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
            <Sprout className="text-[#FF6524]" size={24} />
            Agriculture OS
          </h1>
          <p className="text-white/40 text-sm mt-0.5">Farm management, produce marketplace & yield intelligence</p>
        </div>
        <button onClick={() => { setEditCrop(null); setShowCropModal(true); }}
          className="flex items-center gap-2 bg-[#FF6524] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#e55a1f]">
          <Plus size={16} /> Add Crop
        </button>
      </div>

      {/* Weather strip */}
      <div className="bg-gradient-to-r from-blue-500/10 to-green-500/10 border border-blue-500/20 rounded-xl px-4 py-3 flex items-center gap-6">
        <div className="flex items-center gap-2">
          <Sun size={18} className="text-yellow-400" />
          <span className="text-white font-medium">{WEATHER.temp}°C</span>
          <span className="text-white/40 text-sm">{WEATHER.condition}</span>
        </div>
        <div className="flex items-center gap-1.5 text-sm text-white/50">
          <Droplets size={14} className="text-blue-400" /> {WEATHER.humidity}% humidity
        </div>
        <div className="flex items-center gap-1.5 text-sm text-white/50">
          <Cloud size={14} className="text-white/40" /> {WEATHER.rain_chance}% rain
        </div>
        <div className="flex items-center gap-1.5 text-sm text-white/50">
          <Wind size={14} className="text-white/40" /> {WEATHER.wind} km/h
        </div>
        <span className="ml-auto text-xs text-white/30">Live weather · Accra, GH</span>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Farmland", value: `${totalAcres} acres`, color: "text-green-400" },
          { label: "Ready to Harvest", value: readyToHarvest, color: "text-orange-400" },
          { label: "Est. Revenue", value: `GHS ${Math.round(estRevenue).toLocaleString()}`, color: "text-blue-400" },
          { label: "Input Costs", value: `GHS ${totalCost.toLocaleString()}`, color: "text-yellow-400" },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-white/3 border border-white/8 rounded-xl p-4">
            <p className="text-xs text-white/40 mb-1">{kpi.label}</p>
            <p className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white/3 border border-white/8 rounded-xl p-1 w-fit flex-wrap">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${
              tab === t.key ? "bg-[#FF6524] text-white" : "text-white/50 hover:text-white"
            }`}>
            {t.label}
            {t.count !== undefined && t.count > 0 && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${tab === t.key ? "bg-white/20 text-white" : "bg-white/10 text-white/60"}`}>{t.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── FIELDS ───────────────────────────────────────────────────────────────── */}
      {tab === "fields" && (
        <div className="space-y-3">
          {crops.map((crop) => {
            const s = CROP_STATUS[crop.status] ?? CROP_STATUS["planted"]!;
            const roi = crop.input_cost > 0
              ? (((crop.estimated_yield_kg * crop.selling_price_per_kg) - crop.input_cost) / crop.input_cost * 100).toFixed(0)
              : null;
            const daysToHarvest = Math.ceil((new Date(crop.expected_harvest).getTime() - Date.now()) / 86400000);
            return (
              <div key={crop.id} className="bg-white/3 border border-white/8 rounded-xl p-4 hover:border-white/15 transition-all">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <Leaf size={16} className="text-green-400" />
                      <p className="text-white font-medium">{crop.name}</p>
                      {crop.variety && <span className="text-xs text-white/40">({crop.variety})</span>}
                      <span className={`text-[10px] border px-1.5 py-0.5 rounded-full ${s.color}`}>{s.label}</span>
                    </div>
                    <p className="text-xs text-white/40 mt-1">{crop.field_name} · {crop.area_acres} acres</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => { setEditCrop(crop); setShowCropModal(true); }} className="text-white/30 hover:text-white/80"><Edit2 size={14} /></button>
                    <button onClick={() => handleDeleteCrop(crop.id)} className="text-white/30 hover:text-red-400"><Trash2 size={14} /></button>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mt-3">
                  <div className="flex justify-between text-xs text-white/40 mb-1">
                    <span>Growth Stage</span>
                    <span>{daysToHarvest > 0 ? `${daysToHarvest}d to harvest` : "Harvest time!"}</span>
                  </div>
                  <div className="flex gap-1">
                    {Object.entries(CROP_STATUS).map(([k, v]) => (
                      <div key={k} className={`flex-1 h-1.5 rounded-full transition-all ${v.stage <= s.stage ? "bg-green-400" : "bg-white/10"}`} />
                    ))}
                  </div>
                  <div className="flex justify-between text-[10px] text-white/20 mt-1">
                    {Object.values(CROP_STATUS).map((v) => <span key={v.label}>{v.label}</span>)}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 mt-3 text-center">
                  <div>
                    <p className="text-xs text-white/40">Est. Yield</p>
                    <p className="text-sm text-white font-medium">{crop.estimated_yield_kg.toLocaleString()} kg</p>
                  </div>
                  <div>
                    <p className="text-xs text-white/40">Est. Revenue</p>
                    <p className="text-sm text-green-400 font-medium">GHS {(crop.estimated_yield_kg * crop.selling_price_per_kg).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-white/40">Expected ROI</p>
                    <p className={`text-sm font-medium ${roi && +roi > 0 ? "text-green-400" : "text-red-400"}`}>
                      {roi !== null ? `${roi}%` : "—"}
                    </p>
                  </div>
                </div>

                {crop.notes && <p className="text-xs text-white/30 mt-2 italic">"{crop.notes}"</p>}
              </div>
            );
          })}
          {crops.length === 0 && (
            <div className="text-center py-16 text-white/30 border border-white/8 rounded-xl">
              <Sprout size={40} className="mx-auto mb-3 opacity-20" />
              <p>No crops tracked yet</p>
            </div>
          )}
        </div>
      )}

      {/* ── PRODUCE MARKET ───────────────────────────────────────────────────────── */}
      {tab === "market" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white/60">Your Produce Listings</h3>
            <span className="text-xs text-white/30">{listedProduce.length} active listings</span>
          </div>

          {produce.length === 0 ? (
            <div className="text-center py-16 text-white/30 border border-white/8 rounded-xl">
              <ShoppingBag size={40} className="mx-auto mb-3 opacity-20" />
              <p>No produce listed yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {produce.map((p) => (
                <div key={p.id} className={`bg-white/3 border rounded-xl p-4 transition-all ${p.is_listed ? "border-green-400/20" : "border-white/8"}`}>
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="text-white font-medium">{p.crop_name}</p>
                      <p className="text-xs text-white/40">{p.grade} · {p.location}</p>
                    </div>
                    <button
                      onClick={() => toggleListing(p.id, !p.is_listed)}
                      className={`text-[10px] border px-2 py-1 rounded-full transition-all ${p.is_listed ? "text-green-400 bg-green-400/10 border-green-400/20 hover:bg-red-400/10 hover:text-red-400 hover:border-red-400/20" : "text-white/40 bg-white/5 border-white/10 hover:bg-green-400/10 hover:text-green-400 hover:border-green-400/20"}`}>
                      {p.is_listed ? "Listed" : "Unlisted"}
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center mt-3">
                    <div><p className="text-xs text-white/40">Available</p><p className="text-sm text-white font-medium">{p.available_kg} kg</p></div>
                    <div><p className="text-xs text-white/40">Price/kg</p><p className="text-sm text-[#FF6524] font-medium">GHS {p.price_per_kg}</p></div>
                    <div><p className="text-xs text-white/40">Total Value</p><p className="text-sm text-white font-medium">GHS {(p.available_kg * p.price_per_kg).toFixed(0)}</p></div>
                  </div>
                  <div className="flex items-center gap-2 mt-3 text-xs text-white/30">
                    <Calendar size={12} /> Harvested: {p.harvest_date}
                    <Truck size={12} className="ml-2" /> Ready for pickup
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Market prices (mock) */}
          <div className="bg-white/3 border border-white/8 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <TrendingUp size={15} className="text-green-400" /> Ghana Market Prices (Today)
            </h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {[
                { crop: "Maize", price: 2.40, change: +0.10 },
                { crop: "Tomato", price: 4.20, change: -0.30 },
                { crop: "Cassava", price: 0.85, change: +0.05 },
                { crop: "Yam", price: 3.50, change: +0.20 },
                { crop: "Pepper", price: 13.00, change: +1.00 },
                { crop: "Plantain", price: 1.80, change: -0.10 },
              ].map((m) => (
                <div key={m.crop} className="flex items-center justify-between bg-white/3 rounded-lg px-3 py-2">
                  <span className="text-white/70">{m.crop}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-white font-medium">GHS {m.price}/kg</span>
                    <span className={`text-xs flex items-center gap-0.5 ${m.change > 0 ? "text-green-400" : "text-red-400"}`}>
                      {m.change > 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                      {m.change > 0 ? "+" : ""}{m.change}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── INPUTS & FORECAST ─────────────────────────────────────────────────────── */}
      {tab === "inputs" && (
        <div className="space-y-6">
          {/* Harvest calendar */}
          <div className="bg-white/3 border border-white/8 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <Calendar size={15} className="text-[#FF6524]" /> Harvest Calendar
            </h3>
            <div className="space-y-2">
              {[...crops].sort((a, b) => new Date(a.expected_harvest).getTime() - new Date(b.expected_harvest).getTime()).map((c) => {
                const days = Math.ceil((new Date(c.expected_harvest).getTime() - Date.now()) / 86400000);
                const isReady = days <= 0;
                const isSoon = days > 0 && days <= 14;
                return (
                  <div key={c.id} className={`flex items-center justify-between px-3 py-2.5 rounded-lg border ${isReady ? "border-orange-400/30 bg-orange-400/5" : isSoon ? "border-yellow-400/20 bg-yellow-400/5" : "border-white/8"}`}>
                    <div className="flex items-center gap-3">
                      <Leaf size={14} className={isReady ? "text-orange-400" : isSoon ? "text-yellow-400" : "text-green-400"} />
                      <div>
                        <p className="text-sm text-white">{c.name} {c.variety ? `(${c.variety})` : ""}</p>
                        <p className="text-xs text-white/40">{c.field_name} · {c.area_acres} ac</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-white">{c.expected_harvest}</p>
                      <p className={`text-xs ${isReady ? "text-orange-400" : isSoon ? "text-yellow-400" : "text-white/40"}`}>
                        {isReady ? "🌾 Harvest now!" : isSoon ? `${days} days` : `${days} days`}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Input needs */}
          <div className="bg-white/3 border border-white/8 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <Package size={15} className="text-[#FF6524]" /> Input Requirements (Next 30 Days)
            </h3>
            <div className="space-y-3 text-sm">
              {[
                { item: "NPK Fertilizer (15-15-15)", qty: "200 kg", cost: "GHS 380", for: "Maize, Cassava" },
                { item: "Pesticide (Lambda-Cyhalothrin)", qty: "5 L", cost: "GHS 120", for: "Tomato, Pepper" },
                { item: "Irrigation Water", qty: "12,000 L", cost: "GHS 60", for: "Pepper, Tomato" },
                { item: "Herbicide (Glyphosate)", qty: "10 L", cost: "GHS 80", for: "All fields" },
              ].map((inp) => (
                <div key={inp.item} className="flex items-center justify-between bg-white/3 rounded-lg px-3 py-2">
                  <div>
                    <p className="text-white/80">{inp.item}</p>
                    <p className="text-xs text-white/40">For: {inp.for}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-white">{inp.qty}</p>
                    <p className="text-xs text-[#FF6524]">{inp.cost}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── ANALYTICS ────────────────────────────────────────────────────────────── */}
      {tab === "analytics" && (
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-green-500/10 to-[#FF6524]/10 border border-green-500/20 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Brain size={18} className="text-[#FF6524]" />
              <h3 className="text-white font-semibold text-sm">AI Farm Intelligence</h3>
              <span className="text-[10px] bg-[#FF6524]/20 text-[#FF8B5E] px-2 py-0.5 rounded-full ml-auto">KENUXA AI</span>
            </div>
            <div className="space-y-2 text-sm text-white/70">
              {readyToHarvest > 0 && (
                <p className="bg-white/3 rounded-lg px-3 py-2">🌾 {readyToHarvest} crop{readyToHarvest > 1 ? "s" : ""} ready for harvest! Delay can reduce quality and market price. Harvest within 7 days.</p>
              )}
              <p className="bg-white/3 rounded-lg px-3 py-2">💰 Estimated ROI for this season: {totalCost > 0 ? `${Math.round(((estRevenue - totalCost) / totalCost) * 100)}%` : "N/A"}. Focus on high-value crops like pepper to improve margins.</p>
              <p className="bg-white/3 rounded-lg px-3 py-2">🌦️ {WEATHER.rain_chance}% rain probability today. Consider delaying fertilizer application to avoid runoff.</p>
              <p className="bg-white/3 rounded-lg px-3 py-2">📊 Tomato prices rose 5% on the Accra market this week. Consider listing your tomato harvest now for maximum returns.</p>
            </div>
          </div>

          <div className="bg-white/3 border border-white/8 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-white mb-4">Crop Revenue Breakdown</h3>
            {crops.map((c) => {
              const rev = c.estimated_yield_kg * c.selling_price_per_kg;
              const pct = estRevenue > 0 ? Math.round((rev / estRevenue) * 100) : 0;
              return (
                <div key={c.id} className="flex items-center gap-3 mb-3">
                  <Leaf size={14} className="text-green-400 flex-shrink-0" />
                  <span className="text-xs text-white/50 w-28 truncate">{c.name}</span>
                  <div className="flex-1 bg-white/5 rounded-full h-1.5">
                    <div className="h-1.5 rounded-full bg-green-400" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-xs text-white/40 w-20 text-right">GHS {rev.toLocaleString()}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {showCropModal && (
        <CropModal item={editCrop} onClose={() => { setShowCropModal(false); setEditCrop(null); }} onSave={handleSaveCrop} />
      )}
    </div>
  );
}
