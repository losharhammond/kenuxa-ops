"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { Header } from "@/components/layout/header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Pencil, Download, Send, MessageCircle, CheckCircle2, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface InvoiceItem {
  description: string;
  qty: number;
  unit: string;
  price: number;
  total: number;
}

interface Invoice {
  id: string;
  invoice_number: string;
  status: string;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  customer_address: string | null;
  business_name: string | null;
  business_email: string | null;
  business_phone: string | null;
  business_address: string | null;
  issue_date: string;
  due_date: string | null;
  items: InvoiceItem[];
  notes: string | null;
  vat_rate: number | null;
  subtotal: number;
  vat_amount: number;
  total: number;
}

const STATUS_COLORS: Record<string, "green" | "orange" | "red" | "blue" | "default"> = {
  paid:    "green",
  sent:    "blue",
  draft:   "default",
  overdue: "red",
  partial: "orange",
};

export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const supabase = createClient();

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState(false);
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("invoices")
      .select("*")
      .eq("id", id)
      .single();
    setInvoice(data as Invoice);
    setLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function markPaid() {
    setMarking(true);
    await supabase.from("invoices").update({ status: "paid", paid_at: new Date().toISOString() }).eq("id", id);
    setInvoice((prev) => prev ? { ...prev, status: "paid" } : prev);
    setMarking(false);
  }

  async function sendInvoice() {
    setSending(true);
    await supabase.from("invoices").update({ status: "sent", sent_at: new Date().toISOString() }).eq("id", id);
    setInvoice((prev) => prev ? { ...prev, status: "sent" } : prev);
    setSending(false);
  }

  if (loading) {
    return (
      <div className="animate-fade-in">
        <div className="h-16 border-b border-white/7 animate-pulse bg-white/2" />
        <div className="p-6">
          <div className="h-96 bg-white/5 rounded-xl animate-pulse" />
        </div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="animate-fade-in p-6 text-center text-[#64748b]">
        Invoice not found.
      </div>
    );
  }

  const items: InvoiceItem[] = Array.isArray(invoice.items) ? invoice.items : [];
  const subtotal   = invoice.subtotal  ?? items.reduce((s, i) => s + i.total, 0);
  const vatRate    = invoice.vat_rate  ?? 0.025;
  const vatAmount  = invoice.vat_amount ?? subtotal * vatRate;
  const total      = invoice.total     ?? subtotal + vatAmount;

  return (
    <div className="animate-fade-in">
      <Header
        title={invoice.invoice_number}
        subtitle={`Issued ${formatDate(invoice.issue_date)}${invoice.due_date ? ` · Due ${formatDate(invoice.due_date)}` : ""}`}
        actions={
          <div className="flex items-center gap-2">
            <Badge variant={STATUS_COLORS[invoice.status] ?? "default"} className="capitalize">
              {invoice.status}
            </Badge>
            <Button variant="secondary" size="sm"><Pencil size={13} /> Edit</Button>
            <Button variant="secondary" size="sm"><Download size={13} /> PDF</Button>
            {invoice.status === "draft" && (
              <Button size="sm" onClick={sendInvoice} loading={sending}>
                <Send size={13} /> Send Invoice
              </Button>
            )}
          </div>
        }
      />

      <div className="p-6 max-w-4xl">
        <Card>
          <CardContent className="p-8">
            {/* Invoice Header */}
            <div className="flex items-start justify-between mb-10">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#FF6524] to-[#F59E0B] flex items-center justify-center text-white font-black text-base">K</div>
                  <span className="text-lg font-black text-[#f1f5f9]">{invoice.business_name ?? "KENUXA Business"}</span>
                </div>
                {invoice.business_address && <p className="text-sm text-[#64748b]">{invoice.business_address}</p>}
                {invoice.business_email   && <p className="text-sm text-[#64748b]">{invoice.business_email}</p>}
                {invoice.business_phone   && <p className="text-sm text-[#64748b]">{invoice.business_phone}</p>}
              </div>
              <div className="text-right">
                <h1 className="text-3xl font-black text-[#f1f5f9] mb-1">INVOICE</h1>
                <p className="text-[#FF8B5E] font-bold text-lg">{invoice.invoice_number}</p>
                <div className="mt-3 text-sm text-[#64748b] space-y-0.5">
                  <p>Issue Date: <span className="text-[#f1f5f9]">{formatDate(invoice.issue_date)}</span></p>
                  {invoice.due_date && (
                    <p>Due Date: <span className="text-[#fbbf24]">{formatDate(invoice.due_date)}</span></p>
                  )}
                </div>
              </div>
            </div>

            {/* Bill To */}
            <div className="grid grid-cols-2 gap-8 mb-8 pb-8 border-b border-white/7">
              <div>
                <p className="text-xs font-semibold text-[#64748b] uppercase tracking-wider mb-2">Bill To</p>
                {invoice.customer_name    && <p className="text-sm font-bold text-[#f1f5f9]">{invoice.customer_name}</p>}
                {invoice.customer_address && <p className="text-sm text-[#64748b]">{invoice.customer_address}</p>}
                {invoice.customer_email   && <p className="text-sm text-[#64748b]">{invoice.customer_email}</p>}
                {invoice.customer_phone   && <p className="text-sm text-[#64748b]">{invoice.customer_phone}</p>}
              </div>
              <div className="bg-[rgba(255,101,36,0.04)] border border-[rgba(255,101,36,0.15)] rounded-xl p-4 text-right">
                <p className="text-xs font-semibold text-[#64748b] uppercase tracking-wider mb-2">Amount Due</p>
                <p className="text-3xl font-black text-[#FF8B5E]">{formatCurrency(total)}</p>
                <Badge variant={STATUS_COLORS[invoice.status] ?? "default"} className="mt-2 capitalize">{invoice.status}</Badge>
              </div>
            </div>

            {/* Line Items */}
            <table className="w-full mb-6">
              <thead>
                <tr className="border-b border-white/7 text-xs text-[#64748b] uppercase tracking-wider">
                  <th className="pb-3 text-left font-medium">Description</th>
                  <th className="pb-3 text-right font-medium w-16">Qty</th>
                  <th className="pb-3 text-right font-medium w-20">Unit</th>
                  <th className="pb-3 text-right font-medium w-24">Unit Price</th>
                  <th className="pb-3 text-right font-medium w-24">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {items.map((item, i) => (
                  <tr key={i} className="hover:bg-white/2 transition-colors">
                    <td className="py-3 text-sm text-[#f1f5f9]">{item.description}</td>
                    <td className="py-3 text-right text-sm text-[#64748b]">{item.qty}</td>
                    <td className="py-3 text-right text-sm text-[#64748b]">{item.unit}</td>
                    <td className="py-3 text-right text-sm text-[#64748b]">{formatCurrency(item.price)}</td>
                    <td className="py-3 text-right text-sm font-medium text-[#f1f5f9]">{formatCurrency(item.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Totals */}
            <div className="flex justify-end mb-8">
              <div className="w-72 space-y-2">
                <div className="flex justify-between text-sm text-[#64748b]">
                  <span>Subtotal</span>
                  <span className="text-[#f1f5f9]">{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm text-[#64748b]">
                  <span>VAT ({((vatRate) * 100).toFixed(1)}%)</span>
                  <span className="text-[#f1f5f9]">{formatCurrency(vatAmount)}</span>
                </div>
                <div className="flex justify-between text-base font-black pt-2 border-t border-white/7">
                  <span className="text-[#f1f5f9]">Total</span>
                  <span className="text-[#FF8B5E]">{formatCurrency(total)}</span>
                </div>
              </div>
            </div>

            {/* Notes */}
            {invoice.notes && (
              <div className="bg-[#111624] border border-white/7 rounded-xl p-4">
                <p className="text-xs font-semibold text-[#64748b] uppercase tracking-wider mb-1">Notes</p>
                <p className="text-sm text-[#94a3b8]">{invoice.notes}</p>
              </div>
            )}

            {/* Payment Actions */}
            <div className="mt-8 pt-6 border-t border-white/7 flex items-center justify-between">
              <div className="text-xs text-[#374151]">
                Powered by KENUXA Business Network
              </div>
              <div className="flex gap-2">
                {invoice.customer_phone && (
                  <a
                    href={`https://wa.me/${invoice.customer_phone.replace(/\D/g, "")}?text=${encodeURIComponent(`Hi, this is a reminder for invoice ${invoice.invoice_number} of ${formatCurrency(total)} due ${invoice.due_date ? formatDate(invoice.due_date) : "soon"}.`)}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <Button variant="secondary" size="sm">
                      <MessageCircle size={13} /> Send Reminder
                    </Button>
                  </a>
                )}
                {invoice.status !== "paid" && (
                  <Button size="sm" onClick={markPaid} loading={marking}>
                    {marking ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
                    Mark as Paid
                  </Button>
                )}
                {invoice.status === "paid" && (
                  <Badge variant="green" className="px-4 py-2">Paid</Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
