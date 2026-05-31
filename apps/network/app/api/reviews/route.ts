import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  const businessId = searchParams.get("business_id");
  const rating = searchParams.get("rating");
  const limit = Number(searchParams.get("limit") ?? "20");

  let query = supabase
    .from("business_reviews")
    .select("*, user_profiles(full_name, avatar_url)")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (businessId) query = query.eq("business_id", businessId);
  if (rating) query = query.eq("rating", Number(rating));

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Aggregate rating stats
  const { data: stats } = await supabase
    .from("business_reviews")
    .select("rating")
    .eq("business_id", businessId ?? "");

  const distribution = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: stats?.filter((s) => s.rating === star).length ?? 0,
  }));

  const avgRating = stats?.length
    ? stats.reduce((s, r) => s + r.rating, 0) / stats.length
    : 0;

  return NextResponse.json({
    data,
    meta: { avgRating: Math.round(avgRating * 10) / 10, total: stats?.length ?? 0, distribution },
  });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { business_id, rating, comment } = body;

  if (!business_id || !rating) {
    return NextResponse.json({ error: "business_id and rating required" }, { status: 400 });
  }

  // Prevent duplicate reviews
  const { data: existing } = await supabase
    .from("business_reviews")
    .select("id")
    .eq("business_id", business_id)
    .eq("reviewer_id", user.id)
    .single();

  if (existing) {
    return NextResponse.json({ error: "You have already reviewed this business" }, { status: 409 });
  }

  const { data, error } = await supabase
    .from("business_reviews")
    .insert({ business_id, rating, comment, reviewer_id: user.id })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Update business average rating
  await supabase.rpc("recalculate_business_rating", { p_business_id: business_id }).maybeSingle();

  return NextResponse.json({ data }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, reply } = await request.json();
  if (!id || reply === undefined) return NextResponse.json({ error: "id and reply required" }, { status: 400 });

  const { data, error } = await supabase
    .from("business_reviews")
    .update({ owner_reply: reply, replied_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}
