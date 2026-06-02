import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * MFA Unenroll â€” remove a TOTP factor.
 * DELETE /api/auth/mfa/unenroll
 * Body: { factorId: string }
 */
export async function DELETE(req: NextRequest) {
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

  const body = await req.json().catch(() => ({})) as { factorId?: string };
  if (!body.factorId) return NextResponse.json({ error: "factorId required" }, { status: 400 });

  const { error } = await supabase.auth.mfa.unenroll({ factorId: body.factorId });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await supabase.from("security_events").insert({
    user_id:    user.id,
    event_type: "mfa_unenrolled",
    severity:   "warning",
    metadata:   { factor_id: body.factorId },
  });

  return NextResponse.json({ ok: true });
}

