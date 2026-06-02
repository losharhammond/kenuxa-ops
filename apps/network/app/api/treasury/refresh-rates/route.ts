import { NextRequest, NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

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

const SUPPORTED_CURRENCIES = [
  "GHS","NGN","KES","ZAR","ETB","UGX","TZS","RWF",
  "XOF","XAF","ZMW","MWK","SLL","MZN","BWP","NAD",
  "GNF","SZL","LSL","MUR","SCR","CVE","STD",
];

// Called by Vercel Cron (daily at 06:00 UTC) or POST with CRON_SECRET
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return refreshRates();
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return refreshRates();
}

async function refreshRates() {
  const supabase = getSupabase();
  const apiKey = process.env.EXCHANGE_RATE_API_KEY;

  let rates: Record<string, number> = {};
  let source = "fallback";

  if (apiKey) {
    try {
      const res = await fetch(
        `https://openexchangerates.org/api/latest.json?app_id=${apiKey}&symbols=${SUPPORTED_CURRENCIES.join(",")}`,
        { cache: "no-store" }
      );
      if (!res.ok) throw new Error(`Exchange rate API error: ${res.status}`);
      const data = await res.json();
      if (data.rates) {
        rates = data.rates as Record<string, number>;
        source = "openexchangerates";
      }
    } catch {
      // fall through to fallback
    }
  }

  // Hardcoded fallback rates (approximate mid-market, USD base)
  if (Object.keys(rates).length === 0) {
    rates = {
      GHS: 14.50, NGN: 1610.00, KES: 130.00, ZAR: 18.50,
      ETB: 56.00,  UGX: 3750.00, TZS: 2680.00, RWF: 1300.00,
      XOF: 620.00, XAF: 620.00, ZMW: 27.50, MWK: 1740.00,
      SLL: 19700.00, MZN: 64.00, BWP: 13.50, NAD: 18.50,
    };
    source = "fallback";
  }

  const now = new Date().toISOString();
  const upserts = Object.entries(rates).map(([currency, rate]) => ({
    from_currency: "USD",
    to_currency: currency,
    rate,
    source,
    fetched_at: now,
  }));

  const { error } = await supabase
    .from("exchange_rates")
    .upsert(upserts, { onConflict: "from_currency,to_currency" });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    rates_updated: upserts.length,
    source,
    fetched_at: now,
  });
}
