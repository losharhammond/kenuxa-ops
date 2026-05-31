import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query    = searchParams.get("q") || "";
  const city     = searchParams.get("city") || "";
  const category = searchParams.get("category") || "";
  const limit    = parseInt(searchParams.get("limit") || "20");
  const offset   = parseInt(searchParams.get("offset") || "0");

  const supabase = await createClient();

  let dbQuery = supabase
    .from("businesses")
    .select(`*, business_categories(name, icon)`)
    .eq("status", "active")
    .order("trust_score", { ascending: false })
    .range(offset, offset + limit - 1);

  if (query)    dbQuery = dbQuery.ilike("name", `%${query}%`);
  if (city)     dbQuery = dbQuery.ilike("city", `%${city}%`);
  if (category) dbQuery = dbQuery.eq("category_id", category);

  const { data, error, count } = await dbQuery;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ businesses: data, total: count });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  const { data, error } = await supabase
    .from("businesses")
    .insert({ ...body, owner_id: user.id })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ business: data }, { status: 201 });
}
