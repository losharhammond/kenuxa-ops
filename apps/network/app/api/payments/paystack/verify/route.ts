import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

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
  } else if (purpose === "kenux_purchase") {
    const kenuxRate = parseFloat(process.env.KENUX_GHS_RATE ?? "10");
    const kenuxAmount = Math.floor((amountGHS / kenuxRate) * 100);
    // Credit KENUX to rewards account
    await supabase.rpc("kenux_credit", { p_user_id: userId, p_points: kenuxAmount });
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
