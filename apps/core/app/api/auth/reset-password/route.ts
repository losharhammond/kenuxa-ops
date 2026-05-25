import { NextRequest } from "next/server";
import { ok, problem } from "@/lib/api";
import {
  requestPasswordReset, resetPasswordSchema,
  confirmPasswordReset, confirmResetSchema,
} from "@/lib/auth/service";

export async function POST(request: NextRequest) {
  const body = await request.json() as Record<string, unknown>;

  // If body has `token` + `password` → confirm the reset
  if ("token" in body && "password" in body) {
    const parsed = confirmResetSchema.safeParse(body);
    if (!parsed.success) return problem("Invalid request", 400);
    return ok(await confirmPasswordReset(parsed.data));
  }

  // Otherwise → request a reset email
  const parsed = resetPasswordSchema.safeParse(body);
  if (!parsed.success) return problem("Invalid request", 400);
  return ok(await requestPasswordReset(parsed.data));
}
