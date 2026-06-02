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
  return _admin;}

/**
 * KYC Document Upload
 * POST /api/kyc/upload
 * Accepts multipart/form-data:
 *   - type: "national_id" | "passport" | "drivers_license" | "utility_bill" | "business_reg"
 *   - side: "front" | "back" (optional)
 *   - file: the document image (JPEG/PNG/PDF, max 5MB)
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

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const docType = (formData.get("type") as string) ?? "national_id";
  const side    = (formData.get("side") as string | null) ?? "front";

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const VALID_TYPES = ["national_id", "passport", "drivers_license", "utility_bill", "business_reg"];
  if (!VALID_TYPES.includes(docType)) {
    return NextResponse.json({ error: "Invalid document type" }, { status: 400 });
  }

  // Size guard: 5MB
  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: "File too large. Max 5MB." }, { status: 400 });
  }

  // Type guard
  const allowedMimes = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
  if (!allowedMimes.includes(file.type)) {
    return NextResponse.json({ error: "Only JPEG, PNG, WebP, or PDF allowed." }, { status: 400 });
  }

  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `kyc/${user.id}/${docType}_${side}_${Date.now()}.${ext}`;

  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await getAdmin().storage
    .from("kyc-documents")
    .upload(path, buffer, {
      contentType: file.type,
      upsert: true,
    });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  // Get the signed URL (valid 7 days for review)
  const { data: signedUrl } = await getAdmin().storage
    .from("kyc-documents")
    .createSignedUrl(path, 60 * 60 * 24 * 7);

  // Upsert KYC document record
  const { data: doc, error: dbError } = await getAdmin()
    .from("kyc_documents")
    .upsert({
      user_id:       user.id,
      document_type: docType,
      side,
      file_path:     path,
      file_url:      signedUrl?.signedUrl,
      status:        "pending",
      submitted_at:  new Date().toISOString(),
    }, { onConflict: "user_id,document_type,side" })
    .select()
    .single();

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }

  // Log security event
  await getAdmin().from("security_events").insert({
    user_id:    user.id,
    event_type: "kyc_document_uploaded",
    severity:   "info",
    metadata:   { doc_type: docType, side },
  });

  // Notify admins
  await getAdmin().from("notifications").insert({
    user_id:    user.id,
    type:       "kyc_submitted",
    category:   "kyc",
    title:      "KYC Document Submitted",
    body:       `A ${docType.replace(/_/g, " ")} document has been submitted for review.`,
    action_url: "/dashboard/identity",
    data: { doc_id: (doc as { id?: string } | null)?.id },
  });

  return NextResponse.json({
    ok:   true,
    id:   (doc as { id?: string } | null)?.id,
    path,
    status: "pending",
    message: "Document submitted. We will review within 24 hours.",
  });
}
