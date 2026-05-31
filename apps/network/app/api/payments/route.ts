import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type"); // debit | credit
  const method = searchParams.get("method");
  const limit = Number(searchParams.get("limit") ?? "30");

  let query = supabase
    .from("payment_transactions")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (type)   query = query.eq("type", type);
  if (method) query = query.eq("method", method);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Wallet balance
  const { data: { user } } = await supabase.auth.getUser();
  const { data: wallet } = user
    ? await supabase.from("wallets").select("balance, currency").eq("owner_id", user.id).single()
    : { data: null };

  return NextResponse.json({ data, wallet });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { amount, method, type, reference, description, recipient_id } = body;

  if (!amount || !method || !type) {
    return NextResponse.json({ error: "amount, method, and type are required" }, { status: 400 });
  }

  const txRef = reference ?? `TXN-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;

  const { data, error } = await supabase
    .from("payment_transactions")
    .insert({
      amount,
      method,
      type,
      reference: txRef,
      description,
      recipient_id,
      sender_id: user.id,
      status: "pending",
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // In production: integrate with Paystack / MTN MoMo API here
  // For now, mark as completed
  await supabase
    .from("payment_transactions")
    .update({ status: "completed" })
    .eq("id", data.id);

  return NextResponse.json({ data: { ...data, status: "completed" } }, { status: 201 });
}
