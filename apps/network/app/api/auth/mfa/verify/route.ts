import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * MFA Verify â€” challenge + verify TOTP code.
 * POST /api/auth/mfa/verify
 * Body: { factorId: string, code: string }
 */
export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setAll: (items: any[]) => items.forEach(({ name, value, options }: any) => cookieStore.set(name, value, options)),
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({})) as { factorId?: string; code?: string };
  const { factorId, code } = body;

  if (!factorId || !code) {
    return NextResponse.json({ error: "factorId and code required" }, { status: 400 });
  }

  // Step 1: Create challenge
  const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId });
  if (challengeError) return NextResponse.json({ error: challengeError.message }, { status: 400 });

  // Step 2: Verify challenge
  const { error } = await supabase.auth.mfa.verify({
    factorId,
    challengeId: challenge.id,
    code,
  });

  if (error) {
    await supabase.from("security_events").insert({
      user_id:    user.id,
      event_type: "mfa_failed",
      severity:   "warning",
      metadata:   { factor_id: factorId },
    });

    return NextResponse.json({ error: "Invalid code" }, { status: 400 });
  }

  await supabase.from("security_events").insert({
    user_id:    user.id,
    event_type: "mfa_verified",
    severity:   "info",
    metadata:   { factor_id: factorId },
  });

  return NextResponse.json({ ok: true });
}

