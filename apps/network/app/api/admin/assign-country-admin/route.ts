import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { isAdminEmail } from "@/lib/utils/admin";

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          setAll: (items: any[]) =>
            items.forEach(({ name, value, options }: any) =>
              cookieStore.set(name, value, options)
            ),
        },
      }
    );

    // Verify the user is authenticated and is a super admin
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user?.email) {
      return NextResponse.json(
        { error: "Unauthorized — not authenticated" },
        { status: 401 }
      );
    }

    if (!isAdminEmail(user.email)) {
      return NextResponse.json(
        { error: "Unauthorized — only super admins can assign roles" },
        { status: 403 }
      );
    }

    const body = await req.json() as { userId: string; countryId?: string };
    const { userId } = body;

    if (!userId) {
      return NextResponse.json(
        { error: "Missing userId in request body" },
        { status: 400 }
      );
    }

    // Assign country_admin role to the user
    const { error: updateError } = await supabase
      .from("user_profiles")
      .update({ role: "country_admin" })
      .eq("id", userId);

    if (updateError) {
      return NextResponse.json(
        { error: `Failed to assign role: ${updateError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `User ${userId} assigned country_admin role`,
    });
  } catch (error) {
    console.error("[admin/assign-country-admin]", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to assign role",
      },
      { status: 500 }
    );
  }
}
