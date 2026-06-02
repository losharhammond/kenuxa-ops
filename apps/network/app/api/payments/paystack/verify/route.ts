import { NextRequest, NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { trackRevenue, calcTransactionFee } from "@/lib/revenue/track";

// Lazy service-role client — avoids module-level init crashing builds
let _admin: SupabaseClient | null = null;
function getAdmin(): SupabaseClient {
  if (!_admin) _admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  return _admin;
}

export async function GET(req: NextRequest) {
  const reference = req.nextUrl.searchParams.get("reference");
  if (!reference) return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/dashboard/wallet?error=missing_reference`);

  // Sanitise reference — must be our own format to prevent SSRF via reference param
  if (!/^[A-Za-z0-9_\-]{5,100}$/.test(reference)) {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/dashboard/wallet?error=invalid_reference`);
  }

  let paystackData: { status?: string; amount?: number; currency?: string; id?: number; metadata?: { user_id?: string; purpose?: string } };
  try {
    const paystackRes = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` },
    });
    const json = await paystackRes.json();
    paystackData = json.data ?? {};
  } catch {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/dashboard/wallet?error=payment_failed`);
  }

  if (!paystackData || paystackData.status !== "success") {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/dashboard/wallet?error=payment_failed`);
  }

  // SECURITY: resolve the real user from OUR database record for this reference.
  // Never trust user_id from Paystack metadata — it is user-supplied during initialization.
  const { data: txRecord } = await getAdmin()
    .from("wallet_transactions")
    .select("user_id, status, metadata")
    .eq("reference", reference)
    .single();

  if (!txRecord) {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/dashboard/wallet?error=payment_failed`);
  }

  // Idempotency: if already completed, just redirect to success
  if (txRecord.status === "completed") {
    const purpose = (txRecord.metadata as { purpose?: string } | null)?.purpose ?? "wallet_topup";
    const amountGHS = (paystackData.amount ?? 0) / 100;
    const successPage = purpose === "kenux_purchase"
      ? `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/kenux?success=purchase&amount=${amountGHS}`
      : `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/wallet?success=topup&amount=${amountGHS}`;
    return NextResponse.redirect(successPage);
  }

  const supabase = getAdmin();
  const userId = txRecord.user_id;
  const purpose = (txRecord.metadata as { purpose?: string } | null)?.purpose ?? "wallet_topup";
  const amountGHS = (paystackData.amount ?? 0) / 100;

  // Mark transaction completed
  await supabase
    .from("wallet_transactions")
    .update({ status: "completed", provider_reference: paystackData.id, settled_at: new Date().toISOString() })
    .eq("reference", reference)
    .eq("status", "pending");

  if (purpose === "wallet_topup") {
    // Double-entry: credit user wallet
    await supabase.rpc("wallet_credit", { p_user_id: userId, p_amount: amountGHS, p_currency: paystackData.currency ?? "GHS" });
    // Track platform transaction fee revenue
    const fee = calcTransactionFee(amountGHS);
    await trackRevenue({ source: "transaction_fee", amount: fee, userId, reference });
  } else if (purpose === "kenux_purchase") {
    // Fixed rate: 10 KENUX = GH₵ 1.00 (KENUX is NOT cryptocurrency — it's a utility currency)
    const KENUX_PER_GHS = parseInt(process.env.KENUX_PER_GHS ?? "10", 10);
    const kenuxAmount = Math.floor(amountGHS * KENUX_PER_GHS);
    // Credit KENUX to rewards account
    await supabase.rpc("kenux_credit", { p_user_id: userId, p_points: kenuxAmount, p_reason: `Purchased ${kenuxAmount} KENUX via Paystack` });
    // 100% margin on KENUX — entire GHS is revenue
    await trackRevenue({ source: "kenux_purchase", amount: amountGHS, userId, reference });
  } else if (purpose === "marketplace_order") {
    // Marketplace fee tracked separately when order fulfills
    await trackRevenue({ source: "transaction_fee", amount: calcTransactionFee(amountGHS), userId, reference });
  }

  // Seed activity event
  await supabase.from("activity_feed").insert({
    user_id: userId,
    type: "payment_sent",
    title: `Payment of GH₵ ${amountGHS.toLocaleString()} completed`,
    body: `Reference: ${reference}`,
    read: false,
  });

  const successPage = purpose === "kenux_purchase"
    ? `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/kenux?success=purchase&amount=${amountGHS}`
    : `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/wallet?success=topup&amount=${amountGHS}`;

  return NextResponse.redirect(successPage);
}

