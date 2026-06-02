import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateReceiptNo } from "@/lib/utils";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const businessId = searchParams.get("business_id");
  const limit      = parseInt(searchParams.get("limit") || "50", 10);

  const { data, error } = await supabase
    .from("sales")
    .select("*, sale_items(*)")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ sales: data });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { items, ...saleData } = body;

  const receiptNo = generateReceiptNo();

  const { data: sale, error: saleError } = await supabase
    .from("sales")
    .insert({ ...saleData, receipt_no: receiptNo, cashier_id: user.id })
    .select()
    .single();

  if (saleError) return NextResponse.json({ error: saleError.message }, { status: 500 });

  if (items?.length) {
    const { error: itemsError } = await supabase
      .from("sale_items")
      .insert(items.map((item: Record<string, unknown>) => ({ ...item, sale_id: sale.id })));

    if (itemsError) return NextResponse.json({ error: itemsError.message }, { status: 500 });

    // Update inventory
    for (const item of items) {
      if (item.product_id) {
        try {
          await supabase.rpc("decrement_stock", {
            p_product_id: item.product_id,
            p_qty: item.qty,
          });
        } catch { /* RPC optional */ }
      }
    }
  }

  return NextResponse.json({ sale }, { status: 201 });
}
