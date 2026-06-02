/**
 * POST /api/wallet/transfer
 * Wallet-to-wallet transfer using double-entry ledger RPC.
 * Body: { receiver_identifier, amount, note? }
 *   receiver_identifier: UUID or phone or email of receiver
 */
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { trackRevenue } from "@/lib/revenue/track";

const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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

  const body = await req.json().catch(() => ({})) as {
    receiver_identifier?: string;
    amount?: number;
    note?: string | undefined;
  };

  if (!body.receiver_identifier || !body.amount) {
    return NextResponse.json({ error: "receiver_identifier and amount required" }, { status: 400 });
  }

  const amount = Number(body.amount);
  if (isNaN(amount) || amount < 0.01) {
    return NextResponse.json({ error: "Minimum transfer is GH₵ 0.01" }, { status: 400 });
  }
  if (amount > 50000) {
    return NextResponse.json({ error: "Maximum single transfer is GH₵ 50,000" }, { status: 400 });
  }

  // Resolve receiver by UUID, email, or phone
  let receiverId = body.receiver_identifier;
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(receiverId);

  if (!isUUID) {
    const { data: receiverProfile } = await adminSupabase
      .from("user_profiles")
      .select("id")
      .or(`email.eq.${receiverId},phone.eq.${receiverId}`)
      .single();

    if (!receiverProfile) {
      return NextResponse.json({ error: "Recipient not found. Check the email, phone, or KENUXA ID." }, { status: 404 });
    }
    receiverId = (receiverProfile as { id: string }).id;
  }

  if (receiverId === user.id) {
    return NextResponse.json({ error: "You cannot transfer to yourself" }, { status: 400 });
  }

  // Execute atomic transfer via RPC
  const { data: result, error } = await adminSupabase.rpc("wallet_transfer", {
    p_sender_id:   user.id,
    p_receiver_id: receiverId,
    p_amount:      amount,
    p_currency:    "GHS",
    p_note:        body.note ?? undefined,
  });

  if (error) {
    // Translate DB error messages
    const msg = error.message.includes("Insufficient balance")
      ? "Insufficient wallet balance"
      : error.message.includes("Wallet not found")
      ? "Wallet account not found"
      : "Transfer failed";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const transfer = result as { ok: boolean; reference: string; sender_balance: number };

  // Record wallet transaction rows for history
  const reference = transfer.reference;
  await Promise.all([
    adminSupabase.from("wallet_transactions").insert({
      user_id:     user.id,
      type:        "debit",
      amount,
      currency:    "GHS",
      description: body.note ? `Transfer: ${body.note}` : `Transfer to ${receiverId.slice(0, 8)}`,
      status:      "completed",
      reference,
      provider:    "wallet",
    }),
    adminSupabase.from("wallet_transactions").insert({
      user_id:     receiverId,
      type:        "credit",
      amount,
      currency:    "GHS",
      description: body.note ? `Received: ${body.note}` : `Transfer from ${user.id.slice(0, 8)}`,
      status:      "completed",
      reference,
      provider:    "wallet",
    }),
  ]);

  // Notify receiver
  await adminSupabase.from("notifications").insert({
    user_id:    receiverId,
    type:       "wallet_credit",
    category:   "payment",
    title:      `GH₵ ${amount.toFixed(2)} received`,
    body:       `${user.email ?? "Someone"} sent you GH₵ ${amount.toFixed(2)}${body.note ? `: ${body.note}` : ""}.`,
    action_url: "/dashboard/wallet",
  });

  // Track platform transfer fee (1.5% + 0.50, waived for low amounts < 10)
  if (amount >= 10) {
    const fee = Math.round((amount * 0.015 + 0.50) * 100) / 100;
    await trackRevenue({ source: "transaction_fee", amount: fee, userId: user.id, reference });
  }

  // Activity feed
  await adminSupabase.from("activity_feed").insert({
    user_id: user.id,
    type:    "payment_sent",
    title:   `Sent GH₵ ${amount.toFixed(2)}`,
    body:    `Ref: ${reference}`,
    read:    false,
  });

  return NextResponse.json({
    ok:              true,
    reference,
    sender_balance:  transfer.sender_balance,
    amount_sent:     amount,
  });
}
