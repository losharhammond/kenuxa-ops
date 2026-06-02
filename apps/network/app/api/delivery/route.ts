import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const riderId = searchParams.get("rider_id");
  const limit = Number(searchParams.get("limit") ?? "30");

  let query = supabase
    .from("delivery_orders")
    .select("*, delivery_riders(name, phone, vehicle_type)")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (status)  query = query.eq("status", status);
  if (riderId) query = query.eq("rider_id", riderId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Fetch available riders
  const { data: riders } = await supabase
    .from("delivery_riders")
    .select("id, name, phone, vehicle_type, status, rating")
    .eq("status", "available");

  return NextResponse.json({ data, riders });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { pickup_address, delivery_address, recipient_name, recipient_phone, items, rider_id } = body;

  if (!pickup_address || !delivery_address || !recipient_name) {
    return NextResponse.json({ error: "pickup_address, delivery_address, and recipient_name required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("delivery_orders")
    .insert({
      pickup_address,
      delivery_address,
      recipient_name,
      recipient_phone,
      items: JSON.stringify(items ?? []),
      rider_id,
      status: rider_id ? "assigned" : "pending",
      requested_by: user.id,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, status, rider_id } = await request.json();
  if (!id || !status) return NextResponse.json({ error: "id and status required" }, { status: 400 });

  const updates: Record<string, unknown> = { status };
  if (rider_id) updates.rider_id = rider_id;
  if (status === "delivered") updates.delivered_at = new Date().toISOString();

  const { data, error } = await supabase
    .from("delivery_orders")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}
