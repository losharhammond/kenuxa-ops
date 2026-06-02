import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

const VALID_ROLES = [
  "super_admin", "country_admin", "business_owner", "branch_manager",
  "cashier", "employee", "customer", "supplier", "delivery_rider",
  "recruiter", "job_seeker", "financial_partner", "freelancer",
] as const;

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const businessId = searchParams.get("business_id");
  const role       = searchParams.get("role");

  // Require admin role OR a business_id scoped request (for team listing)
  const serviceClient = await createServiceClient();
  const { data: actorProfile } = await serviceClient
    .from("user_profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const actorRole = (actorProfile as { role?: string } | null)?.role ?? "";
  const isAdmin = ["super_admin", "country_admin"].includes(actorRole);
  const isBusinessRole = ["business_owner", "branch_manager"].includes(actorRole);

  if (!isAdmin && !isBusinessRole) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Business roles can only query their own business members
  let query = supabase
    .from("user_profiles")
    .select("id, full_name, email, phone, role, avatar_url, is_verified, created_at")
    .order("created_at", { ascending: false });

  if (businessId) {
    query = query.eq("org_id", businessId);
  } else if (!isAdmin) {
    // Non-admin without business_id cannot list all users
    return NextResponse.json({ error: "business_id required" }, { status: 400 });
  }

  if (role) query = query.eq("role", role);

  const { data, error } = await query.limit(200);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ users: data });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Only admins may invite users
  const serviceClient = await createServiceClient();
  const { data: profile } = await serviceClient
    .from("user_profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!["super_admin", "country_admin"].includes((profile as { role?: string } | null)?.role ?? "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { email, role, business_id, full_name } = body;

  if (!email) return NextResponse.json({ error: "email is required" }, { status: 400 });

  if (role && !(VALID_ROLES as readonly string[]).includes(role)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  // auth.admin requires the service role key — use serviceClient
  const { data: inviteData, error: inviteError } = await serviceClient.auth.admin.inviteUserByEmail(email, {
    data: { role, business_id, full_name, invited_by: user.id },
  });

  if (inviteError) return NextResponse.json({ error: inviteError.message }, { status: 500 });
  return NextResponse.json({ user: inviteData.user }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { id, role, ...updates } = body;

  if (!id) return NextResponse.json({ error: "User ID required" }, { status: 400 });

  if (role && !(VALID_ROLES as readonly string[]).includes(role)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  // Only admins may update other users; a user may update only themselves (without role change)
  const serviceClient = await createServiceClient();
  const { data: actorProfile } = await serviceClient
    .from("user_profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const isAdmin = ["super_admin", "country_admin"].includes(
    (actorProfile as { role?: string } | null)?.role ?? ""
  );

  if (!isAdmin && id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Non-admins cannot change role
  const safeUpdates = isAdmin ? { role, ...updates } : { ...updates };

  const { data, error } = await supabase
    .from("user_profiles")
    .update({ ...safeUpdates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ user: data });
}
