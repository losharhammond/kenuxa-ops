import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * POST /api/kyc/review — Admin-only: approve or reject a KYC document
 * Body: { doc_id, action: "approve" | "reject", reason?: string }
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

  // Admin role check
  const { data: profile } = await adminSupabase
    .from("user_profiles").select("role").eq("id", user.id).single();
  if (!["super_admin", "country_admin"].includes((profile as { role?: string } | null)?.role ?? "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({})) as {
    doc_id?: string;
    action?: "approve" | "reject";
    reason?: string | undefined;
  };
  if (!body.doc_id || !body.action) {
    return NextResponse.json({ error: "doc_id and action required" }, { status: 400 });
  }

  const now = new Date().toISOString();
  const status = body.action === "approve" ? "approved" : "rejected";

  const { data: doc, error } = await adminSupabase
    .from("kyc_documents")
    .update({
      status,
      reviewed_at:       now,
      reviewed_by:       user.id,
      rejection_reason:  body.action === "reject" ? (body.reason ?? "Does not meet requirements") : null,
    })
    .eq("id", body.doc_id)
    .select("user_id, document_type")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const docRow = doc as { user_id: string; document_type: string } | null;

  // Notify the user
  if (docRow) {
    await adminSupabase.from("notifications").insert({
      user_id:    docRow.user_id,
      type:       `kyc_${status}`,
      category:   "kyc",
      title:      status === "approved" ? "KYC Approved ✓" : "KYC Document Rejected",
      body: status === "approved"
        ? `Your ${docRow.document_type.replace(/_/g, " ")} has been verified.`
        : `Your ${docRow.document_type.replace(/_/g, " ")} was not accepted: ${body.reason ?? "Does not meet requirements"}. Please re-submit.`,
      action_url: "/dashboard/identity",
    });

    // If approved, recompute credit score (KYC adds points)
    if (status === "approved") {
      await fetch(`${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3002"}/api/credit/compute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: docRow.user_id }),
      }).catch(() => {});
    }
  }

  // Audit log
  await adminSupabase.from("audit_logs").insert({
    action:   `kyc_${status}`,
    category: "compliance",
    severity: "info",
    actor:    user.id,
    target:   body.doc_id,
    metadata: { reason: body.reason },
  });

  return NextResponse.json({ ok: true, status });
}
