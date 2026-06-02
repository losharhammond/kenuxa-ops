/**
 * KENUXA — Developer API Key Management
 * POST   /api/developer/keys       — Create a new API key (server-side, cryptographically secure)
 * GET    /api/developer/keys       — List API keys for the authenticated user
 * DELETE /api/developer/keys?id=x  — Revoke an API key
 */
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { randomBytes, createHash } from "crypto";

async function makeServiceClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );
}

async function getUser() {
  const cookieStore = await cookies();
  const client = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setAll: (pairs: any[]) => pairs.forEach(({ name, value, options }: any) => cookieStore.set(name, value, options)),
      },
    }
  );
  const { data: { user }, error } = await client.auth.getUser();
  if (error || !user) return null;
  return user;
}

// ─── POST — Create API key ────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { name?: string; permissions?: string[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { name, permissions = [] } = body;
  if (!name?.trim()) return NextResponse.json({ error: "Key name is required" }, { status: 400 });

  const supabase = await makeServiceClient();

  // Limit to 10 active keys per user
  const { count } = await supabase
    .from("api_keys")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("is_active", true);

  if ((count ?? 0) >= 10) {
    return NextResponse.json({ error: "Maximum of 10 active API keys allowed" }, { status: 429 });
  }

  // Generate cryptographically secure key: kx_live_<32 random hex bytes>
  const rawKey = randomBytes(32).toString("hex");
  const plainKey = `kx_live_${rawKey}`;
  const keyPrefix = plainKey.slice(0, 16); // "kx_live_" + first 8 hex chars
  // Store SHA-256 hash only — plaintext is returned once and never persisted
  const keyHash = createHash("sha256").update(plainKey).digest("hex");

  const { data, error } = await supabase
    .from("api_keys")
    .insert({
      user_id: user.id,
      name: name.trim(),
      key_prefix: keyPrefix,
      key_hash: keyHash,
      permissions,
      is_active: true,
      calls_count: 0,
    })
    .select("id, name, key_prefix, permissions, is_active, calls_count, last_used_at, created_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Return plain key exactly ONCE — it cannot be recovered after this response
  return NextResponse.json({ key: data, plainKey }, { status: 201 });
}

// ─── GET — List API keys ──────────────────────────────────────────────────────
export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = await makeServiceClient();
  const { data, error } = await supabase
    .from("api_keys")
    .select("id, name, key_prefix, permissions, is_active, calls_count, last_used_at, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ keys: data ?? [] });
}

// ─── DELETE — Revoke API key ──────────────────────────────────────────────────
export async function DELETE(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Key ID required" }, { status: 400 });

  const supabase = await makeServiceClient();
  const { error } = await supabase
    .from("api_keys")
    .update({ is_active: false })
    .eq("id", id)
    .eq("user_id", user.id); // owner check — service role enforces this

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
