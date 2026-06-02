import { NextRequest, NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Nightly batch credit score computation for all users.
 * Called by Vercel Cron at 02:00 UTC daily.
 * Secured by CRON_SECRET.
 */
let _supabase: SupabaseClient | null = null;
function getSupabase(): SupabaseClient {
  if (!_supabase) {
    _supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }
  return _supabase;
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return runBatch();
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return runBatch();
}

async function runBatch() {
  const supabase = getSupabase();
  const startedAt = new Date();
  const cutoff = new Date(Date.now() - 23 * 60 * 60 * 1000).toISOString();

  // Fetch users whose credit score is stale (>23h old)
  const { data: stale } = await supabase
    .from("credit_profiles")
    .select("user_id")
    .lt("last_calculated", cutoff)
    .limit(150);

  // Fetch users who have no credit profile yet
  // Left-join approach: get user_profiles and exclude those already in credit_profiles
  const { data: existingProfiles } = await supabase
    .from("credit_profiles")
    .select("user_id")
    .limit(2000);

  const existingIds = new Set((existingProfiles ?? []).map((r) => r.user_id));

  const { data: allUsers } = await supabase
    .from("user_profiles")
    .select("id")
    .order("created_at", { ascending: true })
    .limit(500);

  const noProfileIds = (allUsers ?? [])
    .filter((u) => !existingIds.has(u.id))
    .map((u) => u.id)
    .slice(0, 100);

  const staleIds = (stale ?? []).map((r) => r.user_id);

  // Deduplicate
  const seen = new Set<string>();
  const targetIds: string[] = [];
  for (const id of [...staleIds, ...noProfileIds]) {
    if (!seen.has(id)) { seen.add(id); targetIds.push(id); }
    if (targetIds.length >= 200) break;
  }

  if (targetIds.length === 0) {
    return NextResponse.json({ ok: true, processed: 0, message: "All credit scores are current" });
  }

  let processed = 0;
  let errors = 0;

  const origin = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3002";

  for (const userId of targetIds) {
    try {
      const res = await fetch(`${origin}/api/credit/compute`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.CRON_SECRET ?? ""}`,
        },
        body: JSON.stringify({ user_id: userId }),
      });
      if (res.ok) processed++;
      else errors++;
    } catch {
      errors++;
    }
  }

  // Log batch run
  await supabase.from("audit_logs").insert({
    action: `credit_batch_run: processed=${processed} errors=${errors}`,
    category: "system",
    severity: errors > 0 ? "warning" : "info",
    actor: "cron",
    metadata: {
      processed,
      errors,
      target_count: targetIds.length,
      duration_ms: Date.now() - startedAt.getTime(),
    },
  });

  return NextResponse.json({
    ok: true,
    processed,
    errors,
    duration_ms: Date.now() - startedAt.getTime(),
    ran_at: startedAt.toISOString(),
  });
}
