import { ok } from "@/lib/api";

export async function POST() {
  return ok({ revoked: true });
}
