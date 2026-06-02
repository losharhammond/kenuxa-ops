import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  // Support both ?next= (Supabase default) and ?redirect= (our login page)
  // SECURITY: only allow relative paths to prevent open redirect attacks
  const rawNext = searchParams.get("redirect") ?? searchParams.get("next") ?? "/dashboard";
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/dashboard";

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user) {
    return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
  }

  // Check if this is a new user (no profile yet) — if so, provision wallet + profile
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("id")
    .eq("id", data.user.id)
    .single();

  if (!profile) {
    // New OAuth user — create profile + provision wallet idempotently
    const displayName = data.user.user_metadata?.full_name
      ?? data.user.user_metadata?.name
      ?? data.user.email?.split("@")[0]
      ?? "User";

    await supabase.from("user_profiles").upsert({
      id: data.user.id,
      email: data.user.email,
      full_name: displayName,
      role: "customer",
      onboarding_completed: false,
    }, { onConflict: "id", ignoreDuplicates: true });

    // Provision wallet + rewards account — non-blocking (best effort)
    // The provision API route handles idempotency via upsert
    const provisionRes = await fetch(`${origin}/api/onboarding/provision`, {
      method: "POST",
      headers: { Cookie: request.headers.get("cookie") ?? "" },
    });
    // If provision fails, user still logs in — they get provisioned on next session
    if (!provisionRes.ok) {
      console.error("[auth/callback] provision failed:", await provisionRes.text());
    }

    // New users go to onboarding flow
    return NextResponse.redirect(`${origin}/dashboard/onboarding`);
  }

  return NextResponse.redirect(`${origin}${next}`);
}
