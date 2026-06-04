import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Storage buckets to create on initialization
const BUCKETS = [
  { id: "avatars", name: "avatars", public: true },
  { id: "businesses", name: "businesses", public: true },
  { id: "products", name: "products", public: true },
  { id: "kyc-documents", name: "kyc-documents", public: false },
  { id: "portfolio", name: "portfolio", public: true },
  { id: "business-assets", name: "business-assets", public: true },
];

export async function POST() {
  try {
    const cookieStore = await cookies();

    // Use service role for admin operations
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          setAll: (items: any[]) => items.forEach(({ name, value, options }: any) => cookieStore.set(name, value, options)),
        },
      }
    );

    const results = [];

    for (const bucket of BUCKETS) {
      try {
        // Try to create the bucket
        const { data, error } = await supabase.storage.createBucket(bucket.id, {
          public: bucket.public,
        });

        if (error) {
          // If bucket already exists, that's fine
          if (error.message?.includes("already exists")) {
            results.push({ bucket: bucket.id, status: "already exists" });
          } else {
            results.push({ bucket: bucket.id, status: "error", error: error.message });
          }
        } else {
          results.push({ bucket: bucket.id, status: "created" });
        }
      } catch (err) {
        results.push({ bucket: bucket.id, status: "error", error: String(err) });
      }
    }

    return NextResponse.json({ success: true, buckets: results });
  } catch (error) {
    console.error("[storage/init] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to initialize storage" },
      { status: 500 }
    );
  }
}
