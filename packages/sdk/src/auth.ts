/**
 * @kenuxa/sdk — Auth Module
 *
 * Handles authentication against KENUXA CORE.
 * Used by all ecosystem products (REACH, OPS, ZURIA, Academy).
 *
 * @example
 * ```ts
 * import { AuthClient } from "@kenuxa/sdk/auth";
 *
 * const auth = new AuthClient({ coreUrl: "https://core.kenuxa.io", app: "ops" });
 * const { data } = await auth.login({ email: "user@example.com", password: "..." });
 * auth.storeTokens(data);
 * ```
 */

import { KenuxaClient } from "./client.js";
import type { KenuxaConfig, KenuxaResponse } from "./types.js";

export interface LoginRequest  { email: string; password: string; }
export interface SignupRequest { email: string; password: string; fullName: string; organizationName?: string; }
export interface AuthTokens    { accessToken: string; refreshToken: string; tokenType: string; expiresIn: number; }
export interface TokenClaims   { valid: boolean; userId?: string; organizationId?: string; role?: string; }

export class AuthClient extends KenuxaClient {
  constructor(config: KenuxaConfig) {
    super(config);
  }

  async login(creds: LoginRequest): Promise<KenuxaResponse<AuthTokens>> {
    return this.post<AuthTokens>("/api/auth/login", creds);
  }

  async signup(data: SignupRequest): Promise<KenuxaResponse<AuthTokens>> {
    return this.post<AuthTokens>("/api/auth/signup", data);
  }

  async logout(): Promise<KenuxaResponse<{ success: boolean }>> {
    return this.post("/api/auth/logout");
  }

  async requestPasswordReset(email: string): Promise<KenuxaResponse<{ accepted: boolean }>> {
    return this.post("/api/auth/reset-password", { email });
  }

  async validateToken(token: string): Promise<KenuxaResponse<TokenClaims>> {
    return this.post("/api/ops/auth", { action: "validate", token });
  }

  /** Store tokens in localStorage (browser) or memory (Node.js) */
  storeTokens(tokens: AuthTokens, storage: "localStorage" | "memory" = "localStorage"): void {
    if (storage === "localStorage" && typeof localStorage !== "undefined") {
      localStorage.setItem("kenuxa_access_token", tokens.accessToken);
      localStorage.setItem("kenuxa_refresh_token", tokens.refreshToken);
      localStorage.setItem("kenuxa_token_expiry", String(Date.now() + tokens.expiresIn * 1000));
    }
  }

  getStoredToken(): string | null {
    if (typeof localStorage === "undefined") return null;
    const expiry = Number(localStorage.getItem("kenuxa_token_expiry") ?? 0);
    if (Date.now() > expiry) return null;
    return localStorage.getItem("kenuxa_access_token");
  }

  clearTokens(): void {
    if (typeof localStorage !== "undefined") {
      localStorage.removeItem("kenuxa_access_token");
      localStorage.removeItem("kenuxa_refresh_token");
      localStorage.removeItem("kenuxa_token_expiry");
    }
  }

  isAuthenticated(): boolean {
    return this.getStoredToken() !== null;
  }
}
