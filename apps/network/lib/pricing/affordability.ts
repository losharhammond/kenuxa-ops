/**
 * KENUXA Purchasing Power Pricing — Affordability Engine
 * Module 37: Country Multipliers, Regional Pricing Rules, Inflation Adjustments
 *
 * Goal: Mass adoption — not maximum extraction.
 * KENUX pricing must remain affordable in Ghana, Nigeria, Kenya,
 * Rwanda, Uganda, Tanzania, Malawi, Sierra Leone, South Africa, Ethiopia,
 * and all markets we operate in.
 *
 * KENUX is NOT cryptocurrency. KENUX is NOT speculative.
 * KENUX is KENUXA's native ecosystem utility currency.
 * Fixed base rate: 10 KENUX = GH₵ 1.00 (configurable via KENUX_PER_GHS)
 */

// ─── Economic Tiers ───────────────────────────────────────────
// Based on IMF World Economic Outlook GDP per capita tiers (PPP-adjusted)
// Tier 1 = most affordable / lowest purchasing power
// Tier 4 = highest purchasing power in our market
export type EconomicTier = 1 | 2 | 3 | 4;

// ─── Country Pricing Profiles ─────────────────────────────────
export interface CountryPricingProfile {
  code:           string;       // ISO 3166-1 alpha-2
  name:           string;
  currency:       string;       // ISO 4217
  tier:           EconomicTier;
  pppMultiplier:  number;       // 1.0 = same as GH₵ base; < 1.0 = more affordable
  gdpPerCapitaUSD: number;      // approximate for reference
  subscriptionGHS: number;      // monthly Business plan price in GHS equiv.
  kenuxPerGHS:    number;       // KENUX per local-currency GHS equivalent
  minTopUpGHS:    number;       // minimum wallet top-up in GHS equivalent
  active:         boolean;      // currently live
}

export const COUNTRY_PRICING: Record<string, CountryPricingProfile> = {
  GH: {
    code: "GH", name: "Ghana", currency: "GHS",
    tier: 2, pppMultiplier: 1.00, gdpPerCapitaUSD: 2_400,
    subscriptionGHS: 149, kenuxPerGHS: 10, minTopUpGHS: 5,
    active: true,
  },
  NG: {
    code: "NG", name: "Nigeria", currency: "NGN",
    tier: 2, pppMultiplier: 0.85, gdpPerCapitaUSD: 2_100,
    subscriptionGHS: 127, kenuxPerGHS: 10, minTopUpGHS: 4,
    active: false, // Coming soon
  },
  KE: {
    code: "KE", name: "Kenya", currency: "KES",
    tier: 2, pppMultiplier: 0.90, gdpPerCapitaUSD: 2_100,
    subscriptionGHS: 134, kenuxPerGHS: 10, minTopUpGHS: 4,
    active: false,
  },
  RW: {
    code: "RW", name: "Rwanda", currency: "RWF",
    tier: 1, pppMultiplier: 0.70, gdpPerCapitaUSD: 900,
    subscriptionGHS: 104, kenuxPerGHS: 12, minTopUpGHS: 3,
    active: false,
  },
  UG: {
    code: "UG", name: "Uganda", currency: "UGX",
    tier: 1, pppMultiplier: 0.65, gdpPerCapitaUSD: 800,
    subscriptionGHS: 97, kenuxPerGHS: 12, minTopUpGHS: 3,
    active: false,
  },
  TZ: {
    code: "TZ", name: "Tanzania", currency: "TZS",
    tier: 1, pppMultiplier: 0.68, gdpPerCapitaUSD: 1_200,
    subscriptionGHS: 101, kenuxPerGHS: 12, minTopUpGHS: 3,
    active: false,
  },
  MW: {
    code: "MW", name: "Malawi", currency: "MWK",
    tier: 1, pppMultiplier: 0.45, gdpPerCapitaUSD: 600,
    subscriptionGHS: 67, kenuxPerGHS: 14, minTopUpGHS: 2,
    active: false,
  },
  SL: {
    code: "SL", name: "Sierra Leone", currency: "SLL",
    tier: 1, pppMultiplier: 0.50, gdpPerCapitaUSD: 700,
    subscriptionGHS: 75, kenuxPerGHS: 14, minTopUpGHS: 2,
    active: false,
  },
  ZA: {
    code: "ZA", name: "South Africa", currency: "ZAR",
    tier: 3, pppMultiplier: 1.20, gdpPerCapitaUSD: 7_000,
    subscriptionGHS: 179, kenuxPerGHS: 8, minTopUpGHS: 8,
    active: false,
  },
  ET: {
    code: "ET", name: "Ethiopia", currency: "ETB",
    tier: 1, pppMultiplier: 0.55, gdpPerCapitaUSD: 1_000,
    subscriptionGHS: 82, kenuxPerGHS: 14, minTopUpGHS: 2,
    active: false,
  },
  CI: {
    code: "CI", name: "Côte d'Ivoire", currency: "XOF",
    tier: 2, pppMultiplier: 0.88, gdpPerCapitaUSD: 2_500,
    subscriptionGHS: 131, kenuxPerGHS: 10, minTopUpGHS: 4,
    active: false,
  },
  SN: {
    code: "SN", name: "Senegal", currency: "XOF",
    tier: 2, pppMultiplier: 0.82, gdpPerCapitaUSD: 1_700,
    subscriptionGHS: 122, kenuxPerGHS: 10, minTopUpGHS: 4,
    active: false,
  },
  CM: {
    code: "CM", name: "Cameroon", currency: "XAF",
    tier: 2, pppMultiplier: 0.80, gdpPerCapitaUSD: 1_600,
    subscriptionGHS: 119, kenuxPerGHS: 10, minTopUpGHS: 4,
    active: false,
  },
  ZM: {
    code: "ZM", name: "Zambia", currency: "ZMW",
    tier: 2, pppMultiplier: 0.78, gdpPerCapitaUSD: 1_200,
    subscriptionGHS: 116, kenuxPerGHS: 10, minTopUpGHS: 3,
    active: false,
  },
};

// ─── Pricing Engine ───────────────────────────────────────────

const BASE_KENUX_PER_GHS = parseInt(
  typeof process !== "undefined" ? (process.env.KENUX_PER_GHS ?? "10") : "10",
  10
);

/**
 * Get the country pricing profile, defaulting to Ghana if not found.
 */
export function getCountryPricing(countryCode: string): CountryPricingProfile {
  return COUNTRY_PRICING[countryCode.toUpperCase()] ?? COUNTRY_PRICING["GH"]!;
}

/**
 * Calculate KENUX for a given GHS-equivalent amount, adjusted for country.
 * KENUX is a utility currency — the rate is fixed, but affordability
 * multipliers ensure pricing is accessible in lower-income markets.
 */
export function calcKenuxAmount(
  amountGHS: number,
  countryCode = "GH"
): number {
  const profile = getCountryPricing(countryCode);
  // Apply affordability multiplier — lower-income markets get more KENUX per GHS
  const effectiveRate = Math.round(profile.kenuxPerGHS * (BASE_KENUX_PER_GHS / 10));
  return Math.floor(amountGHS * effectiveRate);
}

/**
 * Get the subscription price for a plan in the user's country.
 * Returns GHS equivalent — actual payment in local currency at live FX.
 */
export function getSubscriptionPrice(
  plan: "free" | "business" | "enterprise",
  countryCode = "GH"
): number {
  const profile = getCountryPricing(countryCode);
  if (plan === "free") return 0;
  if (plan === "enterprise") return 0; // Custom pricing
  // Business plan with PPP adjustment
  return Math.round(149 * profile.pppMultiplier);
}

/**
 * Get plan features by tier — some premium features unlocked earlier
 * in lower-tier markets to drive adoption.
 */
export function getPlanTierBonus(tier: EconomicTier): string[] {
  if (tier === 1) return ["Extra 200 KENUX/month", "Free AI queries (50/month)", "Reduced marketplace fee (1%)"];
  if (tier === 2) return ["Extra 100 KENUX/month", "Free AI queries (25/month)"];
  return [];
}

/**
 * Format a price for display in local currency.
 * Users never see USD — they see local currency or KENUX.
 */
export function formatLocalPrice(
  ghsAmount: number,
  countryCode = "GH",
  fxRates?: Record<string, number>
): string {
  const profile = getCountryPricing(countryCode);

  if (profile.currency === "GHS") {
    return `GH₵ ${ghsAmount.toLocaleString("en-GH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  // Convert via USD (treasury normalization — users never see USD)
  const ghsPerUsd = fxRates?.GHS ?? 14.5;
  const localPerUsd = fxRates?.[profile.currency] ?? 1;
  const localAmount = (ghsAmount / ghsPerUsd) * localPerUsd;

  const SYMBOLS: Record<string, string> = {
    NGN: "₦", KES: "KSh", ZAR: "R", ETB: "Br", UGX: "USh",
    TZS: "TSh", RWF: "RF", XOF: "CFA", XAF: "CFA", ZMW: "ZK",
    MWK: "MK", SLL: "Le",
  };

  const symbol = SYMBOLS[profile.currency] ?? profile.currency + " ";
  return `${symbol}${localAmount.toLocaleString("en", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

/**
 * Get KENUX bundle options for a country — affordability-adjusted pricing.
 * Mass-adoption packages designed for each economic tier.
 */
export function getKenuxBundles(countryCode = "GH"): Array<{
  ghsAmount: number;
  kenuxAmount: number;
  label: string;
  popular?: boolean;
}> {
  const profile = getCountryPricing(countryCode);
  const minGHS = profile.minTopUpGHS;

  // Affordability-adjusted tiers
  const tiers = [
    { ghs: minGHS,        label: "Starter" },
    { ghs: minGHS * 5,    label: "Basic" },
    { ghs: minGHS * 10,   label: "Standard" },
    { ghs: minGHS * 20,   label: "Value",   popular: true },
    { ghs: minGHS * 50,   label: "Premium" },
    { ghs: minGHS * 100,  label: "Enterprise" },
  ];

  return tiers.map((t) => {
    const bundle: { ghsAmount: number; kenuxAmount: number; label: string; popular?: boolean } = {
      ghsAmount:   t.ghs,
      kenuxAmount: calcKenuxAmount(t.ghs, countryCode),
      label:       t.label,
    };
    if (t.popular) bundle.popular = true;
    return bundle;
  });
}

/**
 * Validate that a KENUX transaction amount is within bounds.
 * Prevents under-pricing and over-pricing exploits.
 */
export function validateKenuxAmount(
  kenuxAmount: number,
  countryCode = "GH"
): { valid: boolean; reason?: string } {
  const profile = getCountryPricing(countryCode);
  const minKenux = calcKenuxAmount(profile.minTopUpGHS, countryCode);
  const maxKenux = calcKenuxAmount(100000, countryCode); // GH₵ 100,000 max

  if (kenuxAmount < minKenux) {
    return { valid: false, reason: `Minimum purchase is ${minKenux.toLocaleString()} KENUX` };
  }
  if (kenuxAmount > maxKenux) {
    return { valid: false, reason: `Maximum purchase is ${maxKenux.toLocaleString()} KENUX per transaction` };
  }
  return { valid: true };
}

/**
 * Calculate marketplace listing fee for a country.
 * Tier 1 countries pay less to encourage adoption.
 */
export function calcAffordableMarketplaceFee(
  saleAmountGHS: number,
  countryCode = "GH"
): number {
  const profile = getCountryPricing(countryCode);
  // Base: 2.5% — reduced for lower-tier markets
  const rates: Record<EconomicTier, number> = {
    1: 0.015, // 1.5% for Tier 1 (lowest income)
    2: 0.020, // 2.0% for Tier 2
    3: 0.025, // 2.5% base for Tier 3
    4: 0.030, // 3.0% for highest income (premium market)
  };
  const rate = rates[profile.tier] ?? 0.025;
  return Math.round(saleAmountGHS * rate * 100) / 100;
}
