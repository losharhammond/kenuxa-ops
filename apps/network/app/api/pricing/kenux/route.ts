/**
 * GET /api/pricing/kenux
 * Returns KENUX bundle options for the requesting user's country.
 * Applies Purchasing Power Pricing — affordable for all markets.
 */
import { NextRequest, NextResponse } from "next/server";
import { getKenuxBundles, getCountryPricing, COUNTRY_PRICING } from "@/lib/pricing/affordability";

export const revalidate = 300; // 5-min ISR cache

export async function GET(req: NextRequest) {
  const countryCode = (req.nextUrl.searchParams.get("country") ?? "GH").toUpperCase();
  const profile = getCountryPricing(countryCode);
  const bundles = getKenuxBundles(countryCode);

  return NextResponse.json({
    country:          profile.name,
    currency:         profile.currency,
    tier:             profile.tier,
    base_rate_desc:   `${profile.kenuxPerGHS} KENUX = ${profile.currency} 1.00`,
    bundles,
    available_countries: Object.values(COUNTRY_PRICING)
      .filter((c) => c.active)
      .map((c) => ({ code: c.code, name: c.name, currency: c.currency })),
    note: "KENUX is a utility currency. Not cryptocurrency. Not speculative.",
  }, {
    headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60" },
  });
}
