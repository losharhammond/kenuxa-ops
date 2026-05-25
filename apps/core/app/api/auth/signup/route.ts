import { NextRequest } from "next/server";
import { created } from "@/lib/api";
import { signup, signupSchema } from "@/lib/auth/service";

export async function POST(request: NextRequest) {
  const body = signupSchema.parse(await request.json());
  return created(await signup(body));
}
