"use client";

import { useEffect, useState, useCallback } from "react";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useAuth } from "@/lib/hooks/use-auth";
import { useRoleGuard } from "@/lib/hooks/use-role-guard";
import { createClient } from "@/lib/supabase/client";
import { DollarSign, TrendingDown, TrendingUp, BarChart2, PlusCircle, X, Loader2 } from "lucide-react";

interface Expense {
  id: string;
  description: string;
  category: string;
  amount: number;
  expense_date: string;
  payment_method: string;
}

const EXPENSE_CATEGORIES = ["Rent", "Salaries", "Inventory", "Utilities", "Marketing", "Maintenance", "Transport", "Other"];

export default function FinancePage() {
  const { profile } = useAuth();
  useRoleGuard("finance.view");
  const supabase = createClient();

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ description: "", category: "Rent", amount: "", expense_date: "", payment_method: "cash" });
  const [formError, setFormError] = useState("");

  const load = useCallback(async () => {
    if (!profile?.business_id) return;
    setLoading(true);
    try {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      const [{ data: expData }, { data: salesData }] = await Promise.all([
        supabase
          .from("business_expenses")
          .select("id, description, category, amount, expense_date, payment_method")
          .eq("business_id", profile.business_id)
          .gte("expense_date", startOfMonth.split("T")[0])
          .order("expense_date", { ascending: false }),
        supabase
          .from("sales")
          .select("total")
          .eq("business_id", profile.business_id)
          .gte("created_at", startOfMonth),
      ]);

      setExpenses((expData as Expense[]) ?? []);
      setTotalRevenue((salesData ?? []).reduce((s: number, r: { total: number }) => s + r.total, 0));
    } finally {
      setLoading(false);
    }
  }, [profile?.business_id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const netProfit = totalRevenue - totalExpenses;

  async function saveExpense() {
    if (!profile?.business_id) return;
    if (!form.description || !form.amount || !form.expense_date) {
      setFormError("Description, amount, and date are required.");
      return;
    }
    setSaving(true);
    setFormError("");
    const { error: insertErr } = await supabase.from("business_expenses").insert({
      business_id: profile.business_id,
      description: form.description.trim(),
      category: form.category,
      amount: parseFloat(form.amount),
      expense_date: form.expense_date,
      payment_method: form.payment_method,
    });
    setSaving(false);
    if (insertErr) {
      setFormError(insertErr.message);
      return;
    }
    setShowModal(false);
    setForm({ description: "", category: "Rent", amount: "", expense_date: "", payment_method: "cash" });
    load();
  }

  const currentMonth = new Date().toLocaleDateString("en-GH", { month: "long", year: "numeric" });

  return (
    <div className="animate-fade-in">
      <Header
        title="Finance"
        subtitle="P&L, expenses & business credit"
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => setShowModal(true)}>
              <PlusCircle size={13} /> Add Expense
            </Button>
            <Button size="sm"><BarChart2 size={13} /> P&L Report</Button>
          </div>
        }
      />

      <div className="p-6 space-y-6">
        {/* KPIs */}
        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard title="Revenue"        value={totalRevenue}  format="currency" color="green"  icon={<DollarSign size={16} />} />
            <StatCard title="Total Expenses" value={totalExpenses} format="currency" color="red"    icon={<TrendingDown size={16} />} />
            <StatCard title="Net Profit"     value={netProfit}     format="currency" color={netProfit >= 0 ? "blue" : "red"} icon={<TrendingUp size={16} />} />
            <StatCard title="Profit Margin"  value={totalRevenue > 0 ? Math.round((netProfit / totalRevenue) * 100) : 0} format="number" color="amber" icon={<BarChart2 size={16} />} />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* P&L Statement */}
          <Card>
            <CardHeader><CardTitle>Profit & Loss — {currentMonth}</CardTitle></CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-6" />)}</div>
              ) : (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm font-semibold text-[#f1f5f9] pb-2 border-b border-white/7">
                    <span>Revenue (from sales)</span>
                    <span className="text-[#34d399]">{formatCurrency(totalRevenue)}</span>
                  </div>
                  {expenses.length > 0 && (
                    <>
                      {Object.entries(
                        expenses.reduce((acc: Record<string, number>, e) => {
                          acc[e.category] = (acc[e.category] ?? 0) + e.amount;
                          return acc;
                        }, {})
                      ).map(([cat, val]) => (
                        <div key={cat} className="flex justify-between text-sm text-[#64748b]">
                          <span>{cat}</span>
                          <span className="text-[#f87171]">({formatCurrency(val)})</span>
                        </div>
                      ))}
                      <div className="flex justify-between text-sm font-semibold text-[#f1f5f9] pb-2 border-b border-white/7">
                        <span>Total Expenses</span>
                        <span className="text-[#f87171]">({formatCurrency(totalExpenses)})</span>
                      </div>
                    </>
                  )}
                  <div className="flex justify-between text-base font-black">
                    <span className="text-[#f1f5f9]">Net Profit</span>
                    <span className={netProfit >= 0 ? "text-[#34d399]" : "text-[#f87171]"}>{formatCurrency(netProfit)}</span>
                  </div>
                  {totalRevenue > 0 && (
                    <div className="flex justify-between text-sm text-[#64748b]">
                      <span>Profit Margin</span>
                      <span className="text-[#34d399]">{((netProfit / totalRevenue) * 100).toFixed(1)}%</span>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Business Credit Score */}
          <Card>
            <CardHeader><CardTitle>Business Credit Score</CardTitle></CardHeader>
            <CardContent>
              <div className="flex items-center gap-6 mb-6">
                <div className="relative w-28 h-28 flex-shrink-0">
                  <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                    <circle cx="50" cy="50" r="42" fill="none" stroke="#111624" strokeWidth="10" />
                    <circle cx="50" cy="50" r="42" fill="none" stroke="#FF6524" strokeWidth="10"
                      strokeDasharray={`${(780 / 850) * 264} 264`} strokeLinecap="round" />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-black text-[#f1f5f9]">780</span>
                    <span className="text-xs text-[#34d399]">Grade: A</span>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-[#f1f5f9] font-semibold mb-1">Excellent Score</p>
                  <p className="text-xs text-[#64748b] mb-3">Based on sales, payment, and activity data</p>
                  <Button size="sm" variant="secondary">Apply for Financing</Button>
                </div>
              </div>
              <div className="space-y-2.5">
                {[
                  { label: "Sales Consistency",  score: 88 },
                  { label: "Payment History",    score: 92 },
                  { label: "Customer Retention", score: 76 },
                  { label: "Inventory Health",   score: 65 },
                  { label: "Business Activity",  score: 82 },
                ].map((f) => (
                  <div key={f.label} className="flex items-center gap-3">
                    <span className="text-xs text-[#64748b] w-36 flex-shrink-0">{f.label}</span>
                    <div className="flex-1 h-1.5 bg-[#111624] rounded-full overflow-hidden">
                      <div className="h-full bg-[#FF6524] rounded-full" style={{ width: `${f.score}%` }} />
                    </div>
                    <span className={`text-xs font-bold w-8 text-right flex-shrink-0 ${f.score >= 80 ? "text-[#34d399]" : "text-[#fbbf24]"}`}>{f.score}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Expense Tracker */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Expense Tracker — {currentMonth}</CardTitle>
            <Button size="sm" variant="secondary" onClick={() => setShowModal(true)}>
              <PlusCircle size={13} /> Add Expense
            </Button>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
            ) : expenses.length === 0 ? (
              <div className="text-center py-12">
                <TrendingDown size={32} className="mx-auto text-[#374151] mb-3" />
                <p className="text-sm text-[#64748b]">No expenses recorded this month.</p>
                <Button size="sm" className="mt-3" onClick={() => setShowModal(true)}>
                  <PlusCircle size={13} /> Add First Expense
                </Button>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/7 text-xs text-[#64748b] uppercase tracking-wider">
                    <th className="pb-3 text-left font-medium">Description</th>
                    <th className="pb-3 text-left font-medium">Category</th>
                    <th className="pb-3 text-right font-medium">Amount</th>
                    <th className="pb-3 text-left font-medium">Date</th>
                    <th className="pb-3 text-center font-medium">Method</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {expenses.map((e) => (
                    <tr key={e.id} className="hover:bg-white/2 transition-colors">
                      <td className="py-3 text-sm text-[#f1f5f9]">{e.description}</td>
                      <td className="py-3">
                        <Badge variant="default" className="text-xs">{e.category}</Badge>
                      </td>
                      <td className="py-3 text-right text-sm font-semibold text-[#f87171]">{formatCurrency(e.amount)}</td>
                      <td className="py-3 text-sm text-[#64748b]">{formatDate(e.expense_date)}</td>
                      <td className="py-3 text-center text-xs text-[#64748b] capitalize">{e.payment_method.replace(/_/g, " ")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add Expense Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#0d0f1a] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-white/7">
              <h2 className="text-base font-bold text-[#f1f5f9]">Add Expense</h2>
              <button className="text-[#64748b] hover:text-[#f1f5f9] p-1" onClick={() => setShowModal(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {formError && (
                <p className="text-xs text-[#f87171] bg-[rgba(248,113,113,0.08)] border border-[rgba(248,113,113,0.2)] rounded-lg px-3 py-2">{formError}</p>
              )}
              <div>
                <label className="text-xs text-[#64748b] mb-1.5 block">Description *</label>
                <input
                  className="w-full bg-[#111624] border border-white/10 rounded-lg px-3 h-10 text-sm text-[#f1f5f9] outline-none focus:border-[#FF6524]"
                  placeholder="e.g. Monthly shop rent"
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-[#64748b] mb-1.5 block">Category</label>
                  <select
                    className="w-full bg-[#111624] border border-white/10 rounded-lg px-3 h-10 text-sm text-[#f1f5f9] outline-none focus:border-[#FF6524]"
                    value={form.category}
                    onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                  >
                    {EXPENSE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-[#64748b] mb-1.5 block">Amount (GH₵) *</label>
                  <input
                    type="number" min="0" step="0.01"
                    className="w-full bg-[#111624] border border-white/10 rounded-lg px-3 h-10 text-sm text-[#f1f5f9] outline-none focus:border-[#FF6524]"
                    placeholder="0.00"
                    value={form.amount}
                    onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-xs text-[#64748b] mb-1.5 block">Date *</label>
                  <input
                    type="date"
                    className="w-full bg-[#111624] border border-white/10 rounded-lg px-3 h-10 text-sm text-[#f1f5f9] outline-none focus:border-[#FF6524]"
                    value={form.expense_date}
                    onChange={(e) => setForm((f) => ({ ...f, expense_date: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-xs text-[#64748b] mb-1.5 block">Payment Method</label>
                  <select
                    className="w-full bg-[#111624] border border-white/10 rounded-lg px-3 h-10 text-sm text-[#f1f5f9] outline-none focus:border-[#FF6524]"
                    value={form.payment_method}
                    onChange={(e) => setForm((f) => ({ ...f, payment_method: e.target.value }))}
                  >
                    <option value="cash">Cash</option>
                    <option value="mtn_momo">MTN MoMo</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="card">Card</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="flex gap-3 p-6 border-t border-white/7">
              <Button variant="secondary" className="flex-1" onClick={() => setShowModal(false)}>Cancel</Button>
              <Button className="flex-1" onClick={saveExpense} disabled={saving}>
                {saving ? <><Loader2 size={13} className="animate-spin" /> Saving...</> : "Save Expense"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
