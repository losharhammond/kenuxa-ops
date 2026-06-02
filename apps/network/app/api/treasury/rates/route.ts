import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const SUPPORTED = ["GHS","NGN","KES","ZAR","ETB","UGX","TZS","RWF","XOF","ZMW","MWK","SLL","MZN"];

export async function GET() {
  // Try cached rates first (< 1 hour old)
  const { data: cached } = await supabase
    .from("exchange_rates")
    .select("*")
    .gte("fetched_at", new Date(Date.now() - 3600000).toISOString());

  if (cached && cached.length >= SUPPORTED.length) {
    const rates: Record<string, number> = {};
    for (const r of cached) {
      rates[r.to_currency] = r.rate;
    }
    return NextResponse.json({ base: "USD", rates, cached: true, fetched_at: cached[0]?.fetched_at });
  }

  // Fetch live rates
  const apiKey = process.env.EXCHANGE_RATES_API_KEY;
  if (!apiKey) {
    // Return fallback rates
    return NextResponse.json({
      base: "USD",
      rates: { GHS: 15.5, NGN: 1610, KES: 131, ZAR: 19.2, ETB: 57, UGX: 3850, TZS: 2620, RWF: 1340 },
      cached: true,
      fallback: true,
    });
  }

  try {
    const res = await fetch(
      `https://openexchangerates.org/api/latest.json?app_id=${apiKey}&symbols=${SUPPORTED.join(",")}`,
      { next: { revalidate: 3600 } }
    );
    if (!res.ok) throw new Error(`Exchange rate API error: ${res.status}`);
    const data = await res.json();

    if (data.rates) {
      // Upsert into cache
      const upserts = Object.entries(data.rates as Record<string, number>).map(([currency, rate]) => ({
        from_currency: "USD",
        to_currency: currency,
        rate,
        source: "openexchangerates",
        fetched_at: new Date().toISOString(),
      }));
      await supabase.from("exchange_rates").upsert(upserts, { onConflict: "from_currency,to_currency" });

      return NextResponse.json({ base: "USD", rates: data.rates, cached: false, fetched_at: new Date().toISOString() });
    }
  } catch {
    // Fall through to stale cache
  }

  // Return stale cache
  const { data: stale } = await supabase.from("exchange_rates").select("*");
  const rates: Record<string, number> = {};
  for (const r of stale ?? []) {
    rates[r.to_currency] = r.rate;
  }
  return NextResponse.json({ base: "USD", rates, cached: true, stale: true });
}
