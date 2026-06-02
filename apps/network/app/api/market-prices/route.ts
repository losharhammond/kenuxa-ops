import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Fallback prices (GHS per kg) — updated periodically
const FALLBACK_PRICES = [
  { crop: "Maize",    price: 2.40, unit: "kg", change: 0.10,  category: "grain"     },
  { crop: "Tomato",   price: 4.20, unit: "kg", change: -0.30, category: "vegetable" },
  { crop: "Cassava",  price: 0.85, unit: "kg", change: 0.05,  category: "tuber"     },
  { crop: "Yam",      price: 3.50, unit: "kg", change: 0.20,  category: "tuber"     },
  { crop: "Pepper",   price:13.00, unit: "kg", change: 1.00,  category: "spice"     },
  { crop: "Plantain", price: 1.80, unit: "kg", change: -0.10, category: "fruit"     },
  { crop: "Rice",     price: 5.50, unit: "kg", change: 0.00,  category: "grain"     },
  { crop: "Onion",    price: 3.80, unit: "kg", change: -0.20, category: "vegetable" },
  { crop: "Garden Egg",price:6.50, unit: "kg", change: 0.30,  category: "vegetable" },
  { crop: "Cocoa",    price:16.00, unit: "kg", change: 0.50,  category: "cash_crop" },
  { crop: "Cowpea",   price: 9.00, unit: "kg", change: 0.20,  category: "legume"    },
  { crop: "Soybean",  price: 7.50, unit: "kg", change: -0.10, category: "legume"    },
];

export async function GET(req: NextRequest) {
  const category = req.nextUrl.searchParams.get("category");
  const country  = req.nextUrl.searchParams.get("country") ?? "GH";

  // Try fetching from DB first (if commodity_prices table exists)
  try {
    let query = supabase
      .from("commodity_prices")
      .select("crop, price, unit, change_24h, category, updated_at")
      .eq("country", country)
      .order("updated_at", { ascending: false })
      .limit(20);

    if (category) {
      query = query.eq("category", category);
    }

    const { data, error } = await query;

    if (!error && data && data.length > 0) {
      return NextResponse.json({
        prices: data,
        source: "database",
        country,
        currency: "GHS",
        updated_at: data[0]?.updated_at ?? new Date().toISOString(),
      }, {
        headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=300" },
      });
    }
  } catch {
    // Fall through to fallback
  }

  // Return fallback prices
  const prices = category
    ? FALLBACK_PRICES.filter((p) => p.category === category)
    : FALLBACK_PRICES;

  return NextResponse.json({
    prices,
    source: "fallback",
    country,
    currency: "GHS",
    updated_at: new Date().toISOString(),
  }, {
    headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=300" },
  });
}

// POST: Admin can update market prices
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { crop, price, unit, change, category, country = "GH" } = body as {
    crop: string; price: number; unit: string; change: number; category: string; country?: string;
  };

  const { error } = await supabase.from("commodity_prices").upsert({
    crop, price, unit,
    change_24h: change,
    category,
    country,
    updated_at: new Date().toISOString(),
  }, { onConflict: "crop,country" });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
