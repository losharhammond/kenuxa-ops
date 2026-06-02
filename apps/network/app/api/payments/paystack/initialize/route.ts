import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setAll: (items: any[]) => items.forEach(({ name, value, options }: any) => cookieStore.set(name, value, options)),
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { amount, currency = "GHS", purpose = "wallet_topup", metadata = {} } = await req.json();

  if (!amount || amount < 100) {
    return NextResponse.json({ error: "Minimum amount is GH₵ 1.00 (100 pesewas)" }, { status: 400 });
  }

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("email, full_name")
    .eq("id", user.id)
    .single();

  const reference = `KNX-${user.id.slice(0, 8).toUpperCase()}-${Date.now()}`;

  const paystackRes = await fetch("https://api.paystack.co/transaction/initialize", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: profile?.email ?? user.email,
      amount,
      currency,
      reference,
      metadata: {
        user_id: user.id,
        purpose,
        ...metadata,
      },
      callback_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/payments/paystack/verify?reference=${reference}`,
    }),
  });

  if (!paystackRes.ok) {
    return NextResponse.json({ error: "Payment initialization failed" }, { status: 400 });
  }

  const paystackData = await paystackRes.json();

  if (!paystackData.status) {
    return NextResponse.json({ error: paystackData.message ?? "Payment initialization failed" }, { status: 400 });
  }

  // Create pending transaction record
  await supabase.from("wallet_transactions").insert({
    user_id: user.id,
    type: "credit",
    amount: amount / 100,
    currency,
    description: purpose === "wallet_topup" ? "Wallet top-up" : purpose,
    status: "pending",
    reference,
    provider: "paystack",
    provider_reference: paystackData.data.reference,
    metadata: { purpose, ...metadata },
  });

  return NextResponse.json({
    authorization_url: paystackData.data.authorization_url,
    access_code: paystackData.data.access_code,
    reference,
  });
}
