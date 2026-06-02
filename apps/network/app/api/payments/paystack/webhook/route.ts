import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

// Supabase admin client — no cookie auth needed for webhooks
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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

  if (event.event === "charge.success") {
    const data = event.data;
    const reference = data.reference;
    const userId = data.metadata?.user_id;
    const purpose = data.metadata?.purpose ?? "wallet_topup";
    const amountGHS = data.amount / 100;

    // Idempotent: only process if still pending
    const { data: tx } = await supabase
      .from("wallet_transactions")
      .select("id, status")
      .eq("reference", reference)
      .single();

    if (tx && tx.status === "pending") {
      await supabase
        .from("wallet_transactions")
        .update({ status: "completed", settled_at: new Date().toISOString() })
        .eq("reference", reference);

      if (purpose === "wallet_topup" && userId) {
        await supabase.rpc("wallet_credit", { p_user_id: userId, p_amount: amountGHS, p_currency: data.currency });
        // Record wallet transaction row for history
        await supabase.from("wallet_transactions").upsert({
          user_id:     userId,
          type:        "credit",
          amount:      amountGHS,
          currency:    data.currency ?? "GHS",
          description: "Wallet top-up via Paystack",
          status:      "completed",
          reference,
          provider:    "paystack",
        }, { onConflict: "reference" }).then(() => {});
      } else if (purpose === "kenux_purchase" && userId) {
        // Fixed rate: 10 KENUX = GH₵ 1.00 (i.e. 10 KNX per GHS)
        const KENUX_PER_GHS = parseInt(process.env.KENUX_PER_GHS ?? "10", 10);
        const kenuxAmount = Math.floor(amountGHS * KENUX_PER_GHS);
        await supabase.rpc("kenux_credit", { p_user_id: userId, p_points: kenuxAmount, p_reason: `Purchased ${kenuxAmount} KENUX for GH₵${amountGHS.toFixed(2)}` });

        // Record platform revenue
        await supabase.from("platform_revenue").insert({
          source:       "kenux_purchase",
          revenue_type: "kenux_purchase",
          amount:       amountGHS,
          reference,
          user_id:      userId,
          status:       "settled",
        });
      }
    }
  }

  if (event.event === "transfer.success") {
    const reference = event.data.reference;
    await supabase
      .from("wallet_transactions")
      .update({ status: "completed", settled_at: new Date().toISOString() })
      .eq("reference", reference);
  }

  // ── Subscription events ──────────────────────────────────────
  if (event.event === "subscription.create") {
    const sub = event.data;
    const customerId = sub.customer?.customer_code;
    const planCode   = sub.plan?.plan_code;
    await supabase.from("subscriptions").upsert({
      paystack_subscription_code: sub.subscription_code,
      paystack_customer_code:     customerId,
      plan_code:  planCode,
      status:     "active",
      next_payment_date: sub.next_payment_date,
      updated_at: new Date().toISOString(),
    }, { onConflict: "paystack_subscription_code" });
  }

  if (event.event === "subscription.disable" || event.event === "subscription.not_renew") {
    const subCode = event.data.subscription_code;
    if (subCode) {
      await supabase
        .from("subscriptions")
        .update({ status: "cancelled", updated_at: new Date().toISOString() })
        .eq("paystack_subscription_code", subCode);
    }
  }

  if (event.event === "invoice.payment_failed") {
    const subCode = event.data.subscription?.subscription_code;
    if (subCode) {
      await supabase
        .from("subscriptions")
        .update({ status: "past_due", updated_at: new Date().toISOString() })
        .eq("paystack_subscription_code", subCode);
    }
  }

  if (event.event === "invoice.update" && event.data.paid) {
    const subCode = event.data.subscription?.subscription_code;
    if (subCode) {
      await supabase
        .from("subscriptions")
        .update({ status: "active", next_payment_date: event.data.next_notification, updated_at: new Date().toISOString() })
        .eq("paystack_subscription_code", subCode);
    }
  }

  if (event.event === "transfer.failed" || event.event === "transfer.reversed") {
    const reference = event.data.reference;
    await supabase
      .from("wallet_transactions")
      .update({ status: "failed" })
      .eq("reference", reference);
    // Reverse debit if withdrawal failed
    const { data: tx } = await supabase
      .from("wallet_transactions")
      .select("user_id, amount, currency")
      .eq("reference", reference)
      .single();
    if (tx) {
      await supabase.rpc("wallet_credit", { p_user_id: tx.user_id, p_amount: tx.amount, p_currency: tx.currency });
    }
  }

  return NextResponse.json({ received: true });
}
