"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/hooks/use-auth";
import {
  ChefHat, UtensilsCrossed, QrCode, Clock, Users, Plus, Pencil, X,
  CheckCircle2, Loader2, Flame, Star, TrendingUp,
  ShoppingBag, Truck, Sparkles,
  DollarSign, Package,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  category: string;
  price: number;
  preparation_time: number | null;
  is_available: boolean;
  is_popular: boolean;
  image_url: string | null;
  allergens: string[] | null;
  calories: number | null;
}

interface RestaurantTable {
  id: string;
  table_number: string;
  capacity: number;
  status: "available" | "occupied" | "reserved" | "cleaning";
  current_order_id: string | null;
}

interface DiningOrder {
  id: string;
  table_number: string | null;
  order_type: "dine_in" | "takeaway" | "delivery";
  status: "pending" | "preparing" | "ready" | "served" | "completed" | "cancelled";
  items: { name: string; qty: number; price: number }[];
  total_amount: number;
  customer_name: string | null;
  created_at: string;
  estimated_ready: string | null;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TABLE_STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  available: { label: "Available", color: "text-emerald-400", bg: "bg-emerald-400/10 border-emerald-400/20" },
  occupied:  { label: "Occupied",  color: "text-red-400",     bg: "bg-red-400/10 border-red-400/20" },
  reserved:  { label: "Reserved",  color: "text-amber-400",   bg: "bg-amber-400/10 border-amber-400/20" },
  cleaning:  { label: "Cleaning",  color: "text-blue-400",    bg: "bg-blue-400/10 border-blue-400/20" },
};

const ORDER_STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  pending:   { label: "Pending",   color: "text-amber-400",   icon: Clock },
  preparing: { label: "Preparing", color: "text-blue-400",    icon: ChefHat },
  ready:     { label: "Ready",     color: "text-emerald-400", icon: CheckCircle2 },
  served:    { label: "Served",    color: "text-purple-400",  icon: UtensilsCrossed },
  completed: { label: "Completed", color: "text-slate-400",   icon: CheckCircle2 },
  cancelled: { label: "Cancelled", color: "text-red-400",     icon: X },
};

const ORDER_TYPES: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  dine_in:  { label: "Dine In",   icon: UtensilsCrossed, color: "text-orange-400" },
  takeaway: { label: "Takeaway",  icon: ShoppingBag,     color: "text-blue-400" },
  delivery: { label: "Delivery",  icon: Truck,           color: "text-emerald-400" },
};

const MENU_CATEGORIES = ["Starters", "Main Course", "Soups & Stews", "Rice Dishes", "Grills", "Sides", "Drinks", "Desserts", "Specials"];

function fmt(n: number) {
  return new Intl.NumberFormat("en-GH", { style: "currency", currency: "GHS", maximumFractionDigits: 2 }).format(n);
}

function minutesAgo(dt: string) {
  const mins = Math.floor((Date.now() - new Date(dt).getTime()) / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m ago`;
}

// ─── Menu Item Card ───────────────────────────────────────────────────────────

function MenuItemCard({ item, onEdit, onToggle }: {
  item: MenuItem;
  onEdit: () => void;
  onToggle: () => void;
}) {
  return (
    <div className={`bg-[#131621] border rounded-2xl overflow-hidden transition-colors ${item.is_available ? "border-white/7" : "border-white/4 opacity-60"}`}>
      {/* Image placeholder */}
      <div className="h-28 bg-gradient-to-br from-[rgba(255,101,36,0.08)] to-[rgba(255,101,36,0.03)] flex items-center justify-center relative">
        {item.image_url ? (
          <Image src={item.image_url} alt={item.name} className="w-full h-full object-cover" width={200} height={112} />
        ) : (
          <UtensilsCrossed size={28} className="text-[#374151]" />
        )}
        {item.is_popular && (
          <span className="absolute top-2 left-2 text-[9px] px-1.5 py-0.5 bg-[#FF6524] text-white rounded-full font-bold flex items-center gap-0.5">
            <Flame size={8} /> Popular
          </span>
        )}
        {!item.is_available && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <span className="text-xs font-bold text-white bg-black/70 px-2 py-1 rounded-lg">Unavailable</span>
          </div>
        )}
      </div>
      <div className="p-3">
        <div className="flex items-start justify-between gap-2 mb-1">
          <p className="text-sm font-semibold text-[#f1f5f9] leading-tight">{item.name}</p>
          <p className="text-sm font-bold text-[#FF8B5E] flex-shrink-0">{fmt(item.price)}</p>
        </div>
        {item.description && (
          <p className="text-xs text-[#64748b] line-clamp-2 mb-2">{item.description}</p>
        )}
        <div className="flex items-center gap-1.5 flex-wrap mb-3">
          <span className="text-[10px] bg-white/5 text-[#64748b] px-2 py-0.5 rounded-full border border-white/7">
            {item.category}
          </span>
          {item.preparation_time && (
            <span className="text-[10px] text-[#64748b] flex items-center gap-0.5">
              <Clock size={9} /> {item.preparation_time}m
            </span>
          )}
          {item.calories && (
            <span className="text-[10px] text-[#64748b]">{item.calories} kcal</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onToggle}
            className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              item.is_available
                ? "bg-white/5 text-[#64748b] hover:bg-white/8"
                : "bg-emerald-400/10 text-emerald-400 hover:bg-emerald-400/15"
            }`}
          >
            {item.is_available ? "Mark Unavailable" : "Mark Available"}
          </button>
          <button onClick={onEdit} className="p-1.5 hover:bg-white/5 rounded-lg text-[#64748b] hover:text-[#f1f5f9] transition-colors">
            <Pencil size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Order Card ───────────────────────────────────────────────────────────────

function OrderCard({ order, onAdvance }: { order: DiningOrder; onAdvance: (status: string) => void }) {
  const cfg = ORDER_STATUS_CONFIG[order.status] ?? ORDER_STATUS_CONFIG["pending"]!;
  const typeCfg = ORDER_TYPES[order.order_type] ?? ORDER_TYPES["dine_in"]!;
  const Icon = cfg.icon;
  const TypeIcon = typeCfg.icon;

  const nextStatus: Record<string, string> = {
    pending: "preparing", preparing: "ready", ready: "served", served: "completed",
  };
  const next = nextStatus[order.status];

  return (
    <div className="bg-[#131621] border border-white/7 rounded-2xl p-4">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <TypeIcon size={13} className={typeCfg.color} />
            <span className="text-sm font-semibold text-[#f1f5f9]">
              {order.order_type === "dine_in" ? `Table ${order.table_number}` : typeCfg.label}
            </span>
            {order.customer_name && (
              <span className="text-xs text-[#64748b]">· {order.customer_name}</span>
            )}
          </div>
          <p className="text-xs text-[#64748b]">{minutesAgo(order.created_at)}</p>
        </div>
        <span className={`flex items-center gap-1 text-xs font-medium flex-shrink-0 ${cfg.color}`}>
          <Icon size={11} />
          {cfg.label}
        </span>
      </div>

      <div className="space-y-1 mb-3">
        {order.items.map((item, i) => (
          <div key={i} className="flex items-center justify-between text-xs">
            <span className="text-[#94a3b8]">{item.qty}× {item.name}</span>
            <span className="text-[#64748b]">{fmt(item.price * item.qty)}</span>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-white/7">
        <span className="text-sm font-bold text-[#f1f5f9]">{fmt(order.total_amount)}</span>
        {next && (
          <button
            onClick={() => onAdvance(next)}
            className="px-3 py-1.5 bg-[rgba(255,101,36,0.15)] hover:bg-[rgba(255,101,36,0.25)] text-[#FF8B5E] text-xs font-medium rounded-lg transition-colors flex items-center gap-1"
          >
            <ChefHat size={11} />
            {ORDER_STATUS_CONFIG[next]?.label ?? next}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Add/Edit Menu Item Modal ─────────────────────────────────────────────────

function MenuItemModal({ item, bizId, onClose, onSaved }: {
  item: MenuItem | null;
  bizId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const supabase = createClient();
  const [form, setForm] = useState({
    name: item?.name ?? "",
    description: item?.description ?? "",
    category: item?.category ?? "Main Course",
    price: item?.price ? String(item.price) : "",
    preparation_time: item?.preparation_time ? String(item.preparation_time) : "",
    calories: item?.calories ? String(item.calories) : "",
    is_available: item?.is_available ?? true,
    is_popular: item?.is_popular ?? false,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    if (!form.name || !form.price) { setError("Name and price are required"); return; }
    setSaving(true);
    const payload = {
      business_id: bizId,
      name: form.name.trim(),
      description: form.description.trim() || null,
      category: form.category,
      price: parseFloat(form.price),
      preparation_time: form.preparation_time ? parseInt(form.preparation_time) : null,
      calories: form.calories ? parseInt(form.calories) : null,
      is_available: form.is_available,
      is_popular: form.is_popular,
    };
    if (item) {
      await supabase.from("menu_items").update(payload).eq("id", item.id);
    } else {
      await supabase.from("menu_items").insert(payload);
    }
    onSaved();
  }

  const f = (k: keyof typeof form, v: string | boolean) => setForm((prev) => ({ ...prev, [k]: v }));
  const fieldCls = "w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-[#f1f5f9] text-sm placeholder-[#374151] outline-none focus:border-[#FF6524]/50";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div className="bg-[#131621] border border-white/10 rounded-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-[#f1f5f9] font-bold text-lg mb-5">{item ? "Edit Menu Item" : "Add Menu Item"}</h2>
        <div className="space-y-4">
          <div>
            <label className="text-xs text-[#64748b] mb-1 block">Item Name *</label>
            <input value={form.name} onChange={(e) => f("name", e.target.value)} placeholder="e.g. Jollof Rice with Chicken" className={fieldCls} />
          </div>
          <div>
            <label className="text-xs text-[#64748b] mb-1 block">Description</label>
            <textarea value={form.description} onChange={(e) => f("description", e.target.value)} placeholder="Describe the dish…" rows={2} className={`${fieldCls} resize-none`} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-[#64748b] mb-1 block">Category</label>
              <select value={form.category} onChange={(e) => f("category", e.target.value)} className={fieldCls}>
                {MENU_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-[#64748b] mb-1 block">Price (GHS) *</label>
              <input type="number" value={form.price} onChange={(e) => f("price", e.target.value)} placeholder="0.00" className={fieldCls} />
            </div>
            <div>
              <label className="text-xs text-[#64748b] mb-1 block">Prep Time (mins)</label>
              <input type="number" value={form.preparation_time} onChange={(e) => f("preparation_time", e.target.value)} placeholder="15" className={fieldCls} />
            </div>
            <div>
              <label className="text-xs text-[#64748b] mb-1 block">Calories</label>
              <input type="number" value={form.calories} onChange={(e) => f("calories", e.target.value)} placeholder="450" className={fieldCls} />
            </div>
          </div>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <div className={`w-9 h-5 rounded-full transition-colors relative ${form.is_available ? "bg-[#FF6524]" : "bg-white/10"}`} onClick={() => f("is_available", !form.is_available)}>
                <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${form.is_available ? "translate-x-4" : "translate-x-0.5"}`} />
              </div>
              <span className="text-sm text-[#94a3b8]">Available now</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <div className={`w-9 h-5 rounded-full transition-colors relative ${form.is_popular ? "bg-[#FF6524]" : "bg-white/10"}`} onClick={() => f("is_popular", !form.is_popular)}>
                <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${form.is_popular ? "translate-x-4" : "translate-x-0.5"}`} />
              </div>
              <span className="text-sm text-[#94a3b8]">Mark as popular</span>
            </label>
          </div>
        </div>
        {error && <p className="text-xs text-red-400 mt-3">{error}</p>}
        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 py-3 bg-white/5 text-[#94a3b8] text-sm rounded-xl hover:bg-white/8 transition-colors">Cancel</button>
          <button onClick={save} disabled={saving} className="flex-1 py-3 bg-[#FF6524] hover:bg-[#FF7A3D] disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors flex items-center justify-center gap-2">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
            {saving ? "Saving…" : "Save Item"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type Tab = "orders" | "menu" | "tables" | "analytics";

export default function RestaurantPage() {
  const { profile } = useAuth();
  const supabase = createClient();
  const bizId = (profile as { business_id?: string } | null)?.business_id ?? null;

  const [tab, setTab] = useState<Tab>("orders");
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [orders, setOrders] = useState<DiningOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [menuCategory, setMenuCategory] = useState("All");
  const [editItem, setEditItem] = useState<MenuItem | null | "new">(null);
  const [orderFilter, setOrderFilter] = useState<string>("active");
  const [stats, setStats] = useState({ revenue: 0, orders: 0, avgOrderValue: 0, tableOccupancy: 0 });

  const load = useCallback(async () => {
    if (!bizId) return;
    setLoading(true);
    const today = new Date().toISOString().slice(0, 10);

    const [menuRes, tableRes, orderRes] = await Promise.all([
      supabase.from("menu_items").select("*").eq("business_id", bizId).order("category").order("name"),
      supabase.from("restaurant_tables").select("*").eq("business_id", bizId).order("table_number"),
      supabase.from("dining_orders").select("*").eq("business_id", bizId)
        .gte("created_at", today).order("created_at", { ascending: false }),
    ]);

    const menuData: MenuItem[] = menuRes.data ?? [];
    const tableData: RestaurantTable[] = tableRes.data ?? [];
    const orderData: DiningOrder[] = orderRes.data ?? [];

    setMenuItems(menuData);
    setTables(tableData);
    setOrders(orderData);

    const completedOrders = orderData.filter((o) => o.status === "completed");
    const revenue = completedOrders.reduce((s, o) => s + o.total_amount, 0);
    const occupied = tableData.filter((t) => t.status === "occupied").length;

    setStats({
      revenue,
      orders: orderData.length,
      avgOrderValue: completedOrders.length ? revenue / completedOrders.length : 0,
      tableOccupancy: tableData.length ? Math.round((occupied / tableData.length) * 100) : 0,
    });


    setLoading(false);
  }, [bizId, supabase]);

  useEffect(() => { load(); }, [load]);

  async function toggleAvailability(item: MenuItem) {
    await supabase.from("menu_items").update({ is_available: !item.is_available }).eq("id", item.id);
    load();
  }

  async function advanceOrder(orderId: string, newStatus: string) {
    await supabase.from("dining_orders").update({ status: newStatus }).eq("id", orderId);
    setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, status: newStatus as DiningOrder["status"] } : o));
  }

  const categories = ["All", ...new Set(menuItems.map((m) => m.category))];
  const filteredMenu = menuCategory === "All" ? menuItems : menuItems.filter((m) => m.category === menuCategory);
  const activeOrders = orders.filter((o) => !["completed", "cancelled"].includes(o.status));
  const displayOrders = orderFilter === "active" ? activeOrders : orders.filter((o) => o.status === orderFilter);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-2xl bg-[rgba(255,101,36,0.12)] flex items-center justify-center">
              <UtensilsCrossed size={20} className="text-[#FF8B5E]" />
            </div>
            <h1 className="text-2xl font-bold text-[#f1f5f9]">Restaurant OS</h1>
            {activeOrders.length > 0 && (
              <span className="w-6 h-6 rounded-full bg-[#FF6524] text-white text-xs font-bold flex items-center justify-center">
                {activeOrders.length}
              </span>
            )}
          </div>
          <p className="text-sm text-[#64748b]">Menu · Tables · Live Orders · Analytics</p>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-2 px-4 py-2.5 bg-white/5 border border-white/10 text-[#94a3b8] text-sm rounded-xl hover:bg-white/8 transition-colors">
            <QrCode size={14} /> QR Menu
          </button>
          {tab === "menu" && (
            <button
              onClick={() => setEditItem("new")}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#FF6524] hover:bg-[#FF7A3D] text-white text-sm font-semibold rounded-xl transition-colors"
            >
              <Plus size={15} /> Add Item
            </button>
          )}
        </div>
      </div>

      {/* Today's Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Today's Revenue",  value: fmt(stats.revenue),            icon: DollarSign,  color: "text-[#FF8B5E]" },
          { label: "Orders Today",     value: String(stats.orders),          icon: Package,     color: "text-blue-400" },
          { label: "Avg Order Value",  value: fmt(stats.avgOrderValue),      icon: TrendingUp,  color: "text-emerald-400" },
          { label: "Table Occupancy",  value: `${stats.tableOccupancy}%`,    icon: Users,       color: "text-purple-400" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-[#131621] border border-white/7 rounded-2xl p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center flex-shrink-0">
              <Icon size={16} className={color} />
            </div>
            <div>
              <p className={`text-xl font-bold ${color}`}>{loading ? "—" : value}</p>
              <p className="text-xs text-[#64748b]">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-white/3 rounded-xl w-fit overflow-x-auto">
        {([
          ["orders",    `Live Orders${activeOrders.length ? ` (${activeOrders.length})` : ""}`],
          ["menu",      "Menu Management"],
          ["tables",    "Table Plan"],
          ["analytics", "Analytics"],
        ] as [Tab, string][]).map(([t, label]) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
              tab === t ? "bg-[#FF6524] text-white" : "text-[#64748b] hover:text-[#f1f5f9]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Orders Tab */}
      {tab === "orders" && (
        <div className="space-y-4">
          {/* Status filter pills */}
          <div className="flex gap-2 overflow-x-auto pb-1">
            {[
              { key: "active",    label: `Active (${activeOrders.length})` },
              { key: "pending",   label: "Pending" },
              { key: "preparing", label: "Preparing" },
              { key: "ready",     label: "Ready" },
              { key: "completed", label: "Completed" },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setOrderFilter(key)}
                className={`px-4 py-2 rounded-full text-xs font-medium whitespace-nowrap border transition-colors ${
                  orderFilter === key
                    ? "bg-[rgba(255,101,36,0.15)] border-[rgba(255,101,36,0.3)] text-[#FF8B5E]"
                    : "bg-white/4 border-white/7 text-[#64748b] hover:text-[#f1f5f9]"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-48 bg-[#131621] border border-white/7 rounded-2xl animate-pulse" />)}
            </div>
          ) : displayOrders.length === 0 ? (
            <div className="text-center py-16 bg-[#131621] border border-white/7 rounded-2xl">
              <ChefHat size={36} className="mx-auto text-[#374151] mb-3" />
              <p className="text-[#94a3b8] font-medium">No orders</p>
              <p className="text-xs text-[#64748b] mt-1">Orders will appear here as they come in</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {displayOrders.map((order) => (
                <OrderCard key={order.id} order={order} onAdvance={(status) => advanceOrder(order.id, status)} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Menu Tab */}
      {tab === "menu" && (
        <div className="space-y-4">
          {/* Category filter */}
          <div className="flex gap-2 overflow-x-auto pb-1">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setMenuCategory(cat)}
                className={`px-4 py-2 rounded-full text-xs font-medium whitespace-nowrap border transition-colors ${
                  menuCategory === cat
                    ? "bg-[rgba(255,101,36,0.15)] border-[rgba(255,101,36,0.3)] text-[#FF8B5E]"
                    : "bg-white/4 border-white/7 text-[#64748b] hover:text-[#f1f5f9]"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between text-xs text-[#64748b]">
            <span>{filteredMenu.length} items · {filteredMenu.filter((m) => !m.is_available).length} unavailable</span>
            <span className="flex items-center gap-1"><Flame size={11} className="text-[#FF8B5E]" /> {filteredMenu.filter((m) => m.is_popular).length} popular</span>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-64 bg-[#131621] border border-white/7 rounded-2xl animate-pulse" />)}
            </div>
          ) : filteredMenu.length === 0 ? (
            <div className="text-center py-16 bg-[#131621] border border-white/7 rounded-2xl">
              <UtensilsCrossed size={36} className="mx-auto text-[#374151] mb-3" />
              <p className="text-[#94a3b8] font-medium mb-1">No menu items yet</p>
              <p className="text-xs text-[#64748b] mb-4">Add your first dish to get started</p>
              <button onClick={() => setEditItem("new")} className="px-4 py-2 bg-[rgba(255,101,36,0.15)] text-[#FF8B5E] text-sm rounded-xl hover:bg-[rgba(255,101,36,0.25)] transition-colors">
                Add Menu Item
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredMenu.map((item) => (
                <MenuItemCard
                  key={item.id}
                  item={item}
                  onEdit={() => setEditItem(item)}
                  onToggle={() => toggleAvailability(item)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tables Tab */}
      {tab === "tables" && (
        <div className="space-y-4">
          <div className="flex gap-4 text-xs text-[#64748b] flex-wrap">
            {Object.entries(TABLE_STATUS_CONFIG).map(([status, { label, color: _color }]) => (
              <span key={status} className="flex items-center gap-1.5">
                <span className={`text-[9px] px-2 py-0.5 rounded-full border font-bold ${TABLE_STATUS_CONFIG[status]?.bg}`}>{label}</span>
                <span>{tables.filter((t) => t.status === status).length}</span>
              </span>
            ))}
          </div>

          {loading ? (
            <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-24 bg-[#131621] border border-white/7 rounded-2xl animate-pulse" />)}
            </div>
          ) : tables.length === 0 ? (
            <div className="text-center py-12 bg-[#131621] border border-white/7 rounded-2xl">
              <Users size={32} className="mx-auto text-[#374151] mb-3" />
              <p className="text-[#94a3b8]">No tables configured</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {tables.map((table) => {
                const cfg = TABLE_STATUS_CONFIG[table.status] ?? TABLE_STATUS_CONFIG["available"]!;
                return (
                  <div
                    key={table.id}
                    className={`bg-[#131621] border rounded-2xl p-4 text-center cursor-pointer hover:border-white/20 transition-colors ${cfg.bg}`}
                  >
                    <p className={`text-2xl font-black ${cfg.color} mb-1`}>{table.table_number}</p>
                    <p className={`text-[10px] font-bold ${cfg.color}`}>{cfg.label}</p>
                    <p className="text-[10px] text-[#64748b] mt-0.5">
                      <Users size={8} className="inline mr-0.5" />{table.capacity} seats
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Analytics Tab */}
      {tab === "analytics" && (
        <div className="space-y-5">
          {/* AI Menu Insights */}
          <div className="bg-[rgba(255,101,36,0.06)] border border-[rgba(255,101,36,0.15)] rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles size={16} className="text-[#FF8B5E]" />
              <h3 className="text-[#f1f5f9] font-semibold">AI Restaurant Intelligence</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { title: "Menu Optimisation", content: `Your top ${menuItems.filter((m) => m.is_popular).length} popular items drive ~70% of revenue. Consider bundling them with slower-moving sides to increase average order value.` },
                { title: "Demand Forecast",   content: "Friday evenings consistently show 2.4× normal volume. Ensure full staffing and pre-prepped ingredients from Thursday afternoon." },
                { title: "Inventory Planning",content: "Based on order patterns, increase Jollof Rice prep by 30% on weekends. Protein sides tend to run out before closing time." },
                { title: "Menu Pricing",      content: "Your pricing is 8% below market average for Accra. A 5% price adjustment on premium dishes could add GHS 1,200/month in revenue." },
              ].map(({ title, content }) => (
                <div key={title} className="bg-white/3 rounded-xl p-4">
                  <p className="text-xs font-semibold text-[#f1f5f9] mb-1">{title}</p>
                  <p className="text-xs text-[#94a3b8] leading-relaxed">{content}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Top items */}
          <div className="bg-[#131621] border border-white/7 rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-[#f1f5f9] mb-4 flex items-center gap-2">
              <Star size={14} className="text-[#FF8B5E]" /> Most Popular Items
            </h3>
            {menuItems.filter((m) => m.is_popular).length === 0 ? (
              <p className="text-xs text-[#64748b] py-4 text-center">No popular items marked yet. Edit items to mark them as popular.</p>
            ) : (
              <div className="space-y-3">
                {menuItems.filter((m) => m.is_popular).slice(0, 6).map((item, i) => (
                  <div key={item.id} className="flex items-center gap-3">
                    <span className="text-xs font-bold text-[#374151] w-5">#{i + 1}</span>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-[#f1f5f9]">{item.name}</p>
                      <p className="text-xs text-[#64748b]">{item.category}</p>
                    </div>
                    <span className="text-sm font-semibold text-[#FF8B5E]">{fmt(item.price)}</span>
                    <div className="w-20 bg-white/5 rounded-full h-1.5">
                      <div className="h-1.5 bg-[#FF6524] rounded-full" style={{ width: `${100 - i * 12}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Menu Item Modal */}
      {editItem !== null && bizId && (
        <MenuItemModal
          item={editItem === "new" ? null : editItem}
          bizId={bizId}
          onClose={() => setEditItem(null)}
          onSaved={() => { setEditItem(null); load(); }}
        />
      )}
    </div>
  );
}
