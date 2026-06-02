import { NextRequest, NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Settlement sweep — daily (see vercel.json for schedule).
 * Processes pending_settlements and reconciles wallet_transactions.
 * Marks transactions that have been pending > 24h as failed.
 */
let _supabase: SupabaseClient | null = null;
function getSupabase(): SupabaseClient {
  if (!_supabase) {
    _supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }
  return _supabase;
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return runSweep();
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return runSweep();
}

async function runSweep() {
  const supabase = getSupabase();
  const startedAt = new Date();
  const cutoff24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const cutoff1h  = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  // 1. Expire stale pending wallet transactions (>24h pending = fail)
  const { data: expired } = await supabase
    .from("wallet_transactions")
    .update({ status: "failed" })
    .eq("status", "pending")
    .lt("created_at", cutoff24h)
    .select("id, user_id, amount, currency, type");

  const expiredCount = expired?.length ?? 0;

  // 2. Reverse debits for failed outgoing transactions (refund)
  if (expired && expired.length > 0) {
    for (const tx of expired) {
      if (tx.type === "debit") {
        await supabase.rpc("wallet_credit", {
          p_user_id: tx.user_id,
          p_amount: tx.amount,
          p_currency: tx.currency ?? "GHS",
        });
      }
    }
  }

  // 3. Process ready pending_settlements
  const { data: settlements } = await supabase
    .from("pending_settlements")
    .select("*")
    .eq("status", "pending")
    .lte("settle_after", new Date().toISOString())
    .limit(50);

  let settledCount = 0;
  for (const settlement of settlements ?? []) {
    const row = settlement as {
      id: string;
      user_id: string;
      amount: number;
      currency: string;
      type: string;
    };

    if (row.type === "credit") {
      const { error } = await supabase.rpc("wallet_credit", {
        p_user_id:   row.user_id,
        p_amount:    row.amount,
        p_currency:  row.currency ?? "GHS",
      });
      if (!error) {
        await supabase.from("pending_settlements").update({ status: "settled", settled_at: new Date().toISOString() }).eq("id", row.id);
        settledCount++;
      }
    }
  }

  // 4. Reconcile: mark wallet_transactions as completed where Paystack already confirmed
  // (handles delayed webhook delivery)
  const { data: paymentTxs } = await supabase
    .from("wallet_transactions")
    .select("reference")
    .eq("status", "pending")
    .lt("created_at", cutoff1h)
    .not("reference", "is", null)
    .limit(20);

  let reconciled = 0;
  if (paymentTxs && paymentTxs.length > 0) {
    const apiKey = process.env.PAYSTACK_SECRET_KEY;
    if (apiKey) {
      for (const tx of paymentTxs) {
        try {
          const res = await fetch(`https://api.paystack.co/transaction/verify/${tx.reference}`, {
            headers: { Authorization: `Bearer ${apiKey}` },
          });
          if (!res.ok) continue;
          const data = await res.json();
          if (data?.data?.status === "success") {
            await supabase
              .from("wallet_transactions")
              .update({ status: "completed", settled_at: new Date().toISOString() })
              .eq("reference", tx.reference);
            reconciled++;
          }
        } catch {
          // continue
        }
      }
    }
  }

  await supabase.from("audit_logs").insert({
    action: `settlement_sweep: expired=${expiredCount} settled=${settledCount} reconciled=${reconciled}`,
    category: "finance",
    severity: "info",
    actor: "cron",
    metadata: { expiredCount, settledCount, reconciled, duration_ms: Date.now() - startedAt.getTime() },
  });

  return NextResponse.json({
    ok: true,
    expired_transactions: expiredCount,
    pending_settlements_processed: settledCount,
    reconciled,
    duration_ms: Date.now() - startedAt.getTime(),
    ran_at: startedAt.toISOString(),
  });
}
