"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/layout/header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/ui/stat-card";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Search, FileText, Send, AlertCircle, CheckCircle2, Clock, FilePlus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/hooks/use-auth";
import { useRoleGuard } from "@/lib/hooks/use-role-guard";

interface Invoice {
  id: string;
  invoice_number: string;
  customer_name: string | null;
  type: string;
  total_amount: number;
  amount_paid: number;
  status: string;
  due_date: string | null;
  issued_date: string;
}

interface InvoiceStats {
  total_invoiced: number;
  amount_paid: number;
  outstanding: number;
  overdue: number;
}

const STATUS_COLOR: Record<string, "green" | "red" | "amber" | "blue" | "default"> = {
  paid: "green", overdue: "red", sent: "blue", draft: "default", partial: "amber",
};

const STATUS_ICON: Record<string, React.ReactNode> = {
  paid:    <CheckCircle2 size={11} className="text-[#34d399]" />,
  overdue: <AlertCircle size={11} className="text-[#f87171]" />,
  sent:    <Send size={11} className="text-[#3B82F6]" />,
  draft:   <FileText size={11} className="text-[#64748b]" />,
  partial: <Clock size={11} className="text-[#F59E0B]" />,
};

export default function InvoicingPage() {
  useRoleGuard("invoicing.view");
  const { profile } = useAuth();
  const supabase = createClient();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [stats, setStats] = useState<InvoiceStats | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.business_id) return;
    async function load() {
      setLoading(true);
      let q = supabase
        .from("invoices")
        .select("id, invoice_number, customer_name, type, total_amount, amount_paid, status, due_date, issued_date")
        .eq("business_id", profile!.business_id)
        .order("issued_date", { ascending: false })
        .limit(50);

      if (search) q = q.ilike("customer_name", `%${search}%`);
      if (statusFilter !== "all") q = q.eq("status", statusFilter);

      const { data } = await q;
      setInvoices((data as Invoice[]) ?? []);

      const { data: all } = await supabase
        .from("invoices")
        .select("total_amount, amount_paid, status")
        .eq("business_id", profile!.business_id);

      if (all) {
        const totalInvoiced = all.reduce((s, r) => s + (r.total_amount ?? 0), 0);
        const amountPaid    = all.reduce((s, r) => s + (r.amount_paid ?? 0), 0);
        const overdue       = all.filter((r) => r.status === "overdue").reduce((s, r) => s + ((r.total_amount ?? 0) - (r.amount_paid ?? 0)), 0);
        setStats({ total_invoiced: totalInvoiced, amount_paid: amountPaid, outstanding: totalInvoiced - amountPaid, overdue });
      }
      setLoading(false);
    }
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.business_id, search, statusFilter]);

  return (
    <div className="animate-fade-in">
      <Header
        title="Invoicing"
        subtitle="Quotes, invoices & receipts"
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" size="sm">
              <FileText size={13} />
              New Quote
            </Button>
            <Button size="sm">
              <FilePlus size={13} />
              New Invoice
            </Button>
          </div>
        }
      />

      <div className="p-6 space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Total Invoiced" value={stats?.total_invoiced ?? 0} format="currency" color="orange" icon={<FileText size={16} />} />
          <StatCard title="Amount Paid"    value={stats?.amount_paid ?? 0}    format="currency" color="green"  icon={<CheckCircle2 size={16} />} />
          <StatCard title="Outstanding"    value={stats?.outstanding ?? 0}     format="currency" color="red"    icon={<Clock size={16} />} />
          <StatCard title="Overdue"        value={stats?.overdue ?? 0}         format="currency" color="amber"  icon={<AlertCircle size={16} />} />
        </div>

        <Card>
          <div className="p-4 border-b border-white/7 flex items-center gap-3">
            <div className="flex-1 flex items-center gap-2 bg-[#07080f] border border-white/7 rounded-lg px-4 h-9">
              <Search size={14} className="text-[#64748b] flex-shrink-0" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-transparent border-none outline-none flex-1 text-sm placeholder:text-[#374151]"
                placeholder="Search invoices..."
                style={{ padding: 0 }}
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-[#0d0f1a] border border-white/7 rounded-lg text-sm px-3 h-9 text-[#f1f5f9] outline-none"
            >
              <option value="all">All Status</option>
              <option value="paid">Paid</option>
              <option value="sent">Sent</option>
              <option value="overdue">Overdue</option>
              <option value="draft">Draft</option>
              <option value="partial">Partial</option>
            </select>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/7 text-xs text-[#64748b] uppercase tracking-wider">
                  <th className="px-6 py-3 text-left font-medium">Invoice #</th>
                  <th className="px-4 py-3 text-left font-medium">Customer</th>
                  <th className="px-4 py-3 text-center font-medium">Type</th>
                  <th className="px-4 py-3 text-right font-medium">Total</th>
                  <th className="px-4 py-3 text-right font-medium">Balance Due</th>
                  <th className="px-4 py-3 text-left font-medium">Issued</th>
                  <th className="px-4 py-3 text-left font-medium">Due Date</th>
                  <th className="px-4 py-3 text-center font-medium">Status</th>
                  <th className="px-4 py-3 text-center font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {loading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 9 }).map((_, j) => (
                        <td key={j} className="px-4 py-3.5">
                          <div className="h-4 bg-white/5 rounded animate-pulse" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : invoices.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-5 py-16 text-center">
                      <FileText size={32} className="mx-auto text-[#374151] mb-3" />
                      <p className="text-sm text-[#64748b]">No invoices found</p>
                      <p className="text-xs text-[#374151] mt-1">Create your first invoice to get started</p>
                    </td>
                  </tr>
                ) : (
                  invoices.map((inv) => {
                    const balance = (inv.total_amount ?? 0) - (inv.amount_paid ?? 0);
                    return (
                      <tr key={inv.id} className="hover:bg-white/2 transition-colors group">
                        <td className="px-6 py-4 text-sm font-medium text-[#FF8B5E]">{inv.invoice_number}</td>
                        <td className="px-4 py-4 text-sm text-[#f1f5f9]">{inv.customer_name ?? "—"}</td>
                        <td className="px-4 py-4 text-center">
                          <span className="text-xs capitalize text-[#64748b]">{inv.type ?? "invoice"}</span>
                        </td>
                        <td className="px-4 py-4 text-right text-sm font-semibold text-[#f1f5f9]">{formatCurrency(inv.total_amount)}</td>
                        <td className="px-4 py-4 text-right text-sm">
                          <span className={balance > 0 ? "text-[#f87171]" : "text-[#34d399]"}>
                            {formatCurrency(balance)}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-sm text-[#64748b]">{formatDate(inv.issued_date)}</td>
                        <td className="px-4 py-4 text-sm text-[#64748b]">{inv.due_date ? formatDate(inv.due_date) : "—"}</td>
                        <td className="px-4 py-4 text-center">
                          <span className="inline-flex items-center gap-1">
                            {STATUS_ICON[inv.status] ?? null}
                            <Badge variant={STATUS_COLOR[inv.status] ?? "default"} className="capitalize">{inv.status}</Badge>
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button className="px-2 py-1 text-xs bg-[#111624] hover:bg-white/5 rounded border border-white/7 text-[#64748b]">View</button>
                            <button className="px-2 py-1 text-xs bg-[#111624] hover:bg-white/5 rounded border border-white/7 text-[#64748b]">Send</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
