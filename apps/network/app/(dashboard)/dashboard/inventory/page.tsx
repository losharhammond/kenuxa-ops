"use client";

import { useEffect, useState, useCallback } from "react";
import { Header } from "@/components/layout/header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/ui/stat-card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { formatCurrency } from "@/lib/utils";
import { useAuth } from "@/lib/hooks/use-auth";
import { useRoleGuard } from "@/lib/hooks/use-role-guard";
import { createClient } from "@/lib/supabase/client";
import {
  Search, Download, PlusCircle, Package, DollarSign, AlertTriangle,
  Warehouse, Cpu, Pencil, X, Loader2,
} from "lucide-react";
import Image from "next/image";
import { ImageUpload } from "@/components/ui/image-upload";

interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  category: string | null;
  stock_qty: number;
  low_stock_threshold: number;
  cost_price: number | null;
  selling_price: number;
  is_active: boolean;
  barcode: string | null;
  image_url: string | null;
  created_at: string;
}

interface AddProductForm {
  name: string;
  sku: string;
  category: string;
  selling_price: string;
  cost_price: string;
  stock_qty: string;
  low_stock_threshold: string;
}

const DEFAULT_FORM: AddProductForm = {
  name: "", sku: "", category: "", selling_price: "", cost_price: "",
  stock_qty: "", low_stock_threshold: "10",
};

const CATEGORIES = ["Food", "Beverages", "Medicine", "Household", "Electronics", "Clothing", "Other"];

export default function InventoryPage() {
  useRoleGuard("inventory.view");
  const { profile } = useAuth();
  const supabase = createClient();

  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [stockFilter, setStockFilter] = useState("all");
  const [activeTab, setActiveTab] = useState<"products" | "reorder">("products");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editItem, setEditItem] = useState<InventoryItem | null>(null);
  const [form, setForm] = useState<AddProductForm>(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [editImageUrl, setEditImageUrl] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!profile?.business_id) return;
    setLoading(true);
    const { data } = await supabase
      .from("inventory_items")
      .select("*")
      .eq("business_id", profile.business_id)
      .order("name");
    setItems(data ?? []);
    setLoading(false);
  }, [profile?.business_id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

  const filtered = items.filter((i) => {
    const matchSearch = search === "" || i.name.toLowerCase().includes(search.toLowerCase()) || (i.sku ?? "").toLowerCase().includes(search.toLowerCase());
    const matchCat = categoryFilter === "all" || i.category === categoryFilter;
    const matchStock = stockFilter === "all"
      ? true
      : stockFilter === "low" ? i.stock_qty <= i.low_stock_threshold : i.stock_qty > i.low_stock_threshold;
    return matchSearch && matchCat && matchStock;
  });

  const lowStockItems = items.filter((i) => i.stock_qty <= i.low_stock_threshold);
  const totalValue = items.reduce((s, i) => s + i.selling_price * i.stock_qty, 0);
  const categories = [...new Set(items.map((i) => i.category).filter(Boolean))] as string[];

  async function handleSave() {
    if (!profile?.business_id) return;
    if (!form.name || !form.selling_price || !form.stock_qty) {
      setFormError("Name, selling price, and quantity are required.");
      return;
    }
    setSaving(true);
    setFormError("");

    const payload = {
      business_id: profile.business_id,
      name: form.name.trim(),
      sku: form.sku.trim() || null,
      category: form.category || null,
      selling_price: parseFloat(form.selling_price),
      cost_price: form.cost_price ? parseFloat(form.cost_price) : null,
      stock_qty: parseInt(form.stock_qty, 10),
      low_stock_threshold: parseInt(form.low_stock_threshold, 10) || 10,
      is_active: true,
      image_url: editImageUrl,
    };
    if (editItem) {
      await supabase.from("inventory_items").update(payload).eq("id", editItem.id);
    } else {
      await supabase.from("inventory_items").insert(payload);
    }
    setSaving(false);
    setShowAddModal(false);
    setEditItem(null);
    setForm(DEFAULT_FORM);
    setEditImageUrl(null);
    load();
  }

  function openEdit(item: InventoryItem) {
    setEditItem(item);
    setForm({
      name: item.name,
      sku: item.sku ?? "",
      category: item.category ?? "",
      selling_price: String(item.selling_price),
      cost_price: item.cost_price ? String(item.cost_price) : "",
      stock_qty: String(item.stock_qty),
      low_stock_threshold: String(item.low_stock_threshold),
    });
    setEditImageUrl(item.image_url ?? null);
    setShowAddModal(true);
  }


  async function handleDelete(id: string) {
    if (!confirm("Remove this product from inventory?")) return;
    await supabase.from("inventory_items").delete().eq("id", id);
    load();
  }

  return (
    <div className="animate-fade-in">
      <Header
        title="Inventory"
        subtitle="Track stock, manage products & reorder alerts"
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" size="sm"><Download size={13} /> Export</Button>
            <Button size="sm" onClick={() => { setEditItem(null); setForm(DEFAULT_FORM); setShowAddModal(true); }}>
              <PlusCircle size={13} /> Add Product
            </Button>
          </div>
        }
      />

      <div className="p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Total Products"  value={items.length}      format="number"   color="orange" icon={<Package size={16} />} />
          <StatCard title="Stock Value"     value={totalValue}         format="currency" color="green"  icon={<DollarSign size={16} />} />
          <StatCard title="Low Stock Items" value={lowStockItems.length} format="number" color="red"   icon={<AlertTriangle size={16} />} />
          <StatCard title="Categories"      value={categories.length}  format="number"   color="blue"   icon={<Warehouse size={16} />} />
        </div>

        {/* AI Reorder Alert */}
        {!loading && lowStockItems.length > 0 && (
          <div className="bg-[rgba(251,191,36,0.06)] border border-[rgba(251,191,36,0.2)] rounded-xl p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Cpu size={18} className="text-[#fbbf24] flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-[#fbbf24]">Reorder Alert</p>
                <p className="text-xs text-[#64748b]">
                  {lowStockItems.length} product{lowStockItems.length !== 1 ? "s are" : " is"} at or below minimum stock level.
                </p>
              </div>
            </div>
            <Button size="sm" variant="secondary" onClick={() => setActiveTab("reorder")}>
              View Reorder List
            </Button>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 bg-[#111624] border border-white/7 rounded-xl p-1 w-fit">
          {[
            { key: "products" as const,  label: "Products" },
            { key: "reorder"  as const,  label: `Reorder (${lowStockItems.length})` },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.key ? "bg-[#FF6524] text-white" : "text-[#64748b] hover:text-[#f1f5f9]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Products Tab */}
        {activeTab === "products" && (
          <>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex-1 min-w-48 flex items-center gap-2 bg-[#111624] border border-white/10 rounded-lg px-4 h-10">
                <Search size={13} className="text-[#64748b]" />
                <input
                  className="bg-transparent border-none outline-none flex-1 text-sm placeholder:text-[#374151] text-[#f1f5f9]"
                  placeholder="Search products or SKU..."
                  style={{ padding: 0 }}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <select
                className="bg-[#111624] border border-white/7 rounded-lg text-sm px-3 h-10 text-[#f1f5f9]"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                <option value="all">All Categories</option>
                {categories.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <select
                className="bg-[#111624] border border-white/7 rounded-lg text-sm px-3 h-10 text-[#f1f5f9]"
                value={stockFilter}
                onChange={(e) => setStockFilter(e.target.value)}
              >
                <option value="all">All Stock</option>
                <option value="low">Low Stock</option>
                <option value="ok">In Stock</option>
              </select>
            </div>

            {loading ? (
              <div className="space-y-2">
                {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}
              </div>
            ) : filtered.length === 0 ? (
              <EmptyState
                icon={<Package size={32} className="text-[#374151]" />}
                title="No products found"
                description={search ? "Try a different search term." : "Add your first product to start tracking inventory."}
                action={<Button size="sm" onClick={() => setShowAddModal(true)}><PlusCircle size={13} /> Add Product</Button>}
              />
            ) : (
              <Card>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-white/7 text-xs text-[#64748b] uppercase tracking-wider">
                        <th className="px-4 py-4 text-center font-medium w-14">Img</th>
                        <th className="px-6 py-4 text-left font-medium">Product</th>
                        <th className="px-4 py-4 text-left font-medium">Category</th>
                        <th className="px-4 py-4 text-right font-medium">In Stock</th>
                        <th className="px-4 py-4 text-right font-medium">Min</th>
                        <th className="px-4 py-4 text-right font-medium">Cost</th>
                        <th className="px-4 py-4 text-right font-medium">Price</th>
                        <th className="px-4 py-4 text-right font-medium">Value</th>
                        <th className="px-4 py-4 text-center font-medium">Status</th>
                        <th className="px-4 py-4 text-center font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {filtered.map((item) => {
                        const isLow = item.stock_qty <= item.low_stock_threshold;
                        return (
                          <tr key={item.id} className="hover:bg-white/2 transition-colors group">
                            <td className="px-4 py-3 text-center">
                              {item.image_url ? (
                                <Image
                                  src={item.image_url}
                                  alt={item.name}
                                  width={40}
                                  height={40}
                                  className="w-10 h-10 rounded-lg object-cover mx-auto border border-white/10"
                                />
                              ) : (
                                <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center mx-auto border border-white/7">
                                  <Package size={14} className="text-[#374151]" />
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              <div>
                                <p className="text-sm font-medium text-[#f1f5f9]">{item.name}</p>
                                {item.sku && <p className="text-xs text-[#64748b]">{item.sku}</p>}
                              </div>
                            </td>
                            <td className="px-4 py-4 text-sm text-[#64748b]">{item.category ?? "—"}</td>
                            <td className="px-4 py-4 text-right">
                              <span className={`text-sm font-bold ${isLow ? "text-[#f87171]" : "text-[#f1f5f9]"}`}>
                                {item.stock_qty}
                              </span>
                            </td>
                            <td className="px-4 py-4 text-right text-sm text-[#64748b]">{item.low_stock_threshold}</td>
                            <td className="px-4 py-4 text-right text-sm text-[#64748b]">
                              {item.cost_price ? formatCurrency(item.cost_price) : "—"}
                            </td>
                            <td className="px-4 py-4 text-right text-sm text-[#f1f5f9]">{formatCurrency(item.selling_price)}</td>
                            <td className="px-4 py-4 text-right text-sm font-medium text-[#f1f5f9]">
                              {formatCurrency(item.selling_price * item.stock_qty)}
                            </td>
                            <td className="px-4 py-4 text-center">
                              <Badge variant={isLow ? "red" : "green"}>
                                {isLow ? "Low Stock" : "In Stock"}
                              </Badge>
                            </td>
                            <td className="px-4 py-4">
                              <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  className="p-1.5 hover:bg-white/5 rounded text-[#64748b] hover:text-[#f1f5f9]"
                                  onClick={() => openEdit(item)}
                                >
                                  <Pencil size={12} />
                                </button>
                                <button
                                  className="p-1.5 hover:bg-white/5 rounded text-[#64748b] hover:text-[#f87171]"
                                  onClick={() => handleDelete(item.id)}
                                >
                                  <X size={12} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
          </>
        )}

        {/* Reorder Tab */}
        {activeTab === "reorder" && (
          <div className="space-y-4">
            {lowStockItems.length === 0 ? (
              <EmptyState
                icon={<Package size={32} className="text-[#374151]" />}
                title="All products are well-stocked"
                description="No reorder alerts at this time."
              />
            ) : (
              <>
                <div className="bg-[rgba(255,101,36,0.04)] border border-[rgba(255,101,36,0.15)] rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Cpu size={16} className="text-[#FF8B5E]" />
                    <p className="text-sm font-semibold text-[#FF8B5E]">Products Below Minimum Stock Level</p>
                  </div>
                  <p className="text-xs text-[#64748b]">
                    These products are at or below their minimum stock threshold and should be reordered.
                  </p>
                </div>
                {lowStockItems.map((item) => (
                  <Card key={item.id}>
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-sm font-bold text-[#f1f5f9]">{item.name}</h3>
                            <Badge variant="red" className="text-[10px]">Reorder Needed</Badge>
                          </div>
                          {item.sku && <p className="text-xs text-[#64748b] mb-2">SKU: {item.sku}</p>}
                          <p className="text-xs text-[#94a3b8] bg-[#111624] rounded-lg px-3 py-2 border border-white/5">
                            Current stock ({item.stock_qty}) is at or below the minimum threshold ({item.low_stock_threshold}).
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-xs text-[#64748b] mb-1">Current / Min</p>
                          <p className="text-lg font-black text-[#f87171]">
                            {item.stock_qty} <span className="text-[#374151] text-sm">/</span>{" "}
                            <span className="text-[#34d399]">{item.low_stock_threshold}</span>
                          </p>
                          <Button size="sm" className="mt-3" onClick={() => openEdit(item)}>
                            Update Stock
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </>
            )}
          </div>
        )}
      </div>

      {/* Add/Edit Product Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#0d0f1a] border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-white/7">
              <h2 className="text-base font-bold text-[#f1f5f9]">
                {editItem ? "Edit Product" : "Add New Product"}
              </h2>
              <button
                className="text-[#64748b] hover:text-[#f1f5f9] p-1"
                onClick={() => { setShowAddModal(false); setEditItem(null); setForm(DEFAULT_FORM); setFormError(""); setEditImageUrl(null); }}
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {formError && (
                <p className="text-xs text-[#f87171] bg-[rgba(248,113,113,0.08)] border border-[rgba(248,113,113,0.2)] rounded-lg px-3 py-2">
                  {formError}
                </p>
              )}
              {/* Product Image */}
              <div>
                <label className="text-xs text-[#64748b] mb-1.5 block">Product Image</label>
                <ImageUpload
                  value={editImageUrl}
                  onChange={setEditImageUrl}
                  bucket="products"
                  path={profile?.business_id ?? "items"}
                  shape="square"
                  size="lg"
                  placeholder="Upload product image"
                  accept="image/jpeg,image/png,image/webp"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="text-xs text-[#64748b] mb-1.5 block">Product Name *</label>
                  <input
                    className="w-full bg-[#111624] border border-white/10 rounded-lg px-3 h-10 text-sm text-[#f1f5f9] outline-none focus:border-[#FF6524] transition-colors"
                    placeholder="e.g. Paracetamol 500mg"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-xs text-[#64748b] mb-1.5 block">SKU / Code</label>
                  <input
                    className="w-full bg-[#111624] border border-white/10 rounded-lg px-3 h-10 text-sm text-[#f1f5f9] outline-none focus:border-[#FF6524] transition-colors"
                    placeholder="MED-001"
                    value={form.sku}
                    onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-xs text-[#64748b] mb-1.5 block">Category</label>
                  <select
                    className="w-full bg-[#111624] border border-white/10 rounded-lg px-3 h-10 text-sm text-[#f1f5f9] outline-none focus:border-[#FF6524] transition-colors"
                    value={form.category}
                    onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                  >
                    <option value="">Select category</option>
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-[#64748b] mb-1.5 block">Selling Price (GH₵) *</label>
                  <input
                    type="number" min="0" step="0.01"
                    className="w-full bg-[#111624] border border-white/10 rounded-lg px-3 h-10 text-sm text-[#f1f5f9] outline-none focus:border-[#FF6524] transition-colors"
                    placeholder="0.00"
                    value={form.selling_price}
                    onChange={(e) => setForm((f) => ({ ...f, selling_price: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-xs text-[#64748b] mb-1.5 block">Cost Price (GH₵)</label>
                  <input
                    type="number" min="0" step="0.01"
                    className="w-full bg-[#111624] border border-white/10 rounded-lg px-3 h-10 text-sm text-[#f1f5f9] outline-none focus:border-[#FF6524] transition-colors"
                    placeholder="0.00"
                    value={form.cost_price}
                    onChange={(e) => setForm((f) => ({ ...f, cost_price: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-xs text-[#64748b] mb-1.5 block">Quantity in Stock *</label>
                  <input
                    type="number" min="0"
                    className="w-full bg-[#111624] border border-white/10 rounded-lg px-3 h-10 text-sm text-[#f1f5f9] outline-none focus:border-[#FF6524] transition-colors"
                    placeholder="0"
                    value={form.stock_qty}
                    onChange={(e) => setForm((f) => ({ ...f, stock_qty: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-xs text-[#64748b] mb-1.5 block">Min Stock (reorder alert)</label>
                  <input
                    type="number" min="0"
                    className="w-full bg-[#111624] border border-white/10 rounded-lg px-3 h-10 text-sm text-[#f1f5f9] outline-none focus:border-[#FF6524] transition-colors"
                    placeholder="10"
                    value={form.low_stock_threshold}
                    onChange={(e) => setForm((f) => ({ ...f, low_stock_threshold: e.target.value }))}
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-3 p-6 border-t border-white/7">
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => { setShowAddModal(false); setEditItem(null); setForm(DEFAULT_FORM); setFormError(""); setEditImageUrl(null); }}
              >
                Cancel
              </Button>
              <Button className="flex-1" onClick={handleSave} disabled={saving}>
                {saving ? <><Loader2 size={13} className="animate-spin" /> Saving...</> : editItem ? "Save Changes" : "Add Product"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
