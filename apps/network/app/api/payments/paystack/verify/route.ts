import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { trackRevenue, calcTransactionFee } from "@/lib/revenue/track";

export async function GET(req: NextRequest) {
  const reference = req.nextUrl.searchParams.get("reference");
  if (!reference) return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/dashboard/wallet?error=missing_reference`);

  const paystackRes = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
    headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` },
  });
  const { data } = await paystackRes.json();

  if (!data || data.status !== "success") {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/dashboard/wallet?error=payment_failed`);
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setAll: (items: any[]) => items.forEach(({ name, value, options }: any) => cookieStore.set(name, value, options)),
      },
    }
  );

  const userId = data.metadata?.user_id;
  const purpose = data.metadata?.purpose ?? "wallet_topup";
  const amountGHS = data.amount / 100;

  // Mark transaction completed
  await supabase
    .from("wallet_transactions")
    .update({ status: "completed", provider_reference: data.id, settled_at: new Date().toISOString() })
    .eq("reference", reference);

  if (purpose === "wallet_topup") {
    // Double-entry: credit user wallet
    await supabase.rpc("wallet_credit", { p_user_id: userId, p_amount: amountGHS, p_currency: data.currency });
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
