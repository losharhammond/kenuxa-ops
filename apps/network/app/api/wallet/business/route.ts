/**
 * GET  /api/wallet/business — get business wallet balance & recent txs
 * POST /api/wallet/business — provision a business wallet
 */
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

let _admin: SupabaseClient | null = null;
function getAdmin(): SupabaseClient {
  if (!_admin) {
    _admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }
  return _admin;
}

async function getUser() {
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
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const businessId = searchParams.get("business_id");
  if (!businessId) return NextResponse.json({ error: "business_id required" }, { status: 400 });

  // Verify user belongs to business
  const { data: member } = await getAdmin()
    .from("business_members")
    .select("role")
    .eq("business_id", businessId)
    .eq("user_id", user.id)
    .single();

  if (!member) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const [walletRes, txsRes] = await Promise.all([
    getAdmin()
      .from("business_wallets")
      .select("balance, currency, status, updated_at")
      .eq("business_id", businessId)
      .single(),
    getAdmin()
      .from("business_wallet_transactions")
      .select("id, type, amount, currency, description, status, reference, created_at")
      .eq("business_id", businessId)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  return NextResponse.json({
    wallet: walletRes.data ?? { balance: 0, currency: "GHS", status: "active", updated_at: new Date().toISOString() },
    transactions: txsRes.data ?? [],
  });
}

export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { business_id } = await req.json().catch(() => ({})) as { business_id?: string };
  if (!business_id) return NextResponse.json({ error: "business_id required" }, { status: 400 });

  // Verify ownership
  const { data: biz } = await getAdmin()
    .from("businesses")
    .select("id, name")
    .eq("id", business_id)
    .eq("owner_id", user.id)
    .single();

  if (!biz) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { error } = await getAdmin()
    .from("business_wallets")
    .upsert({ business_id, balance: 0, currency: "GHS", status: "active" }, { onConflict: "business_id" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
