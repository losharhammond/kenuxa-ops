"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import {
  MessageCircle, Mail, Phone, MapPin, Clock,
  ShoppingBag, Star, Megaphone, MessageSquare, PlusCircle,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/hooks/use-auth";

interface Customer {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  segment: string | null;
  loyalty_points: number | null;
  notes: string | null;
  created_at: string;
  last_seen_at: string | null;
  lifetime_value: number | null;
  total_orders: number | null;
  avg_order_value: number | null;
}

interface Purchase {
  id: string;
  created_at: string;
  items_summary: string | null;
  total: number;
  payment_method: string | null;
  status: string;
}

interface Interaction {
  id: string;
  type: string;
  note: string | null;
  created_at: string;
}

const INTERACTION_ICON: Record<string, React.ElementType> = {
  purchase:  ShoppingBag,
  support:   MessageSquare,
  review:    Star,
  whatsapp:  Megaphone,
  email:     Mail,
  call:      Phone,
};

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { profile } = useAuth();
  const supabase = createClient();

  const [customer, setCustomer]       = useState<Customer | null>(null);
  const [purchases, setPurchases]     = useState<Purchase[]>([]);
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [loading, setLoading]         = useState(true);
  const [logNote, setLogNote]         = useState("");
  const [logType, setLogType]         = useState("support");
  const [logOpen, setLogOpen]         = useState(false);
  const [saving, setSaving]           = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: cust }, { data: sales }, { data: logs }] = await Promise.all([
      supabase
        .from("crm_customers")
        .select("id, full_name, email, phone, city, segment, loyalty_points, notes, created_at, last_seen_at, lifetime_value, total_orders, avg_order_value")
        .eq("id", id)
        .single(),
      supabase
        .from("sales")
        .select("id, created_at, items_summary, total, payment_method, status")
        .eq("customer_id", id)
        .order("created_at", { ascending: false })
        .limit(20),
      supabase
        .from("crm_interactions")
        .select("id, type, note, created_at")
        .eq("customer_id", id)
        .order("created_at", { ascending: false })
        .limit(30),
    ]);
    setCustomer(cust as Customer);
    setPurchases((sales as Purchase[]) ?? []);
    setInteractions((logs as Interaction[]) ?? []);
    setLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function logInteraction() {
    if (!logNote.trim()) return;
    setSaving(true);
    await supabase.from("crm_interactions").insert({
      customer_id: id,
      business_id: profile?.business_id,
      type: logType,
      note: logNote.trim(),
    });
    setLogNote("");
    setLogOpen(false);
    setSaving(false);
    load();
  }

  async function updateNotes(notes: string) {
    await supabase.from("crm_customers").update({ notes }).eq("id", id);
    setCustomer((prev) => prev ? { ...prev, notes } : prev);
  }

  if (loading) {
    return (
      <div className="animate-fade-in">
        <div className="h-16 border-b border-white/7 bg-white/2 animate-pulse" />
        <div className="p-6 space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 bg-white/5 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="animate-fade-in p-6 text-center text-[#64748b]">
        Customer not found.
      </div>
    );
  }

  const segment = customer.segment ?? "Regular";

  return (
    <div className="animate-fade-in">
      <Header
        title={customer.full_name ?? "Customer"}
        subtitle={`${segment} Customer · Joined ${new Date(customer.created_at).toLocaleDateString("en-GH", { month: "long", year: "numeric" })}`}
        actions={
          <div className="flex items-center gap-2">
            {customer.phone && (
              <a href={`https://wa.me/${customer.phone.replace(/\D/g, "")}`} target="_blank" rel="noreferrer">
                <Button size="sm" variant="secondary"><MessageCircle size={13} /> WhatsApp</Button>
              </a>
            )}
            <Button size="sm" onClick={() => setLogOpen(true)}>
              <PlusCircle size={13} /> Log Interaction
            </Button>
          </div>
        }
      />

      {/* Log Interaction Modal */}
      {logOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[#0d0f1a] border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-base font-bold text-[#f1f5f9] mb-4">Log Interaction</h3>
            <div className="space-y-3">
              <select
                value={logType}
                onChange={(e) => setLogType(e.target.value)}
                className="w-full bg-[#111624] border border-white/10 rounded-lg px-3 h-9 text-sm text-[#f1f5f9] outline-none"
              >
                {["support", "purchase", "whatsapp", "email", "call", "review"].map((t) => (
                  <option key={t} value={t} className="capitalize">{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                ))}
              </select>
              <textarea
                rows={3}
                value={logNote}
                onChange={(e) => setLogNote(e.target.value)}
                placeholder="Describe the interaction..."
                className="w-full bg-[#111624] border border-white/10 rounded-lg px-3 py-2 text-sm text-[#f1f5f9] placeholder:text-[#374151] outline-none resize-none focus:border-[rgba(255,101,36,0.5)] transition-colors"
              />
              <div className="flex gap-3 pt-1">
                <Button variant="secondary" className="flex-1" onClick={() => setLogOpen(false)}>Cancel</Button>
                <Button className="flex-1" loading={saving} onClick={logInteraction} disabled={!logNote.trim()}>Save</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="p-6 space-y-6">
        {/* Profile + stats */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Profile card */}
          <Card className="lg:col-span-1">
            <CardContent className="p-5 text-center">
              <div className="w-16 h-16 rounded-full bg-[rgba(255,101,36,0.15)] flex items-center justify-center text-2xl font-bold text-[#FF8B5E] mx-auto mb-3">
                {(customer.full_name ?? "?")[0]?.toUpperCase() ?? "?"}
              </div>
              <h3 className="font-bold text-[#f1f5f9] mb-1">{customer.full_name ?? "Unnamed"}</h3>
              <Badge variant={segment === "VIP" ? "orange" : segment === "New" ? "blue" : "default"}>{segment}</Badge>
              <div className="mt-4 space-y-2 text-sm text-left">
                {customer.email && (
                  <div className="flex items-center gap-2 text-[#64748b]">
                    <Mail size={11} className="flex-shrink-0" />
                    <a href={`mailto:${customer.email}`} className="text-[#FF8B5E] text-xs truncate">{customer.email}</a>
                  </div>
                )}
                {customer.phone && (
                  <div className="flex items-center gap-2 text-[#64748b]">
                    <Phone size={11} className="flex-shrink-0" />
                    <span className="text-xs">{customer.phone}</span>
                  </div>
                )}
                {customer.city && (
                  <div className="flex items-center gap-2 text-[#64748b]">
                    <MapPin size={11} className="flex-shrink-0" />
                    <span className="text-xs">{customer.city}</span>
                  </div>
                )}
                {customer.last_seen_at && (
                  <div className="flex items-center gap-2 text-[#64748b]">
                    <Clock size={11} className="flex-shrink-0" />
                    <span className="text-xs">
                      Last seen {new Date(customer.last_seen_at).toLocaleDateString("en-GH", { month: "short", day: "numeric" })}
                    </span>
                  </div>
                )}
              </div>
              {(customer.loyalty_points ?? 0) > 0 && (
                <div className="mt-4 pt-4 border-t border-white/7">
                  <p className="text-xs text-[#64748b] mb-1">Loyalty Points</p>
                  <p className="text-2xl font-black text-[#fbbf24]">{(customer.loyalty_points ?? 0).toLocaleString()}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Stats */}
          <div className="lg:col-span-3 grid grid-cols-3 gap-4">
            {[
              { label: "Lifetime Value",  value: formatCurrency(customer.lifetime_value ?? 0), sub: "total spent",       color: "text-[#FF8B5E]" },
              { label: "Total Orders",    value: (customer.total_orders ?? 0).toString(),       sub: "purchases made",    color: "text-[#60a5fa]" },
              { label: "Avg Order Value", value: formatCurrency(customer.avg_order_value ?? 0), sub: "per transaction",   color: "text-[#34d399]" },
            ].map((s) => (
              <Card key={s.label}>
                <CardContent className="p-5">
                  <p className="text-xs text-[#64748b] mb-1">{s.label}</p>
                  <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
                  <p className="text-xs text-[#374151] mt-1">{s.sub}</p>
                </CardContent>
              </Card>
            ))}
            {/* Notes */}
            <Card className="col-span-3">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-[#64748b] uppercase tracking-wide">Notes</p>
                </div>
                <textarea
                  rows={2}
                  defaultValue={customer.notes ?? ""}
                  onBlur={(e) => updateNotes(e.target.value)}
                  placeholder="Add notes about this customer..."
                  className="w-full bg-transparent text-sm text-[#94a3b8] placeholder:text-[#374151] outline-none resize-none"
                />
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Purchase history */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Purchase History</CardTitle>
                  <span className="text-xs text-[#64748b]">{purchases.length} transactions</span>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {purchases.length === 0 ? (
                  <p className="text-sm text-[#374151] text-center py-8">No purchases yet</p>
                ) : (
                  <div className="space-y-1">
                    {purchases.map((p) => (
                      <div key={p.id} className="flex items-center justify-between py-3 px-3 rounded-lg hover:bg-white/3 transition-colors">
                        <div>
                          <p className="text-sm font-medium text-[#f1f5f9]">{p.items_summary ?? "Sale"}</p>
                          <p className="text-xs text-[#64748b]">
                            {new Date(p.created_at).toLocaleDateString("en-GH", { year: "numeric", month: "short", day: "numeric" })}
                            {p.payment_method && <> · {p.payment_method}</>}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-[#f1f5f9]">{formatCurrency(p.total)}</p>
                          <Badge variant={p.status === "completed" ? "green" : p.status === "refunded" ? "red" : "default"} className="text-[10px] capitalize">{p.status}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Interaction timeline */}
          <div>
            <Card>
              <CardHeader><CardTitle>Interaction Log</CardTitle></CardHeader>
              <CardContent className="pt-0">
                {interactions.length === 0 ? (
                  <p className="text-sm text-[#374151] text-center py-8">No interactions logged</p>
                ) : (
                  <div className="space-y-3">
                    {interactions.map((i) => {
                      const Icon = INTERACTION_ICON[i.type] ?? MessageSquare;
                      return (
                        <div key={i.id} className="flex items-start gap-3">
                          <div className="w-7 h-7 rounded-full bg-[rgba(255,101,36,0.08)] flex items-center justify-center flex-shrink-0 mt-0.5">
                            <Icon size={12} className="text-[#FF8B5E]" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-[#f1f5f9] capitalize">{i.type}</p>
                            {i.note && <p className="text-xs text-[#64748b] leading-relaxed">{i.note}</p>}
                            <p className="text-[10px] text-[#374151] mt-0.5">
                              {new Date(i.created_at).toLocaleDateString("en-GH", { month: "short", day: "numeric" })}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                <Button variant="ghost" size="sm" className="w-full mt-4 text-xs" onClick={() => setLogOpen(true)}>
                  <PlusCircle size={12} /> Log Interaction
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
