/**
 * KENUXA Platform Revenue Tracker
 * Call this after any monetizable event to record platform revenue.
 * All revenue flows through this single entry point for auditability.
 */

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export type RevenueSource =
  | "subscription"
  | "marketplace_fee"
  | "transaction_fee"
  | "advertising"
  | "kenux_purchase"
  | "ai_usage"
  | "api_usage"
  | "delivery_fee"
  | "escrow_fee"
  | "settlement_fee"
  | "lending_referral"
  | "insurance_referral"
  | "credit_assessment"
  | "featured_listing"
  | "enterprise_license";

export interface TrackRevenueInput {
  source:      RevenueSource;
  amount:      number;         // GHS
  userId?:     string | undefined;
  businessId?: string | undefined;
  reference?:  string | undefined;
  metadata?:   Record<string, unknown> | undefined;
}

/**
 * Records platform revenue. Non-throwing — errors are swallowed to avoid
 * breaking the primary operation.
 */
export async function trackRevenue(input: TrackRevenueInput): Promise<void> {
  try {
    // Map source to the CHECK constraint values in the DB
    const revenueTypeMap: Record<RevenueSource, string> = {
      subscription:        "subscription",
      marketplace_fee:     "marketplace_fee",
      transaction_fee:     "transaction_fee",
      advertising:         "advertising",
      kenux_purchase:      "kenux_purchase",
      ai_usage:            "ai_usage",
      api_usage:           "api_usage",
      delivery_fee:        "delivery_fee",
      escrow_fee:          "escrow_fee",
      settlement_fee:      "settlement_fee",
      lending_referral:    "loan_referral",
      insurance_referral:  "insurance",
      credit_assessment:   "enterprise",
      featured_listing:    "advertising",
      enterprise_license:  "enterprise",
    };

    await supabase.from("platform_revenue").insert({
      revenue_type: revenueTypeMap[input.source] ?? "transaction_fee",
      amount:       input.amount,
      user_id:      input.userId,
      business_id:  input.businessId,
      reference:    input.reference ?? `REV-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`,
      metadata:     input.metadata ?? {},
      currency:     "GHS",
      status:       "settled",
      created_at:   new Date().toISOString(),
    });
  } catch {
    // Non-critical — never block the primary operation
  }
}

/**
 * Calculate marketplace fee (5% default, configurable per category).
 */
export function calcMarketplaceFee(orderAmount: number, category?: string): number {
  const rates: Record<string, number> = {
    digital:    0.08,  // 8% for digital goods
    service:    0.10,  // 10% for services
    physical:   0.05,  // 5% for physical goods
    wholesale:  0.03,  // 3% for B2B/wholesale
  };
  const rate = (category && rates[category]) ? rates[category]! : 0.05;
  return Math.round(orderAmount * rate * 100) / 100;
}

/**
 * Calculate transaction fee (1.5% + GHS 0.50 fixed).
 */
export function calcTransactionFee(amount: number): number {
  return Math.round((amount * 0.015 + 0.50) * 100) / 100;
}

/**
 * Calculate KENUX purchase revenue.
 * User pays GHS → platform gets full GHS amount (KENUX minted at no cost).
 */
export function calcKenuxRevenue(amountGHS: number): number {
  return amountGHS; // 100% margin on KENUX sales
}
