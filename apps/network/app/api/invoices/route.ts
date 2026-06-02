import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const customerId = searchParams.get("customer_id");
  const limit = Number(searchParams.get("limit") ?? "50");

  // Scope to the user's business — prevent cross-tenant data leakage
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("business_id")
    .eq("id", user.id)
    .single();

  if (!profile?.business_id) {
    return NextResponse.json({ error: "No business associated with this account" }, { status: 403 });
  }

  let query = supabase
    .from("invoices")
    .select("*, crm_customers(name, email), invoice_items(*)")
    .eq("business_id", profile.business_id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (status) query = query.eq("status", status);
  if (customerId) query = query.eq("customer_id", customerId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { items, ...invoiceData } = body;

  // Generate invoice number
  const invoiceNo = `INV-${Date.now().toString().slice(-8)}`;

  const { data: invoice, error } = await supabase
    .from("invoices")
    .insert({ ...invoiceData, invoice_no: invoiceNo, created_by: user.id })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Insert line items
  if (items?.length) {
    const lineItems = items.map((item: { description: string; qty: number; unit_price: number; tax_pct?: number }) => ({
      invoice_id: invoice.id,
      description: item.description,
      qty: item.qty,
      unit_price: item.unit_price,
      tax_pct: item.tax_pct ?? 0,
      line_total: item.qty * item.unit_price,
    }));
    await supabase.from("invoice_items").insert(lineItems);
  }

  return NextResponse.json({ data: invoice }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, ...updates } = await request.json();
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const { data, error } = await supabase
    .from("invoices")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}
