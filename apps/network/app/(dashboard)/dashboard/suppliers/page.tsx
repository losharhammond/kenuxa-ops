"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Header } from "@/components/layout/header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { Search, Factory, CheckCircle2, Star, Package, Clock, ShoppingCart } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/hooks/use-auth";
import { useRoleGuard } from "@/lib/hooks/use-role-guard";

interface Supplier {
  id: string;
  name: string;
  category: string | null;
  city: string | null;
  rating: number;
  total_orders: number;
  is_verified: boolean;
  moq: number | null;
  lead_time_days: number | null;
  logo_url: string | null;
}

interface PurchaseOrder {
  id: string;
  po_number: string;
  supplier_name: string | null;
  total_amount: number;
  status: string;
  expected_date: string | null;
}

const PO_STATUS: Record<string, "green" | "blue" | "amber"> = {
  received: "green", confirmed: "blue", pending: "amber",
};

export default function SuppliersPage() {
  useRoleGuard("suppliers.view");
  const { profile } = useAuth();
  const supabase = createClient();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.business_id) return;
    async function load() {
      setLoading(true);
      try {
        let sq = supabase
          .from("suppliers")
          .select("id, name, category, city, rating, total_orders, is_verified, moq, lead_time_days, logo_url")
          .order("rating", { ascending: false })
          .limit(20);
        if (search) sq = sq.ilike("name", `%${search}%`);

        const [{ data: supData }, { data: poData }] = await Promise.all([
          sq,
          supabase
            .from("purchase_orders")
            .select("id, po_number, supplier_name, total_amount, status, expected_date")
            .eq("business_id", profile!.business_id)
            .order("created_at", { ascending: false })
            .limit(5),
        ]);

        setSuppliers((supData as Supplier[]) ?? []);
        setOrders((poData as PurchaseOrder[]) ?? []);
      } finally {
        setLoading(false);
      }
    }
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.business_id, search]);

  return (
    <div className="animate-fade-in">
      <Header
        title="Supplier Network"
        subtitle="Source inventory from verified suppliers"
        actions={
          <Button size="sm">
            <ShoppingCart size={13} />
            New RFQ
          </Button>
        }
      />

      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[#64748b] uppercase tracking-wider">Verified Suppliers</h3>
              <div className="flex items-center gap-2 bg-[#111624] border border-white/7 rounded-lg px-3 h-9">
                <Search size={13} className="text-[#64748b]" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="bg-transparent border-none outline-none text-sm placeholder:text-[#374151]"
                  placeholder="Search suppliers..."
                  style={{ padding: 0, width: "160px" }}
                />
              </div>
            </div>

            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <Card key={i} className="p-5">
                  <div className="h-12 bg-white/5 rounded animate-pulse" />
                </Card>
              ))
            ) : suppliers.length === 0 ? (
              <Card className="p-16 text-center">
                <Factory size={32} className="mx-auto text-[#374151] mb-3" />
                <p className="text-sm text-[#64748b]">No suppliers found</p>
                <p className="text-xs text-[#374151] mt-1">Browse the supplier marketplace to connect with verified suppliers</p>
              </Card>
            ) : (
              suppliers.map((sup) => (
                <Card key={sup.id} className="p-5 hover:border-white/20 hover:bg-[#161b2e] transition-all">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-[rgba(255,101,36,0.08)] overflow-hidden flex items-center justify-center flex-shrink-0">
                        {sup.logo_url ? (
                          <Image src={sup.logo_url} alt={sup.name} className="w-full h-full object-cover" width={48} height={48} />
                        ) : (
                          <Factory size={22} className="text-[#FF8B5E]" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-sm font-semibold text-[#f1f5f9]">{sup.name}</h3>
                          {sup.is_verified && (
                            <span className="flex items-center gap-1 text-xs text-[#34d399]">
                              <CheckCircle2 size={11} /> Verified
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[#64748b]">{sup.category ?? "General"} · {sup.city ?? "—"}</p>
                        <div className="flex items-center gap-4 text-xs text-[#64748b] mt-1.5">
                          <span className="flex items-center gap-1"><Star size={11} className="text-[#F59E0B]" /> {sup.rating?.toFixed(1) ?? "—"}</span>
                          <span className="flex items-center gap-1"><Package size={11} /> {sup.total_orders} orders</span>
                          {sup.moq && <span>Min: {formatCurrency(sup.moq)}</span>}
                          {sup.lead_time_days && <span className="flex items-center gap-1"><Clock size={11} /> {sup.lead_time_days}d lead</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <Button variant="secondary" size="sm">RFQ</Button>
                      <Button size="sm">Order</Button>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>

          <div>
            <h3 className="text-sm font-semibold text-[#64748b] uppercase tracking-wider mb-4">Recent Purchase Orders</h3>
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <Card key={i} className="p-4 mb-3">
                  <div className="h-12 bg-white/5 rounded animate-pulse" />
                </Card>
              ))
            ) : orders.length === 0 ? (
              <Card className="p-8 text-center">
                <Package size={24} className="mx-auto text-[#374151] mb-2" />
                <p className="text-sm text-[#64748b]">No purchase orders yet</p>
              </Card>
            ) : (
              <div className="space-y-3">
                {orders.map((po) => (
                  <Card key={po.id} className="p-4">
                    <p className="text-sm font-semibold text-[#FF8B5E] mb-1">{po.po_number}</p>
                    <p className="text-sm text-[#f1f5f9] mb-2">{po.supplier_name ?? "—"}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-[#f1f5f9]">{formatCurrency(po.total_amount)}</span>
                      <Badge variant={PO_STATUS[po.status] ?? "default"} className="capitalize">{po.status}</Badge>
                    </div>
                    {po.expected_date && (
                      <p className="text-xs text-[#64748b] mt-2">Expected: {po.expected_date}</p>
                    )}
                  </Card>
                ))}
                <Button variant="secondary" size="sm" className="w-full">View All Orders</Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
