/**
 * KENUXA OPS — Auth Bridge
 *
 * POST /api/ops/auth  { action: "login" | "logout" | "validate" | "session" }
 *
 * OPS calls CORE for auth operations so identity is centralized.
 */

import { NextRequest } from "next/server";
import { ok, problem } from "@/lib/api";
import { login, signup, requestPasswordReset, credentialsSchema, signupSchema } from "@/lib/auth/service";
import { verifyAccessToken } from "@/lib/auth/tokens";
import { logAudit } from "@/lib/audit/service";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const { action, ...rest } = body;

  if (action === "login") {
    try {
      const result = await login(credentialsSchema.parse(rest));
      logAudit({ actorId: "ops_service", action: "auth.login", resourceType: "session", actorType: "service", status: "success" });
      return ok(result);
    } catch (err) {
      logAudit({ actorId: "ops_service", action: "auth.login", resourceType: "session", actorType: "service", status: "failure" });
      return problem(err instanceof Error ? err.message : "Login failed", 401);
    }
  }

  if (action === "signup") {
    try {
      const result = await signup(signupSchema.parse(rest));
      logAudit({ actorId: "ops_service", action: "auth.signup", resourceType: "user", actorType: "service", status: "success" });
      return ok(result);
    } catch (err) {
      return problem(err instanceof Error ? err.message : "Signup failed", 400);
    }
  }

  if (action === "validate") {
    const token = rest.token as string;
    if (!token) return problem("Token required", 400);
    try {
      const claims = await verifyAccessToken(token);
      return ok({ valid: true, claims });
    } catch {
      return ok({ valid: false });
    }
  }

  if (action === "reset_password") {
    await requestPasswordReset({ email: rest.email as string });
    return ok({ accepted: true });
  }

  return problem(`Unknown action: ${action}`, 400);
}

export async function GET(request: NextRequest) {
  // Token introspection endpoint
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return problem("Authorization required", 401);

  try {
    const claims = await verifyAccessToken(token);
    return ok({ valid: true, userId: claims.sub, organizationId: claims.organizationId, role: claims.role });
  } catch {
    return ok({ valid: false });
  }
}
