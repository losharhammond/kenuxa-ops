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
      } else if (purpose === "kenux_purchase" && userId) {
        const kenuxRate = parseFloat(process.env.KENUX_GHS_RATE ?? "10");
        const kenuxAmount = Math.floor((amountGHS / kenuxRate) * 100);
        await supabase.rpc("kenux_credit", { p_user_id: userId, p_points: kenuxAmount });
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
