import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Security Events API
 * GET  /api/security/events  â€” admin: list recent events
 * POST /api/security/events  â€” log a security event
 */

async function getUserFromCookies() {
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
  return user;
}

export async function GET(req: NextRequest) {
  const user = await getUserFromCookies();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await adminSupabase
    .from("user_profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const isAdmin = ["super_admin", "country_admin"].includes(
    (profile as { role?: string } | null)?.role ?? ""
  );

  const { searchParams } = req.nextUrl;
  const limit  = Math.min(parseInt(searchParams.get("limit") ?? "50"), 200);
  const userId = searchParams.get("user_id");

  let query = adminSupabase
    .from("security_events")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (!isAdmin) {
    query = query.eq("user_id", user.id);
  } else if (userId) {
    query = query.eq("user_id", userId);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ events: data });
}

export async function POST(req: NextRequest) {
  // Allow internal server-side event logging
  const cronSecret = req.headers.get("x-cron-secret");
  const isInternal = cronSecret === process.env.CRON_SECRET;

  let userId: string | null = null;

  if (!isInternal) {
    const user = await getUserFromCookies();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    userId = user.id;
  }

  const body = await req.json().catch(() => ({})) as {
    user_id?: string;
    event_type: string;
    severity?: string | undefined;
    ip_address?: string | undefined;
    user_agent?: string | undefined;
    metadata?: Record<string, unknown> | undefined;
  };

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    ?? req.headers.get("x-real-ip")
    ?? "unknown";

  const { error } = await adminSupabase.from("security_events").insert({
    user_id:    body.user_id ?? userId,
    event_type: body.event_type,
    severity:   body.severity ?? "info",
    ip_address: body.ip_address ?? ip,
    user_agent: body.user_agent ?? req.headers.get("user-agent"),
    metadata:   body.metadata,
    created_at: new Date().toISOString(),
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}

