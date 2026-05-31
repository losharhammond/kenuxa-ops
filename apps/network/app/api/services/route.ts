import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") ?? "";
  const category = searchParams.get("category");
  const priceType = searchParams.get("price_type"); // fixed | hourly | quote
  const limit = Number(searchParams.get("limit") ?? "24");

  let query = supabase
    .from("services")
    .select("*, businesses(name, city, verified, rating)")
    .eq("active", true)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (search)    query = query.ilike("name", `%${search}%`);
  if (category)  query = query.eq("category", category);
  if (priceType) query = query.eq("price_type", priceType);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { data, error } = await supabase
    .from("services")
    .insert({ ...body, created_by: user.id, active: true })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data }, { status: 201 });
}

// Request a quote for a service
export async function PUT(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { service_id, description, budget, preferred_date } = body;

  if (!service_id || !description) {
    return NextResponse.json({ error: "service_id and description required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("service_quotes")
    .insert({ service_id, description, budget, preferred_date, requested_by: user.id, status: "pending" })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data }, { status: 201 });
}
