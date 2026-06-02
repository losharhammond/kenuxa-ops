import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const businessId = searchParams.get("business_id");
  const q          = searchParams.get("q") || "";
  const segment    = searchParams.get("segment") || "";
  const limit      = parseInt(searchParams.get("limit") || "50", 10);

  let query = supabase
    .from("crm_customers")
    .select("*")
    .eq("business_id", businessId)
    .order("lifetime_value", { ascending: false })
    .limit(limit);

  if (q)       query = query.ilike("name", `%${q}%`);
  if (segment) query = query.eq("segment", segment);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ customers: data });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { data, error } = await supabase
    .from("crm_customers")
    .insert(body)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ customer: data }, { status: 201 });
}
