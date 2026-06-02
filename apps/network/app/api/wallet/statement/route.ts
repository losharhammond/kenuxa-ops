/**
 * GET /api/wallet/statement
 * Full downloadable wallet statement (CSV) for authenticated user.
 * Query params: from=YYYY-MM-DD&to=YYYY-MM-DD
 */
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function GET(req: NextRequest) {
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

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from") ?? new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];
  const to   = searchParams.get("to")   ?? new Date().toISOString().split("T")[0];

  const { data: txs, error } = await supabase
    .from("wallet_transactions")
    .select("created_at, type, amount, currency, description, status, reference, provider")
    .eq("user_id", user.id)
    .gte("created_at", `${from}T00:00:00Z`)
    .lte("created_at", `${to}T23:59:59Z`)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = (txs ?? []);
  const header = "Date,Time,Type,Description,Amount (GHS),Currency,Status,Reference,Provider";
  const lines = rows.map((t) => {
    const d = new Date(t.created_at);
    const sign = t.type === "debit" ? "-" : "+";
    return [
      d.toLocaleDateString("en-GH"),
      d.toLocaleTimeString("en-GH"),
      t.type,
      `"${String(t.description ?? "").replace(/"/g, '""')}"`,
      `${sign}${Number(t.amount).toFixed(2)}`,
      t.currency ?? "GHS",
      t.status,
      t.reference ?? "",
      t.provider ?? "",
    ].join(",");
  });

  const csv = [header, ...lines].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type":        "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="kenuxa-statement-${from}-to-${to}.csv"`,
    },
  });
}
