import { NextRequest, NextResponse } from "next/server";
import { ZodSchema, ZodError } from "zod";
import { verifyAccessToken } from "@/lib/auth/tokens";
import { ApiContext, Role } from "@/lib/types";

type Handler<T> = (request: NextRequest, context: ApiContext, body: T) => Promise<Response> | Response;

const roleRank: Record<Role, number> = {
  viewer: 1,
  contributor: 2,
  analyst: 3,
  operator: 4,
  organization_admin: 5,
  organization_owner: 6,
  super_admin: 7
};

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ data }, init);
}

export function created<T>(data: T) {
  return ok(data, { status: 201 });
}

export function problem(message: string, status = 400, details?: unknown) {
  return NextResponse.json({ error: { message, details } }, { status });
}

export async function parseBody<T>(request: NextRequest, schema: ZodSchema<T>): Promise<T> {
  const payload = await request.json().catch(() => ({}));
  return schema.parse(payload);
}

export function hasRole(actual: Role | undefined, required: Role) {
  if (!actual) return false;
  return roleRank[actual] >= roleRank[required];
}

export function withApi<T>(schema: ZodSchema<T>, handler: Handler<T>, requiredRole: Role = "viewer") {
  return async (request: NextRequest) => {
    try {
      const context = await getApiContext(request);
      if (!hasRole(context.role, requiredRole)) {
        return problem("Insufficient permissions", 403);
      }
      const body = request.method === "GET" ? schema.parse({}) : await parseBody(request, schema);
      return handler(request, context, body);
    } catch (error) {
      if (error instanceof ZodError) {
        return problem("Invalid request payload", 422, error.flatten());
      }
      if (error instanceof Error && error.message === "UNAUTHORIZED") {
        return problem("Authentication required", 401);
      }
      return problem(error instanceof Error ? error.message : "Unexpected API error", 500);
    }
  };
}

export async function getApiContext(request: NextRequest): Promise<ApiContext> {
  const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const organizationId = request.headers.get("x-organization-id") ?? undefined;
  if (bearer) {
    const token = await verifyAccessToken(bearer);
    return {
      userId: token.sub,
      organizationId: organizationId ?? token.organizationId,
      role: token.role
    };
  }
  const apiKey = request.headers.get("x-api-key");
  if (apiKey) {
    return {
      userId: "api_key",
      organizationId,
      role: "operator",
      apiKeyId: apiKey.slice(0, 12)
    };
  }
  throw new Error("UNAUTHORIZED");
}
