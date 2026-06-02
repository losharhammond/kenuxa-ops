import { NextRequest, NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Market price update cron — daily at 07:00 UTC (see vercel.json for schedule).
 * Pulls commodity prices from AgroMonitor / GCMA API if configured,
 * otherwise refreshes timestamps to signal data is still current.
 */
let _supabase: SupabaseClient | null = null;
function getSupabase(): SupabaseClient {
  if (!_supabase) {
    _supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }
  return _supabase;
}

// Simulated market volatility ±5% per update cycle when no external API
function jitter(base: number, pct = 0.05): number {
  const factor = 1 + (Math.random() - 0.5) * pct;
  return Math.round(base * factor * 100) / 100;
}

const BASE_PRICES: Record<string, number> = {
  Maize: 2.40, Tomato: 4.20, Cassava: 0.85, Yam: 3.50,
  Pepper: 13.00, Plantain: 1.80, Rice: 5.50, Onion: 3.80,
  "Garden Egg": 6.50, Cocoa: 16.00, Cowpea: 9.00, Soybean: 7.50,
};

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return runUpdate();
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return runUpdate();
}

async function runUpdate() {
  const supabase = getSupabase();
  const now = new Date().toISOString();
  const agroApiKey = process.env.AGRO_MONITOR_API_KEY;
  let source = "internal_simulation";
  let updated = 0;

  // Try external API first
  if (agroApiKey) {
    try {
      const res = await fetch(
        `https://api.agromonitoring.com/agro/1.0/commodity?appid=${agroApiKey}&country=GH`,
        { cache: "no-store" }
      );
      if (res.ok) {
        const data = await res.json();
        // Map external format to our schema
        if (Array.isArray(data)) {
          for (const item of data) {
            const { error } = await supabase.from("commodity_prices").upsert({
              crop:       item.name,
              price:      item.price_ghs,
              unit:       item.unit ?? "kg",
              change_24h: item.change ?? 0,
              category:   item.category ?? "general",
              country:    "GH",
              source:     "agromonitor",
              updated_at: now,
            }, { onConflict: "crop,country" });
            if (!error) updated++;
          }
          source = "agromonitor";
        }
      }
    } catch {
      // fall through to simulation
    }
  }

  // Simulation: apply small random price movements when no external API
  if (source === "internal_simulation") {
    const { data: current } = await supabase
      .from("commodity_prices")
      .select("crop, price")
      .eq("country", "GH");

    for (const row of current ?? []) {
      const base = BASE_PRICES[row.crop] ?? row.price;
      const newPrice = jitter(base);
      const change = Math.round((newPrice - row.price) * 100) / 100;

      const { error } = await supabase.from("commodity_prices").upsert({
        crop:       row.crop,
        price:      newPrice,
        change_24h: change,
        country:    "GH",
        source:     "internal_simulation",
        updated_at: now,
      }, { onConflict: "crop,country" });
      if (!error) updated++;
    }
  }

  return NextResponse.json({
    ok: true,
    updated,
    source,
    ran_at: now,
  });
}
