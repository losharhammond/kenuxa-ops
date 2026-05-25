import { NextRequest } from "next/server";
import { ok } from "@/lib/api";
import { credentialsSchema, login } from "@/lib/auth/service";

export async function POST(request: NextRequest) {
  const body = credentialsSchema.parse(await request.json());
  return ok(await login(body));
}
