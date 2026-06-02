import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// RFQ = Request for Quote from supplier

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const businessId = searchParams.get("business_id");
  const status     = searchParams.get("status");

  let query = supabase
    .from("rfqs")
    .select("*, supplier:suppliers(name, category, city), rfq_items(*)")
    .order("created_at", { ascending: false });

  if (businessId) query = query.eq("business_id", businessId);
  if (status)     query = query.eq("status", status);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ rfqs: data });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { items, ...rfqData } = body;

  if (!rfqData.supplier_id) {
    return NextResponse.json({ error: "supplier_id is required" }, { status: 400 });
  }

  const rfqNo = `RFQ-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

  const { data: rfq, error: rfqError } = await supabase
    .from("rfqs")
    .insert({ ...rfqData, rfq_no: rfqNo, status: "sent", created_by: user.id })
    .select()
    .single();

  if (rfqError) return NextResponse.json({ error: rfqError.message }, { status: 500 });

  if (items?.length) {
    const { error: itemsError } = await supabase
      .from("rfq_items")
      .insert(items.map((item: Record<string, unknown>) => ({ ...item, rfq_id: rfq.id })));

    if (itemsError) return NextResponse.json({ error: itemsError.message }, { status: 500 });
  }

  return NextResponse.json({ rfq }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { id, status, quoted_amount, notes } = body;

  if (!id) return NextResponse.json({ error: "RFQ ID required" }, { status: 400 });

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (status)        updates.status = status;
  if (quoted_amount) updates.quoted_amount = quoted_amount;
  if (notes)         updates.supplier_notes = notes;

  const { data, error } = await supabase
    .from("rfqs")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ rfq: data });
}
