import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") ?? "";
  const type = searchParams.get("type");
  const city = searchParams.get("city");
  const remote = searchParams.get("remote");
  const limit = Number(searchParams.get("limit") ?? "24");

  let query = supabase
    .from("job_listings")
    .select("*, businesses(name, city)")
    .eq("status", "open")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (search) query = query.ilike("title", `%${search}%`);
  if (type)   query = query.eq("job_type", type);
  if (city)   query = query.eq("city", city);
  if (remote) query = query.eq("remote", remote === "true");

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();

  if (!body.title) {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("job_listings")
    .insert({ ...body, posted_by: user.id, status: "open" })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data }, { status: 201 });
}
