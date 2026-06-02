import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /api/kyc/status
 * Returns the KYC status for the authenticated user.
 */
export async function GET() {
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

  const { data: docs } = await adminSupabase
    .from("kyc_documents")
    .select("id, document_type, side, status, submitted_at, reviewed_at, rejection_reason")
    .eq("user_id", user.id)
    .order("submitted_at", { ascending: false });

  const approved = (docs ?? []).filter((d) => d.status === "approved").length;
  const pending  = (docs ?? []).filter((d) => d.status === "pending").length;
  const rejected = (docs ?? []).filter((d) => d.status === "rejected").length;

  const overallStatus =
    approved > 0 ? "verified" :
    pending  > 0 ? "under_review" :
    rejected > 0 ? "rejected" :
    "not_started";

  return NextResponse.json({
    status: overallStatus,
    documents: docs ?? [],
    summary: { approved, pending, rejected },
  });
}
