/**
 * @kenuxa/sdk — KENUX Wallet Module
 *
 * Interact with the KENUX token economy from any product.
 *
 * @example
 * ```ts
 * import { WalletClient } from "@kenuxa/sdk/wallet";
 *
 * const wallet = new WalletClient({ coreUrl: "https://core.kenuxa.io", token: "...", app: "reach" });
 * const balance = await wallet.getBalance();
 * await wallet.chargeAiUsage(0.005); // $0.005
 * ```
 */

import { KenuxaClient } from "./client.js";
import type { KenuxaConfig, KenuxaResponse, WalletBalance, WalletTransaction } from "./types.js";

export interface TransferRequest {
  toUserId:    string;
  amount:      number;
  description?: string;
  reference?:  string;
}

export interface ChargeRequest {
  amount:      number;
  type:        "ai_usage" | "automation_usage" | "api_usage" | "spend";
  description: string;
  reference?:  string;
  metadata?:   Record<string, unknown>;
}

export class WalletClient extends KenuxaClient {
  constructor(config: KenuxaConfig) {
    super(config);
  }

  async getBalance(): Promise<KenuxaResponse<WalletBalance>> {
    return this.get("/api/wallet", { action: "balance" });
  }

  async getWallet(): Promise<KenuxaResponse<{ id: string; balance: number; lifetime_earned: number; lifetime_spent: number }>> {
    return this.get("/api/wallet", { action: "wallet" });
  }

  async listTransactions(options: { limit?: number; offset?: number; type?: string } = {}): Promise<KenuxaResponse<{ transactions: WalletTransaction[]; total: number }>> {
    return this.get("/api/wallet", { action: "transactions", ...options });
  }

  async getStats(): Promise<KenuxaResponse<{ total_in: number; total_out: number; net: number; by_type: Record<string, number> }>> {
    return this.get("/api/wallet", { action: "stats" });
  }

  async credit(req: ChargeRequest): Promise<KenuxaResponse<unknown>> {
    return this.post("/api/wallet", { action: "credit", ...req });
  }

  async debit(req: ChargeRequest): Promise<KenuxaResponse<unknown>> {
    return this.post("/api/wallet", { action: "debit", ...req });
  }

  async transfer(req: TransferRequest): Promise<KenuxaResponse<unknown>> {
    return this.post("/api/wallet", { action: "transfer", ...req });
  }

  async claimWelcomeBonus(): Promise<KenuxaResponse<{ granted: boolean; amount?: number }>> {
    return this.post("/api/wallet", { action: "welcome_bonus" });
  }

  /** Charge AI usage cost (in USD) — converts to KENUX automatically */
  async chargeAiUsage(costUsd: number, metadata?: Record<string, unknown>): Promise<KenuxaResponse<unknown>> {
    return this.post("/api/wallet", { action: "charge_ai", costUsd, metadata });
  }
}
