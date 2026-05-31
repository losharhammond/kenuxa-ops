import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function POST() {
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

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const role = profile?.role ?? "customer";

  // Provision wallet
  const { error: walletErr } = await supabase
    .from("wallets")
    .upsert({ user_id: user.id, balance: 0, currency: "GHS", status: "active" }, { onConflict: "user_id", ignoreDuplicates: true });

  // Provision rewards account
  const { error: rewardsErr } = await supabase
    .from("rewards_accounts")
    .upsert({ user_id: user.id, points: 0, lifetime_points: 0, tier: "bronze" }, { onConflict: "user_id", ignoreDuplicates: true });

  // Seed default role
  const { error: rolesErr } = await supabase
    .from("user_roles")
    .upsert({ user_id: user.id, role, activated_at: new Date().toISOString() }, { onConflict: "user_id,role", ignoreDuplicates: true });

  // Seed user_contexts with default active role
  const { error: ctxErr } = await supabase
    .from("user_contexts")
    .upsert({ user_id: user.id, active_role: role }, { onConflict: "user_id", ignoreDuplicates: true });

  // Seed customer_profile
  await supabase.from("customer_profiles").upsert(
    { user_id: user.id, preferences: {}, created_at: new Date().toISOString() },
    { onConflict: "user_id", ignoreDuplicates: true }
  );

  // Seed welcome notification (only once — ignoreDuplicates on id)
  const welcomeNotifId = `welcome-${user.id}`;
  await supabase.from("notifications").upsert({
    id: welcomeNotifId,
    user_id: user.id,
    type: "success",
    category: "reward",
    title: "Welcome to KENUXA! 🎉",
    body: "Your account is set up. You've received 100 welcome points. Start exploring your economic network.",
    read: false,
    created_at: new Date().toISOString(),
  }, { onConflict: "id", ignoreDuplicates: true });

  // Seed welcome activity feed event
  const welcomeActivityId = `welcome-activity-${user.id}`;
  await supabase.from("activity_feed").upsert({
    id: welcomeActivityId,
    user_id: user.id,
    type: "role_activated",
    title: "You joined KENUXA",
    body: "Welcome to the network. Your economic identity has been created.",
    read: false,
    created_at: new Date().toISOString(),
  }, { onConflict: "id", ignoreDuplicates: true });

  // Seed 100 welcome reward points
  await supabase.from("rewards_accounts").upsert(
    { user_id: user.id, points: 100, lifetime_points: 100, tier: "bronze" },
    { onConflict: "user_id", ignoreDuplicates: true }
  );

  const errors = [walletErr, rewardsErr, rolesErr, ctxErr].filter(Boolean);
  if (errors.length) {
    console.error("[provision] partial errors:", errors);
  }

  return NextResponse.json({ success: true, provisioned: { wallet: !walletErr, rewards: !rewardsErr, roles: !rolesErr, context: !ctxErr } });
}
