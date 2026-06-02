"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/layout/header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/ui/stat-card";
import { formatCurrency, timeAgo, PAYMENT_METHOD_LABELS } from "@/lib/utils";
import { Download, CreditCard, Smartphone, Banknote, Wallet, ArrowDownLeft, ArrowUpRight, RotateCcw } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/hooks/use-auth";

interface Transaction {
  id: string;
  transaction_ref: string;
  external_ref: string | null;
  type: string;
  payment_method: string;
  amount: number;
  status: string;
  customer_name: string | null;
  created_at: string;
}

interface PaymentStats {
  total_received: number;
  momo: number;
  card: number;
  cash: number;
  wallet_balance: number;
}

const TYPE_COLOR: Record<string, "green" | "blue" | "red" | "amber"> = {
  payment: "green", settlement: "blue", refund: "red", topup: "amber",
};

const METHOD_ICON: Record<string, React.ReactNode> = {
  cash:          <Banknote size={13} />,
  mtn_momo:      <Smartphone size={13} />,
  telecel_cash:  <Smartphone size={13} />,
  at_money:      <Smartphone size={13} />,
  visa:          <CreditCard size={13} />,
  mastercard:    <CreditCard size={13} />,
  bank_transfer: <ArrowDownLeft size={13} />,
};

export default function PaymentsPage() {
  const { profile } = useAuth();
  const supabase = createClient();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [stats, setStats] = useState<PaymentStats | null>(null);
  const [typeFilter, setTypeFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.business_id) return;
    async function load() {
      setLoading(true);
      try {
        let q = supabase
          .from("payment_transactions")
          .select("id, transaction_ref, external_ref, type, payment_method, amount, status, customer_name, created_at")
          .eq("business_id", profile!.business_id)
          .order("created_at", { ascending: false })
          .limit(50);

        if (typeFilter !== "all") q = q.eq("type", typeFilter);

        const [{ data: txns }, { data: allTxns }, { data: walletData }] = await Promise.all([
          q,
          supabase
            .from("payment_transactions")
            .select("type, payment_method, amount, status")
            .eq("business_id", profile!.business_id)
            .eq("status", "paid"),
          supabase
            .from("business_wallets")
            .select("balance")
            .eq("business_id", profile!.business_id)
            .single(),
        ]);

        setTransactions((txns as Transaction[]) ?? []);

        if (allTxns) {
          const payments = allTxns.filter((t) => t.type === "payment");
          setStats({
            total_received: payments.reduce((s, t) => s + (t.amount ?? 0), 0),
            momo: payments.filter((t) => ["mtn_momo", "telecel_cash", "at_money"].includes(t.payment_method)).reduce((s, t) => s + (t.amount ?? 0), 0),
            card: payments.filter((t) => ["visa", "mastercard"].includes(t.payment_method)).reduce((s, t) => s + (t.amount ?? 0), 0),
            cash: payments.filter((t) => t.payment_method === "cash").reduce((s, t) => s + (t.amount ?? 0), 0),
            wallet_balance: (walletData as { balance: number } | null)?.balance ?? 0,
          });
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.business_id, typeFilter]);

  return (
    <div className="animate-fade-in">
      <Header
        title="Payments"
        subtitle="Transactions, wallets & settlements"
        actions={
          <Button size="sm">
            <CreditCard size={13} />
            Accept Payment
          </Button>
        }
      />

      <div className="p-6 space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Total Received" value={stats?.total_received ?? 0} format="currency" change={18} color="orange" icon={<ArrowDownLeft size={16} />} />
          <StatCard title="MTN MoMo"       value={stats?.momo ?? 0}           format="currency" color="amber"  icon={<Smartphone size={16} />} />
          <StatCard title="Card Payments"  value={stats?.card ?? 0}           format="currency" color="blue"   icon={<CreditCard size={16} />} />
          <StatCard title="Cash"           value={stats?.cash ?? 0}           format="currency" color="green"  icon={<Banknote size={16} />} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="p-6 bg-gradient-to-br from-[rgba(255,101,36,0.12)] to-transparent border-[rgba(255,101,36,0.2)]">
            <p className="text-xs text-[#64748b] uppercase tracking-wider mb-1">KENUXA Wallet Balance</p>
            <p className="text-3xl font-black text-[#f1f5f9] mb-4">
              {loading ? "—" : formatCurrency(stats?.wallet_balance ?? 0)}
            </p>
            <div className="flex gap-2">
              <Button size="sm" className="flex-1">
                <ArrowUpRight size={13} />
                Withdraw
              </Button>
              <Button variant="secondary" size="sm" className="flex-1">
                <Wallet size={13} />
                Top Up
              </Button>
            </div>
          </Card>
          <Card className="p-6">
            <p className="text-xs text-[#64748b] uppercase tracking-wider mb-3">Payment Methods Accepted</p>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(PAYMENT_METHOD_LABELS).map(([key, label]) => (
                <div key={key} className="flex items-center gap-2 text-sm text-[#64748b]">
                  {METHOD_ICON[key] ?? <CreditCard size={13} />}
                  <span>{label}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <Card>
          <div className="p-4 border-b border-white/7 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[#f1f5f9]">Transaction History</h3>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm">
                <Download size={13} />
                Export
              </Button>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="bg-[#0d0f1a] border border-white/7 rounded-lg text-sm px-3 h-8 text-[#f1f5f9] outline-none"
              >
                <option value="all">All Types</option>
                <option value="payment">Payments</option>
                <option value="settlement">Settlements</option>
                <option value="refund">Refunds</option>
                <option value="topup">Top-ups</option>
              </select>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/7 text-xs text-[#64748b] uppercase tracking-wider">
                  <th className="px-6 py-3 text-left font-medium">Reference</th>
                  <th className="px-4 py-3 text-left font-medium">From / To</th>
                  <th className="px-4 py-3 text-center font-medium">Method</th>
                  <th className="px-4 py-3 text-center font-medium">Type</th>
                  <th className="px-4 py-3 text-right font-medium">Amount</th>
                  <th className="px-4 py-3 text-center font-medium">Status</th>
                  <th className="px-4 py-3 text-left font-medium">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {loading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 7 }).map((_, j) => (
                        <td key={j} className="px-4 py-3.5">
                          <div className="h-4 bg-white/5 rounded animate-pulse" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : transactions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-16 text-center">
                      <CreditCard size={32} className="mx-auto text-[#374151] mb-3" />
                      <p className="text-sm text-[#64748b]">No transactions yet</p>
                    </td>
                  </tr>
                ) : (
                  transactions.map((txn) => (
                    <tr key={txn.id} className="hover:bg-white/2 transition-colors">
                      <td className="px-6 py-4">
                        <p className="text-sm font-medium text-[#f1f5f9]">{txn.transaction_ref}</p>
                        {txn.external_ref && <p className="text-xs text-[#64748b]">{txn.external_ref}</p>}
                      </td>
                      <td className="px-4 py-4 text-sm text-[#64748b]">{txn.customer_name ?? "—"}</td>
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-center gap-1.5 text-sm text-[#64748b]">
                          {METHOD_ICON[txn.payment_method] ?? <CreditCard size={13} />}
                          <span>{PAYMENT_METHOD_LABELS[txn.payment_method] ?? txn.payment_method}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <Badge variant={TYPE_COLOR[txn.type] ?? "default"} className="capitalize">{txn.type}</Badge>
                      </td>
                      <td className="px-4 py-4 text-right text-sm font-semibold">
                        <span className={txn.type === "refund" ? "text-[#f87171]" : "text-[#34d399]"}>
                          {txn.type === "refund" ? "−" : "+"}{formatCurrency(txn.amount)}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <Badge
                          variant={txn.status === "paid" || txn.status === "success" ? "green" : txn.status === "refunded" ? "red" : "amber"}
                          className="capitalize"
                        >
                          {txn.status === "refunded" ? <RotateCcw size={10} className="mr-1" /> : null}
                          {txn.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-4 text-sm text-[#64748b]">{timeAgo(txn.created_at)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
