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

  // Provision rewards account (0 initially — welcome bonus credited via RPC below)
  const { error: rewardsErr } = await supabase
    .from("rewards_accounts")
    .upsert({ user_id: user.id, points: 0, lifetime_points: 0, tier: "bronze" }, { onConflict: "user_id", ignoreDuplicates: true });

  // Check if this is a first-time provision (no kenux_ledger entries yet)
  const { count: ledgerCount } = await supabase
    .from("kenux_ledger")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

  const isFirstTime = (ledgerCount ?? 0) === 0;

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

  const WELCOME_BONUS_AMOUNT = parseInt(process.env.KENUX_WELCOME_BONUS ?? "500", 10);
  const REFERRAL_BONUS = 250; // KENUX credited to referrer for each successful referral

  // Award welcome KENUX points (only on first provision, via RPC for ledger integrity)
  if (isFirstTime) {
    try {
      await supabase.rpc("kenux_credit", {
        p_user_id: user.id,
        p_points:  WELCOME_BONUS_AMOUNT,
        p_reason:  "Welcome bonus — thank you for joining KENUXA!",
      });
    } catch { /* non-fatal — wallet still provisioned */ }

    // Process referral code if present in user metadata
    const referralCode = (user.user_metadata?.referral_code as string | null)?.trim()?.toUpperCase();
    if (referralCode) {
      // Find the referrer by their referral code stored in user_profiles
      const { data: referrer } = await supabase
        .from("user_profiles")
        .select("id")
        .eq("referral_code", referralCode)
        .neq("id", user.id) // prevent self-referral
        .single();

      if (referrer) {
        // Record the referral
        await supabase.from("referrals").upsert({
          referrer_id: referrer.id,
          referee_id: user.id,
          referral_code: referralCode,
          status: "completed",
          bonus_credited: true,
          created_at: new Date().toISOString(),
        }, { onConflict: "referee_id", ignoreDuplicates: true });

        // Credit referral bonus to referrer
        try {
          await supabase.rpc("kenux_credit", {
            p_user_id: referrer.id,
            p_points:  REFERRAL_BONUS,
            p_reason:  `Referral bonus — someone joined using your code ${referralCode}`,
          });
        } catch { /* non-fatal */ }

        // Notify referrer
        await supabase.from("notifications").insert({
          user_id: referrer.id,
          type: "success",
          category: "rewards",
          title: "Referral bonus earned!",
          body: `Someone joined KENUXA using your referral code. You've been credited ${REFERRAL_BONUS} KENUX!`,
          action_url: "/dashboard/kenux",
          read_at: null,
        });
      }
    }
  }

  // Seed welcome notification (only once — ignoreDuplicates on id)
  const welcomeNotifId = `welcome-${user.id}`;
  await supabase.from("notifications").upsert({
    id: welcomeNotifId,
    user_id: user.id,
    type: "success",
    category: "info",
    title: "Welcome to KENUXA!",
    body: `Your account is ready. You have received ${WELCOME_BONUS_AMOUNT} KENUX welcome points. Start exploring the economic network.`,
    action_url: "/dashboard/kenux",
    read_at: null,
    created_at: new Date().toISOString(),
  }, { onConflict: "id", ignoreDuplicates: true });

  // Seed demo data for new users (make platform feel populated)
  if (isFirstTime) {
    try {
      await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/seed/demo-data`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          "Content-Type": "application/json",
        },
      });
    } catch {
      // Non-fatal — user can still use platform without demo data
    }
  }

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

  const errors = [walletErr, rewardsErr, rolesErr, ctxErr].filter(Boolean);
  if (errors.length) {
    console.error("[provision] partial errors:", errors);
  }

  return NextResponse.json({ success: true, provisioned: { wallet: !walletErr, rewards: !rewardsErr, roles: !rolesErr, context: !ctxErr } });
}
