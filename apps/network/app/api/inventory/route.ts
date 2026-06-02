import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const warehouseId = searchParams.get("warehouse_id");
  const lowStock = searchParams.get("low_stock") === "true";

  let query = supabase
    .from("products")
    .select("id, name, sku, stock_qty, reorder_level, cost_price, selling_price, unit")
    .order("name");

  if (lowStock) query = query.lt("stock_qty", 10);

  const { data: products, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Fetch recent transactions
  let txQuery = supabase
    .from("inventory_transactions")
    .select("*, products(name)")
    .order("created_at", { ascending: false })
    .limit(20);

  if (warehouseId) txQuery = txQuery.eq("warehouse_id", warehouseId);

  const { data: transactions } = await txQuery;

  return NextResponse.json({ data: { products, transactions } });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { product_id, quantity, type, notes, warehouse_id } = body;

  if (!product_id || !quantity || !type) {
    return NextResponse.json({ error: "product_id, quantity, and type are required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("inventory_transactions")
    .insert({ product_id, quantity, type, notes, warehouse_id, created_by: user.id })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Update product stock
  const delta = type === "in" ? quantity : -quantity;
  await supabase.rpc("adjust_stock", { p_product_id: product_id, p_delta: delta }).maybeSingle();

  return NextResponse.json({ data }, { status: 201 });
}
