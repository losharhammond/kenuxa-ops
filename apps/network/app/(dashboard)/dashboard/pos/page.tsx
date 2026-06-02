"use client";

import { useState, useCallback, useEffect } from "react";
import { Header } from "@/components/layout/header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency, generateReceiptNo, PAYMENT_METHOD_LABELS } from "@/lib/utils";
import type { SaleItem, PaymentMethod } from "@/lib/types";
import { useAuth } from "@/lib/hooks/use-auth";
import { useRoleGuard } from "@/lib/hooks/use-role-guard";
import { createClient } from "@/lib/supabase/client";
import {
  Search, Camera, User, ShoppingCart, Package, CheckCircle2,
  Printer, Minus, Plus, X, Loader2, AlertTriangle,
} from "lucide-react";

interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
  stock_qty: number;
  category?: string;
}

type CartItem = SaleItem & { id: string };

const PAYMENT_METHODS: PaymentMethod[] = ["cash", "mtn_momo", "telecel_cash", "at_money", "visa", "mastercard"];

export default function POSPage() {
  useRoleGuard("pos.access");
  const { profile } = useAuth();
  const supabase = createClient();

  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState("");
  const [payMethod, setPayMethod] = useState<PaymentMethod>("cash");
  const [amountPaid, setAmountPaid] = useState("");
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastReceiptNo, setLastReceiptNo] = useState("");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!profile?.business_id) return;
    async function load() {
      setLoadingProducts(true);
      const { data } = await supabase
        .from("inventory_items")
        .select("id, name, sku, selling_price, stock_qty, category")
        .eq("business_id", profile!.business_id)
        .gt("stock_qty", 0)
        .order("name")
        .limit(200);
      setProducts(
        (data ?? []).map((d: Record<string, unknown>) => {
          const p: Product = {
            id: d.id as string,
            name: d.name as string,
            sku: d.sku as string,
            price: (d.selling_price as number) ?? 0,
            stock_qty: (d.stock_qty as number) ?? 0,
          };
          if (d.category) p.category = d.category as string;
          return p;
        })
      );
      setLoadingProducts(false);
    }
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.business_id]);

  const subtotal = cart.reduce((s, i) => s + i.total, 0);
  const taxRate   = 0.025;
  const taxAmount = subtotal * taxRate;
  const total     = subtotal + taxAmount;
  const change    = Math.max(0, Number(amountPaid) - total);

  const addToCart = useCallback((product: Product) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.id === product.id);
      if (existing) {
        return prev.map((c) =>
          c.id === product.id
            ? { ...c, qty: c.qty + 1, total: (c.qty + 1) * c.unit_price }
            : c
        );
      }
      return [
        ...prev,
        { id: product.id, name: product.name, sku: product.sku, qty: 1, unit_price: product.price, discount: 0, total: product.price },
      ];
    });
  }, []);

  const updateQty = (id: string, qty: number) => {
    if (qty <= 0) { removeItem(id); return; }
    setCart((prev) => prev.map((c) => c.id === id ? { ...c, qty, total: qty * c.unit_price } : c));
  };

  const removeItem = (id: string) => setCart((prev) => prev.filter((c) => c.id !== id));

  const processSale = async () => {
    setProcessing(true);
    const rno = generateReceiptNo();
    if (profile?.business_id) {
      await supabase.from("sales").insert({
        business_id: profile.business_id,
        receipt_no: rno,
        items: cart,
        subtotal,
        tax_amount: taxAmount,
        total,
        payment_method: payMethod,
        amount_paid: payMethod === "cash" ? Number(amountPaid) : total,
        change_given: change,
        cashier_id: profile.id,
      });
    }
    setLastReceiptNo(rno);
    setProcessing(false);
    setShowReceipt(true);
  };

  const newSale = () => {
    setCart([]);
    setAmountPaid("");
    setShowReceipt(false);
  };

  const filtered = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase())
  );

  if (showReceipt) {
    return (
      <div className="animate-fade-in">
        <Header title="Point of Sale" subtitle="Receipt" />
        <div className="p-6 max-w-md mx-auto">
          <Card className="p-8 border-[rgba(16,185,129,0.3)] bg-[rgba(16,185,129,0.04)]">
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-full bg-[rgba(16,185,129,0.15)] flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 size={32} className="text-[#34d399]" />
              </div>
              <h2 className="text-xl font-bold text-[#f1f5f9]">Sale Complete!</h2>
              <p className="text-sm text-[#64748b] mt-1">{lastReceiptNo}</p>
            </div>
            <div className="space-y-2 mb-6">
              {cart.map((item) => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span className="text-[#64748b]">{item.name} × {item.qty}</span>
                  <span className="text-[#f1f5f9]">{formatCurrency(item.total)}</span>
                </div>
              ))}
              <div className="border-t border-white/7 pt-2 space-y-1">
                <div className="flex justify-between text-sm"><span className="text-[#64748b]">Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
                <div className="flex justify-between text-sm"><span className="text-[#64748b]">VAT (2.5%)</span><span>{formatCurrency(taxAmount)}</span></div>
                <div className="flex justify-between text-base font-bold"><span>Total</span><span className="text-[#FF8B5E]">{formatCurrency(total)}</span></div>
                <div className="flex justify-between text-sm"><span className="text-[#64748b]">Paid ({PAYMENT_METHOD_LABELS[payMethod]})</span><span>{formatCurrency(Number(amountPaid) || total)}</span></div>
                {change > 0 && <div className="flex justify-between text-sm text-[#34d399]"><span>Change</span><span>{formatCurrency(change)}</span></div>}
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="secondary" size="sm" className="flex-1">
                <Printer size={13} /> Print
              </Button>
              <Button onClick={newSale} className="flex-1">New Sale</Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in h-full">
      <Header title="Point of Sale" subtitle="Sell products & process payments" />
      <div className="flex h-[calc(100vh-64px)]">
        {/* Products panel */}
        <div className="flex-1 p-4 overflow-y-auto border-r border-white/7">
          <div className="mb-4 flex gap-2">
            <div className="flex-1 flex items-center gap-2 bg-[#111624] border border-white/10 rounded-lg px-3 h-10">
              <Search size={14} className="text-[#64748b] flex-shrink-0" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-transparent border-none outline-none flex-1 text-sm placeholder:text-[#374151]"
                placeholder="Search product or scan barcode..."
              />
            </div>
            <Button variant="secondary" size="sm">
              <Camera size={13} /> Scan
            </Button>
          </div>

          {loadingProducts ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="bg-[#111624] border border-white/7 rounded-xl p-3 h-28 animate-pulse" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-[#374151]">
              <Package size={32} className="mx-auto mb-3 opacity-40" />
              <p className="text-sm">{search ? "No products match your search" : "No products in inventory"}</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {filtered.map((p) => (
                <button
                  key={p.id}
                  onClick={() => addToCart(p)}
                  className="bg-[#111624] border border-white/7 rounded-xl p-3 text-left hover:border-[rgba(255,101,36,0.4)] hover:bg-[rgba(255,101,36,0.05)] transition-all group"
                >
                  <div className="w-10 h-10 rounded-lg bg-[rgba(255,101,36,0.08)] flex items-center justify-center mb-2 group-hover:bg-[rgba(255,101,36,0.15)] transition-colors">
                    <Package size={18} className="text-[#FF8B5E]" />
                  </div>
                  <p className="text-xs font-medium text-[#f1f5f9] line-clamp-2 mb-1">{p.name}</p>
                  <p className="text-xs text-[#64748b] mb-1">{p.sku}</p>
                  <p className="text-sm font-bold text-[#FF8B5E]">{formatCurrency(p.price)}</p>
                  <p className={`text-xs mt-1 flex items-center gap-1 ${p.stock_qty <= 5 ? "text-[#f87171]" : "text-[#64748b]"}`}>
                    {p.stock_qty <= 5 && <AlertTriangle size={10} />}
                    Stock: {p.stock_qty}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Cart panel */}
        <div className="w-96 flex flex-col bg-[#0d0f1a]">
          <div className="p-4 border-b border-white/7">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-[#f1f5f9]">Cart ({cart.length})</h3>
              {cart.length > 0 && (
                <button onClick={() => setCart([])} className="text-xs text-[#64748b] hover:text-[#f87171] transition-colors">Clear all</button>
              )}
            </div>
            <div className="flex items-center gap-2 bg-[#111624] border border-white/10 rounded-lg px-3 h-9">
              <User size={13} className="text-[#64748b] flex-shrink-0" />
              <input className="bg-transparent border-none outline-none flex-1 text-sm placeholder:text-[#374151]" placeholder="Customer name (optional)" />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {cart.length === 0 ? (
              <div className="text-center py-12 text-[#374151]">
                <ShoppingCart size={32} className="mx-auto mb-3 opacity-40" />
                <p className="text-sm">Add products to start a sale</p>
              </div>
            ) : (
              cart.map((item) => (
                <div key={item.id} className="flex items-center gap-3 bg-[#111624] rounded-lg p-3">
                  <div className="w-8 h-8 rounded-lg bg-[rgba(255,101,36,0.08)] flex items-center justify-center flex-shrink-0">
                    <Package size={14} className="text-[#FF8B5E]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-[#f1f5f9] truncate">{item.name}</p>
                    <p className="text-xs text-[#64748b]">{formatCurrency(item.unit_price)} each</p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => updateQty(item.id, item.qty - 1)} className="w-6 h-6 rounded bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors">
                      <Minus size={10} />
                    </button>
                    <span className="w-7 text-center text-sm font-medium text-[#f1f5f9]">{item.qty}</span>
                    <button onClick={() => updateQty(item.id, item.qty + 1)} className="w-6 h-6 rounded bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors">
                      <Plus size={10} />
                    </button>
                    <button onClick={() => removeItem(item.id)} className="w-6 h-6 rounded hover:bg-[rgba(248,113,113,0.1)] flex items-center justify-center transition-colors ml-1">
                      <X size={10} className="text-[#64748b] hover:text-[#f87171]" />
                    </button>
                  </div>
                  <p className="text-sm font-semibold text-[#f1f5f9] w-16 text-right">{formatCurrency(item.total)}</p>
                </div>
              ))
            )}
          </div>

          {cart.length > 0 && (
            <div className="p-4 border-t border-white/7 space-y-4">
              <div className="space-y-1.5">
                <div className="flex justify-between text-sm text-[#64748b]">
                  <span>Subtotal</span><span>{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm text-[#64748b]">
                  <span>VAT (2.5%)</span><span>{formatCurrency(taxAmount)}</span>
                </div>
                <div className="flex justify-between text-base font-bold text-[#f1f5f9]">
                  <span>Total</span><span className="text-[#FF8B5E]">{formatCurrency(total)}</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-1.5">
                {PAYMENT_METHODS.map((m) => (
                  <button
                    key={m}
                    onClick={() => setPayMethod(m)}
                    className={`py-1.5 px-2 rounded-lg text-xs border transition-colors ${
                      payMethod === m
                        ? "bg-[rgba(255,101,36,0.15)] border-[rgba(255,101,36,0.4)] text-[#FF8B5E]"
                        : "bg-[#111624] border-white/7 text-[#64748b] hover:text-[#f1f5f9]"
                    }`}
                  >
                    {PAYMENT_METHOD_LABELS[m]}
                  </button>
                ))}
              </div>

              {payMethod === "cash" && (
                <div>
                  <label className="text-xs text-[#64748b] mb-1.5 block">Amount Paid (GHS)</label>
                  <input
                    type="number"
                    value={amountPaid}
                    onChange={(e) => setAmountPaid(e.target.value)}
                    placeholder={total.toFixed(2)}
                    className="w-full bg-[#111624] border border-white/10 rounded-lg px-3 h-9 text-right font-bold text-[#f1f5f9] outline-none focus:border-[rgba(255,101,36,0.4)] transition-colors"
                  />
                  {change > 0 && (
                    <p className="text-sm text-[#34d399] mt-1 text-right">Change: {formatCurrency(change)}</p>
                  )}
                </div>
              )}

              <Button
                onClick={processSale}
                size="lg"
                className="w-full"
                disabled={processing || (payMethod === "cash" && Number(amountPaid) < total && amountPaid !== "")}
              >
                {processing ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                Complete Sale · {formatCurrency(total)}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
