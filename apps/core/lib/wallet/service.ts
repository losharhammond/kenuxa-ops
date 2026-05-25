/**
 * KENUXA CORE — KENUX Wallet Service
 *
 * Manages the KENUX token economy across the entire ecosystem.
 * All KENUXA products call CORE for wallet operations.
 *
 * KENUX is used for:
 *   - AI compute credits
 *   - Automation execution
 *   - Marketplace purchases
 *   - Subscription billing
 *   - Internal transfers
 *   - Rewards / referrals
 */

import { z } from "zod";
import { createSupabaseAdminClient, isSupabaseConfigured } from "@/lib/supabase";
import type { WalletTransactionType } from "@/lib/types";

// ─── Schemas ─────────────────────────────────────────────────────────────────

export const creditSchema = z.object({
  userId:         z.string().uuid(),
  organizationId: z.string().uuid().optional(),
  amount:         z.number().positive(),
  type:           z.enum(["purchase","earn","spend","transfer_in","transfer_out","refund",
    "welcome_bonus","subscription_credit","marketplace_sale","admin_grant","ai_usage",
    "automation_usage","api_usage"]),
  description:    z.string().min(1),
  reference:      z.string().optional(),
  metadata:       z.record(z.unknown()).default({}),
});

export const debitSchema = creditSchema.extend({
  type: z.enum(["spend","transfer_out","subscription_credit","marketplace_sale",
    "ai_usage","automation_usage","api_usage"]),
});

export const transferSchema = z.object({
  fromUserId:     z.string().uuid(),
  toUserId:       z.string().uuid(),
  organizationId: z.string().uuid().optional(),
  amount:         z.number().positive(),
  description:    z.string().optional(),
  reference:      z.string().optional(),
  metadata:       z.record(z.unknown()).default({}),
});

export const escrowCreateSchema = z.object({
  fromUserId:     z.string().uuid(),
  toUserId:       z.string().uuid().optional(),
  organizationId: z.string().uuid().optional(),
  amount:         z.number().positive(),
  purpose:        z.string().min(2),
  releaseCondition: z.string().optional(),
  metadata:       z.record(z.unknown()).default({}),
});

// ─── Mock data ────────────────────────────────────────────────────────────────

const MOCK_WALLET = {
  id: "wallet_demo",
  user_id: "usr_demo",
  balance: 12450.00,
  lifetime_earned: 25000.00,
  lifetime_spent: 12550.00,
  created_at: new Date(Date.now() - 86400_000 * 30).toISOString(),
  updated_at: new Date().toISOString(),
};

const MOCK_TRANSACTIONS = [
  { id: "tx_1", type: "welcome_bonus",   amount: 100,   description: "Welcome bonus",              created_at: new Date(Date.now() - 86400_000 * 30).toISOString() },
  { id: "tx_2", type: "earn",            amount: 500,   description: "Referral reward",             created_at: new Date(Date.now() - 86400_000 * 20).toISOString() },
  { id: "tx_3", type: "ai_usage",        amount: -25,   description: "AI request batch",            created_at: new Date(Date.now() - 86400_000 * 10).toISOString() },
  { id: "tx_4", type: "subscription_credit", amount: 200, description: "Pro plan monthly bonus",   created_at: new Date(Date.now() - 86400_000 * 5).toISOString() },
  { id: "tx_5", type: "automation_usage", amount: -50,  description: "Workflow execution x20",     created_at: new Date(Date.now() - 86400_000 * 2).toISOString() },
];

// ─── Wallet CRUD ──────────────────────────────────────────────────────────────

export async function getOrCreateWallet(userId: string, organizationId?: string) {
  if (!isSupabaseConfigured) return MOCK_WALLET;

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("kenux_wallets")
    .upsert({ user_id: userId, ...(organizationId ? { org_id: organizationId } : {}) }, { onConflict: "user_id" })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function getWalletBalance(userId: string) {
  if (!isSupabaseConfigured) return { balance: MOCK_WALLET.balance, lifetimeEarned: MOCK_WALLET.lifetime_earned, lifetimeSpent: MOCK_WALLET.lifetime_spent };

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("kenux_wallets")
    .select("balance, lifetime_earned, lifetime_spent")
    .eq("user_id", userId)
    .single();

  if (error) throw error;
  return { balance: data.balance, lifetimeEarned: data.lifetime_earned, lifetimeSpent: data.lifetime_spent };
}

export async function grantWelcomeBonus(userId: string) {
  if (!isSupabaseConfigured) return { granted: true, amount: 100 };

  const supabase = createSupabaseAdminClient();

  // Idempotency check
  const { data: existing } = await supabase
    .from("kenux_transactions")
    .select("id")
    .eq("user_id", userId)
    .eq("type", "welcome_bonus")
    .maybeSingle();

  if (existing) return { granted: false, reason: "Already claimed" };

  const { data, error } = await supabase.rpc("credit_kenux", {
    p_user_id: userId,
    p_amount:  100,
    p_type:    "welcome_bonus",
    p_desc:    "Welcome to KENUXA! 100 KENUX to get you started.",
    p_ref:     `WELCOME_${userId}`,
    p_meta:    {},
  });

  if (error) throw error;
  return { granted: true, amount: 100, transaction: data };
}

// ─── Credits + Debits ─────────────────────────────────────────────────────────

export async function creditWallet(rawInput: z.input<typeof creditSchema>) {
  const input = creditSchema.parse(rawInput);
  if (!isSupabaseConfigured) return { success: true, newBalance: MOCK_WALLET.balance + input.amount };

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.rpc("credit_kenux", {
    p_user_id: input.userId,
    p_amount:  input.amount,
    p_type:    input.type as WalletTransactionType,
    p_desc:    input.description,
    p_ref:     input.reference ?? null,
    p_meta:    input.metadata,
  });

  if (error) throw error;
  return data;
}

export async function debitWallet(rawInput: z.input<typeof debitSchema>) {
  const input = debitSchema.parse(rawInput);
  if (!isSupabaseConfigured) {
    if (MOCK_WALLET.balance < input.amount) throw new Error("Insufficient KENUX balance");
    return { success: true, newBalance: MOCK_WALLET.balance - input.amount };
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.rpc("debit_kenux", {
    p_user_id: input.userId,
    p_amount:  input.amount,
    p_type:    input.type as WalletTransactionType,
    p_desc:    input.description,
    p_ref:     input.reference ?? null,
    p_meta:    input.metadata,
  });

  if (error) {
    if (error.message.includes("Insufficient")) {
      const err = new Error(error.message) as Error & { code: string };
      err.code = "INSUFFICIENT_BALANCE";
      throw err;
    }
    throw error;
  }
  return data;
}

// ─── Transfers ────────────────────────────────────────────────────────────────

export async function transferKenux(rawInput: z.input<typeof transferSchema>) {
  const input = transferSchema.parse(rawInput);
  if (!isSupabaseConfigured) return { success: true, fromBalance: 12000, toBalance: 600 };

  const supabase = createSupabaseAdminClient();

  const [debit, credit] = await Promise.all([
    supabase.rpc("debit_kenux", {
      p_user_id: input.fromUserId,
      p_amount:  input.amount,
      p_type:    "transfer_out",
      p_desc:    input.description ?? "KENUX transfer",
      p_ref:     input.reference ?? null,
      p_meta:    { to_user: input.toUserId, ...input.metadata },
    }),
    supabase.rpc("credit_kenux", {
      p_user_id: input.toUserId,
      p_amount:  input.amount,
      p_type:    "transfer_in",
      p_desc:    input.description ?? "KENUX transfer",
      p_ref:     input.reference ?? null,
      p_meta:    { from_user: input.fromUserId, ...input.metadata },
    }),
  ]);

  if (debit.error) {
    const err = new Error(debit.error.message) as Error & { code?: string };
    if (debit.error.message.includes("Insufficient")) err.code = "INSUFFICIENT_BALANCE";
    throw err;
  }
  if (credit.error) throw credit.error;

  return { debit: debit.data, credit: credit.data };
}

// ─── Transactions ─────────────────────────────────────────────────────────────

export async function listTransactions(userId: string, limit = 20, offset = 0, type?: string) {
  if (!isSupabaseConfigured) return { transactions: MOCK_TRANSACTIONS, total: MOCK_TRANSACTIONS.length };

  const supabase = createSupabaseAdminClient();
  let query = supabase
    .from("kenux_transactions")
    .select("*", { count: "exact" })
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (type) query = query.eq("type", type);

  const { data, count, error } = await query;
  if (error) throw error;
  return { transactions: data ?? [], total: count ?? 0 };
}

export async function getTransactionStats(userId: string) {
  if (!isSupabaseConfigured) {
    return {
      total_in: 800, total_out: 75, net: 725,
      by_type: { earn: 500, welcome_bonus: 100, subscription_credit: 200, ai_usage: 25, automation_usage: 50 },
    };
  }

  const supabase = createSupabaseAdminClient();
  const since = new Date(Date.now() - 86400_000 * 30).toISOString();

  const { data } = await supabase
    .from("kenux_transactions")
    .select("type, amount")
    .eq("user_id", userId)
    .gte("created_at", since);

  const stats = (data ?? []).reduce((acc, tx) => {
    const t = tx.type as string;
    acc[t] = (acc[t] ?? 0) + Math.abs(tx.amount);
    return acc;
  }, {} as Record<string, number>);

  const totalIn  = (data ?? []).filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const totalOut = (data ?? []).filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);

  return { total_in: totalIn, total_out: totalOut, net: totalIn - totalOut, by_type: stats };
}

// ─── Escrow ───────────────────────────────────────────────────────────────────

export async function createEscrow(rawInput: z.input<typeof escrowCreateSchema>) {
  const input = escrowCreateSchema.parse(rawInput);
  if (!isSupabaseConfigured) return { id: `escrow_${Date.now()}`, status: "held", amount: input.amount };

  const supabase = createSupabaseAdminClient();

  // Debit from sender first
  await debitWallet({
    userId: input.fromUserId,
    amount: input.amount,
    type: "spend",
    description: `Escrow hold: ${input.purpose}`,
    metadata: { escrow_purpose: input.purpose },
  });

  const { data, error } = await supabase
    .from("wallet_escrows")
    .insert({
      from_user_id:      input.fromUserId,
      to_user_id:        input.toUserId,
      organization_id:   input.organizationId,
      amount:            input.amount,
      purpose:           input.purpose,
      release_condition: input.releaseCondition,
      metadata:          input.metadata,
    })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function releaseEscrow(escrowId: string, releasedBy: string) {
  if (!isSupabaseConfigured) return { released: true };

  const supabase = createSupabaseAdminClient();
  const { data: escrow, error: fetchErr } = await supabase
    .from("wallet_escrows")
    .select("*")
    .eq("id", escrowId)
    .eq("status", "held")
    .single();

  if (fetchErr || !escrow) throw new Error("Escrow not found or already released");
  if (!escrow.to_user_id) throw new Error("No recipient set for escrow");

  // Credit recipient
  await creditWallet({
    userId: escrow.to_user_id,
    amount: escrow.amount,
    type: "earn",
    description: `Escrow release: ${escrow.purpose}`,
    metadata: { escrow_id: escrowId, released_by: releasedBy },
  });

  const { data, error } = await supabase
    .from("wallet_escrows")
    .update({ status: "released", released_at: new Date().toISOString() })
    .eq("id", escrowId)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

// ─── Billing / AI Usage Charging ──────────────────────────────────────────────

export async function chargeAiUsage(userId: string, organizationId: string, costUsd: number, metadata: Record<string, unknown> = {}) {
  // Convert USD cost to KENUX (1 KENUX = $0.001)
  const kenuxAmount = Math.ceil(costUsd * 1000);
  if (kenuxAmount <= 0) return { charged: false, reason: "Below minimum charge" };

  return debitWallet({
    userId,
    organizationId,
    amount: kenuxAmount,
    type: "ai_usage",
    description: `AI usage: ${(costUsd * 100).toFixed(2)}¢`,
    metadata: { cost_usd: costUsd, ...metadata },
  }).catch(() => ({ charged: false, reason: "Insufficient balance" }));
}
