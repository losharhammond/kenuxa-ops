import { NextRequest, NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import crypto from "crypto";

// Lazy Supabase admin client — no cookie auth needed for webhooks
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

function verifySignature(body: string, signature: string): boolean {
  const hash = crypto
    .createHmac("sha512", process.env.PAYSTACK_WEBHOOK_SECRET ?? "")
    .update(body)
    .digest("hex");
  return hash === signature;
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-paystack-signature") ?? "";

  if (!verifySignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const event = JSON.parse(rawBody);
  const sb = getSupabase();

  if (event.event === "charge.success") {
    const data = event.data;
    const reference = data.reference;
    const amountGHS = data.amount / 100;

    // SECURITY: resolve user_id from OUR database record — never trust metadata from Paystack
    const { data: tx } = await sb
      .from("wallet_transactions")
      .select("id, status, user_id, metadata")
      .eq("reference", reference)
      .single();

    if (tx && tx.status === "pending") {
      const userId = (tx as { user_id: string }).user_id;
      const purpose = (tx.metadata as { purpose?: string } | null)?.purpose ?? "wallet_topup";

      await sb
        .from("wallet_transactions")
        .update({ status: "completed", settled_at: new Date().toISOString() })
        .eq("reference", reference);

      if (purpose === "wallet_topup") {
        await sb.rpc("wallet_credit", { p_user_id: userId, p_amount: amountGHS, p_currency: data.currency ?? "GHS" });
        // Record wallet transaction row for history
        await sb.from("wallet_transactions").upsert({
          user_id:     userId,
          type:        "credit",
          amount:      amountGHS,
          currency:    data.currency ?? "GHS",
          description: "Wallet top-up via Paystack",
          status:      "completed",
          reference,
          provider:    "paystack",
        }, { onConflict: "reference" });
      } else if (purpose === "kenux_purchase") {
        // Fixed rate: 10 KENUX = GH₵ 1.00 (i.e. 10 KNX per GHS)
        const KENUX_PER_GHS = parseInt(process.env.KENUX_PER_GHS ?? "10", 10);
        const kenuxAmount = Math.floor(amountGHS * KENUX_PER_GHS);
        await sb.rpc("kenux_credit", {
          p_user_id: userId,
          p_points:  kenuxAmount,
          p_reason:  `Purchased ${kenuxAmount} KENUX for GH₵${amountGHS.toFixed(2)}`,
        });

        // Record platform revenue
        await sb.from("platform_revenue").insert({
          revenue_type: "kenux_purchase",
          amount:       amountGHS,
          reference,
          user_id:      userId,
          currency:     "GHS",
          status:       "settled",
        });
      }
    }
  }

  if (event.event === "transfer.success") {
    const reference = event.data.reference;
    await sb
      .from("wallet_transactions")
      .update({ status: "completed", settled_at: new Date().toISOString() })
      .eq("reference", reference);
  }

  // ── Subscription events ──────────────────────────────────────
  if (event.event === "subscription.create") {
    const sub = event.data;
    await sb.from("subscriptions").upsert({
      paystack_subscription_code: sub.subscription_code,
      paystack_customer_code:     sub.customer?.customer_code,
      plan_code:  sub.plan?.plan_code,
      status:     "active",
      next_payment_date: sub.next_payment_date,
      updated_at: new Date().toISOString(),
    }, { onConflict: "paystack_subscription_code" });
  }

  if (event.event === "subscription.disable" || event.event === "subscription.not_renew") {
    const subCode = event.data.subscription_code;
    if (subCode) {
      await sb
        .from("subscriptions")
        .update({ status: "cancelled", updated_at: new Date().toISOString() })
        .eq("paystack_subscription_code", subCode);
    }
  }

  if (event.event === "invoice.payment_failed") {
    const subCode = event.data.subscription?.subscription_code;
    if (subCode) {
      await sb
        .from("subscriptions")
        .update({ status: "past_due", updated_at: new Date().toISOString() })
        .eq("paystack_subscription_code", subCode);
    }
  }

  if (event.event === "invoice.update" && event.data.paid) {
    const subCode = event.data.subscription?.subscription_code;
    if (subCode) {
      await sb
        .from("subscriptions")
        .update({
          status: "active",
          next_payment_date: event.data.next_notification,
          updated_at: new Date().toISOString(),
        })
        .eq("paystack_subscription_code", subCode);
    }
  }

  if (event.event === "transfer.failed" || event.event === "transfer.reversed") {
    const reference = event.data.reference;
    await sb
      .from("wallet_transactions")
      .update({ status: "failed" })
      .eq("reference", reference);
    // Reverse debit if withdrawal failed — refund the user
    const { data: failedTx } = await sb
      .from("wallet_transactions")
      .select("user_id, amount, currency")
      .eq("reference", reference)
      .single();
    if (failedTx) {
      await sb.rpc("wallet_credit", {
        p_user_id:  failedTx.user_id,
        p_amount:   failedTx.amount,
        p_currency: failedTx.currency ?? "GHS",
      });
    }
  }

  return NextResponse.json({ received: true });
}
