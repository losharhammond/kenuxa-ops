import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  // Public business profile — no auth required (SEO-friendly)
  const { data, error } = await supabase
    .from("businesses")
    .select(`
      *,
      products(id, name, price, stock_qty, images, is_active),
      reviews(id, rating, comment, author_name, created_at),
      business_hours
    `)
    .or(`id.eq.${id},slug.eq.${id}`)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Business not found" }, { status: 404 });
  }

  // Increment view count (non-blocking)
  void supabase
    .from("businesses")
    .update({ view_count: (data.view_count ?? 0) + 1 })
    .eq("id", data.id);

  return NextResponse.json({ business: data });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  // Verify ownership
  const { data: biz } = await supabase
    .from("businesses")
    .select("owner_id")
    .eq("id", id)
    .single();

  if (!biz || biz.owner_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data, error } = await supabase
    .from("businesses")
    .update({ ...body, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ business: data });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Soft delete — set status to 'closed'
  const { error } = await supabase
    .from("businesses")
    .update({ status: "closed", updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("owner_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
