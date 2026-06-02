import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * Nightly batch credit score computation for all users.
 * Called by Vercel Cron at 02:00 UTC daily.
 * Secured by CRON_SECRET.
 */
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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
  const startedAt = new Date();

  // Fetch all user IDs that have not had credit computed in 24 hours
  const cutoff = new Date(Date.now() - 23 * 60 * 60 * 1000).toISOString();
  const { data: users } = await supabase
    .from("user_profiles")
    .select("id")
    .order("created_at", { ascending: true })
    .limit(500); // Process up to 500 per run

  if (!users || users.length === 0) {
    return NextResponse.json({ ok: true, processed: 0, message: "No users to process" });
  }

  // Get users whose scores need refresh
  const { data: stale } = await supabase
    .from("credit_profiles")
    .select("user_id")
    .lt("last_calculated", cutoff);

  const staleIds = new Set((stale ?? []).map((r) => r.user_id));

  // Also include users with no credit profile
  const { data: noProfile } = await supabase
    .from("user_profiles")
    .select("id")
    .not("id", "in", `(${users.map((u) => `'${u.id}'`).join(",") || "'00000000-0000-0000-0000-000000000000'"})`)
    .limit(100);

  const targetIds = [
    ...users.filter((u) => staleIds.has(u.id)).map((u) => u.id),
    ...(noProfile ?? []).map((u) => u.id),
  ].slice(0, 200); // Cap batch at 200

  let processed = 0;
  let errors = 0;

  const origin = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3002";

  for (const userId of targetIds) {
    try {
      const res = await fetch(`${origin}/api/credit/compute`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // Use service role to bypass auth for batch
          "X-Cron-Secret": process.env.CRON_SECRET ?? "",
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
