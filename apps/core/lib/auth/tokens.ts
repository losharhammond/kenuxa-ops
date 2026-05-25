import { SignJWT, jwtVerify } from "jose";
import { requireEnv } from "@/lib/env";
import { Role } from "@/lib/types";

export interface AccessTokenClaims {
  sub: string;
  organizationId?: string;
  role: Role;
}

function secret() {
  return new TextEncoder().encode(requireEnv("JWT_SECRET"));
}

export async function createAccessToken(claims: AccessTokenClaims) {
  return new SignJWT({ organizationId: claims.organizationId, role: claims.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(claims.sub)
    .setIssuedAt()
    .setExpirationTime("15m")
    .sign(secret());
}

export async function createRefreshToken(userId: string) {
  return new SignJWT({ type: "refresh" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secret());
}

export async function verifyAccessToken(token: string): Promise<AccessTokenClaims> {
  const { payload } = await jwtVerify(token, secret());
  if (!payload.sub || !payload.role) {
    throw new Error("UNAUTHORIZED");
  }
  return {
    sub: payload.sub,
    organizationId: payload.organizationId as string | undefined,
    role: payload.role as Role
  };
}
