import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q    = searchParams.get("q") || "";
  const type = searchParams.get("type") || "all"; // businesses | products | jobs | all

  if (!q || q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const supabase = await createClient();
  const results: Record<string, unknown[]> = {};

  if (type === "all" || type === "businesses") {
    const { data } = await supabase
      .from("businesses")
      .select("id, name, slug, type, city, avg_rating, logo_url")
      .eq("status", "active")
      .ilike("name", `%${q}%`)
      .limit(5);
    results.businesses = data ?? [];
  }

  if (type === "all" || type === "products") {
    const { data } = await supabase
      .from("products")
      .select("id, name, price, images, business_id")
      .eq("is_active", true)
      .ilike("name", `%${q}%`)
      .limit(5);
    results.products = data ?? [];
  }

  if (type === "all" || type === "jobs") {
    const { data } = await supabase
      .from("job_listings")
      .select("id, title, type, location, salary_min, salary_max")
      .eq("is_active", true)
      .ilike("title", `%${q}%`)
      .limit(5);
    results.jobs = data ?? [];
  }

  return NextResponse.json({ results, query: q });
}
