/**
 * KENUXA CORE — KENUX Wallet API
 *
 * GET  /api/wallet?action=balance                         — get balance
 * GET  /api/wallet?action=transactions&limit=20&offset=0  — list transactions
 * GET  /api/wallet?action=stats                           — 30-day stats
 * POST /api/wallet  { action: "credit", ... }             — credit KENUX
 * POST /api/wallet  { action: "debit", ... }              — debit KENUX
 * POST /api/wallet  { action: "transfer", ... }           — peer transfer
 * POST /api/wallet  { action: "welcome_bonus" }           — one-time bonus
 * POST /api/wallet  { action: "charge_ai" }               — charge AI usage
 */

import { NextRequest } from "next/server";
import { ok, created, problem, getApiContext } from "@/lib/api";
import {
  getOrCreateWallet,
  getWalletBalance,
  grantWelcomeBonus,
  creditWallet,
  debitWallet,
  transferKenux,
  listTransactions,
  getTransactionStats,
  chargeAiUsage,
  creditSchema,
  debitSchema,
  transferSchema,
} from "@/lib/wallet/service";
import { logAudit } from "@/lib/audit/service";

export async function GET(request: NextRequest) {
  const ctx    = await getApiContext(request);
  const params = request.nextUrl.searchParams;
  const action = params.get("action") ?? "balance";

  if (action === "balance") {
    const wallet = await getOrCreateWallet(ctx.userId, ctx.organizationId);
    return ok(wallet);
  }

  if (action === "transactions") {
    const limit  = Number(params.get("limit") ?? 20);
    const offset = Number(params.get("offset") ?? 0);
    const type   = params.get("type") ?? undefined;
    return ok(await listTransactions(ctx.userId, limit, offset, type));
  }

  if (action === "stats") {
    return ok(await getTransactionStats(ctx.userId));
  }

  if (action === "wallet") {
    return ok(await getWalletBalance(ctx.userId));
  }

  return problem(`Unknown action: ${action}`, 400);
}

export async function POST(request: NextRequest) {
  const ctx  = await getApiContext(request);
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const { action, ...rest } = body;

  if (action === "welcome_bonus" || !action) {
    const result = await grantWelcomeBonus(ctx.userId);
    logAudit({
      organizationId: ctx.organizationId,
      userId:         ctx.userId,
      actorId:        ctx.userId,
      action:         "wallet.welcome_bonus",
      resourceType:   "wallet",
      resourceId:     ctx.userId,
      status:         result.granted ? "success" : "failure",
    });
    return ok(result);
  }

  if (action === "credit") {
    const data = await creditWallet(creditSchema.parse({ ...rest, userId: ctx.userId, organizationId: ctx.organizationId }));
    logAudit({ organizationId: ctx.organizationId, userId: ctx.userId, actorId: ctx.userId, action: "wallet.credit", resourceType: "wallet", status: "success", metadata: { amount: rest.amount } });
    return created(data);
  }

  if (action === "debit") {
    try {
      const data = await debitWallet(debitSchema.parse({ ...rest, userId: ctx.userId, organizationId: ctx.organizationId }));
      logAudit({ organizationId: ctx.organizationId, userId: ctx.userId, actorId: ctx.userId, action: "wallet.debit", resourceType: "wallet", status: "success", metadata: { amount: rest.amount } });
      return created(data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Debit failed";
      const code = (err as Error & { code?: string }).code;
      return problem(msg, code === "INSUFFICIENT_BALANCE" ? 402 : 500);
    }
  }

  if (action === "transfer") {
    try {
      const input  = transferSchema.parse({ ...rest, fromUserId: ctx.userId });
      const result = await transferKenux(input);
      logAudit({ organizationId: ctx.organizationId, userId: ctx.userId, actorId: ctx.userId, action: "wallet.transfer", resourceType: "wallet", status: "success", metadata: { amount: input.amount, to: input.toUserId } });
      return ok(result);
    } catch (err) {
      const msg  = err instanceof Error ? err.message : "Transfer failed";
      const code = (err as Error & { code?: string }).code;
      return problem(msg, code === "INSUFFICIENT_BALANCE" ? 402 : 500);
    }
  }

  if (action === "charge_ai") {
    const costUsd = Number(rest.costUsd ?? 0);
    const userId  = (rest.userId as string) ?? ctx.userId;
    const orgId   = (rest.organizationId as string) ?? ctx.organizationId ?? "";
    const result  = await chargeAiUsage(userId, orgId, costUsd, rest.metadata as Record<string, unknown>);
    return ok(result);
  }

  return problem(`Unknown action: ${action}`, 400);
}
