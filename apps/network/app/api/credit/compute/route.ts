import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * KENUXA Credit Score Engine
 * Computes a real score from platform activity — no external bureau.
 *
 * Score range: 300–850
 * Components:
 *   - Business activity (revenue, orders, customers): 30%
 *   - Payment history (wallet txs, loan repayments): 25%
 *   - Platform reputation (reviews, ratings): 20%
 *   - Profile completeness + KYC: 15%
 *   - Supply chain / delivery reliability: 10%
 */
export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
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

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Allow computing for a specific user_id (admin) or self
  const body = await req.json().catch(() => ({}));
  const targetUserId: string = (body as { user_id?: string }).user_id ?? user.id;

  const isAdmin = (body as { user_id?: string }).user_id &&
    (body as { user_id?: string }).user_id !== user.id;
  if (isAdmin) {
    const { data: profile } = await supabase.from("user_profiles").select("role").eq("id", user.id).single();
    if (!profile || !["super_admin", "country_admin"].includes((profile as { role: string }).role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  // Parallel fetch all scoring signals
  const [
    bizRes,        // business activity
    txRes,         // wallet transactions (payment history)
    reviewRes,     // reviews received
    profileRes,    // profile completeness
    kycRes,        // KYC status
    loanRes,       // loan repayment history
  ] = await Promise.all([
    supabase.from("businesses").select("id,total_revenue,order_count,customer_count").eq("owner_id", targetUserId).single(),
    supabase.from("wallet_transactions").select("status,amount").eq("user_id", targetUserId).limit(100),
    supabase.from("business_reviews").select("rating").eq("business_owner_id", targetUserId).limit(50),
    supabase.from("user_profiles").select("full_name,email,phone,avatar_url,bio,country").eq("id", targetUserId).single(),
    supabase.from("kyc_documents").select("status").eq("user_id", targetUserId),
    supabase.from("loan_repayments").select("status").eq("user_id", targetUserId),
  ]);

  // ── 1. Business Activity Score (0–255) ───────────────────
  let bizScore = 0;
  const biz = bizRes.data as { id: string; total_revenue: number; order_count: number; customer_count: number } | null;
  if (biz) {
    const revScore   = Math.min(85, Math.floor((biz.total_revenue   ?? 0) / 500));    // max at GH₵42,500 revenue
    const ordScore   = Math.min(85, Math.floor((biz.order_count     ?? 0) / 2));       // max at 170 orders
    const custScore  = Math.min(85, Math.floor((biz.customer_count  ?? 0) / 1));       // max at 85 customers
    bizScore = revScore + ordScore + custScore; // max 255
  }

  // ── 2. Payment History Score (0–212) ─────────────────────
  const txs = (txRes.data ?? []) as { status: string; amount: number }[];
  const completedTxs = txs.filter((t) => t.status === "completed").length;
  const failedTxs    = txs.filter((t) => t.status === "failed").length;
  const txTotal      = txs.length;
  const txSuccessRate = txTotal > 0 ? completedTxs / txTotal : 0.5;
  const txVolumeScore = Math.min(100, completedTxs * 2);
  const loans = (loanRes.data ?? []) as { status: string }[];
  const loanOnTime = loans.filter((l) => l.status === "completed").length;
  const loanDefault = loans.filter((l) => l.status === "late" || l.status === "failed").length;
  const loanScore  = loans.length > 0 ? Math.max(0, Math.min(112, (loanOnTime * 20) - (loanDefault * 30))) : 56;
  const payHistScore = Math.round(txSuccessRate * txVolumeScore + loanScore); // max ~212

  // ── 3. Reputation Score (0–170) ──────────────────────────
  const reviews = (reviewRes.data ?? []) as { rating: number }[];
  const avgRating = reviews.length > 0
    ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
    : 0;
  const repScore = reviews.length === 0
    ? 85
    : Math.round((avgRating / 5) * 100 + Math.min(70, reviews.length));

  // ── 4. Profile Completeness + KYC (0–127) ────────────────
  const prof = profileRes.data as { full_name: string | null; email: string | null; phone: string | null; avatar_url: string | null; bio: string | null; country: string | null } | null;
  let profileScore = 0;
  if (prof) {
    if (prof.full_name)    profileScore += 15;
    if (prof.email)        profileScore += 10;
    if (prof.phone)        profileScore += 10;
    if (prof.avatar_url)   profileScore += 12;
    if (prof.bio)          profileScore += 10;
    if (prof.country)      profileScore += 5;
  }
  const kycs = (kycRes.data ?? []) as { status: string }[];
  const approvedKyc  = kycs.filter((k) => k.status === "approved").length;
  const kycScore     = Math.min(65, approvedKyc * 33);
  const profileTotal = profileScore + kycScore; // max 127

  // ── 5. Supply/Delivery (0–85) ─────────────────────────────
  // Simplified: give baseline 42 (mid), improve with verified business
  const supplyScore = biz ? 65 : 42;

  // ── Final Score (300–850) ─────────────────────────────────
  const rawTotal = bizScore + payHistScore + repScore + profileTotal + supplyScore;
  // rawTotal max ≈ 255+212+170+127+85 = 849
  const finalScore = Math.max(300, Math.min(850, 300 + Math.round(rawTotal * (550 / 849))));

  // Trust score (0–100) derived from payment history + kyc
  const trustScore = Math.min(100, Math.round(txSuccessRate * 70 + (approvedKyc > 0 ? 30 : 0)));

  // Business score (only if they have a business)
  const businessScore = biz ? Math.max(300, Math.min(850, 300 + Math.round(bizScore * (550 / 255)))) : null;

  // Persist score
  await supabase.from("credit_profiles").upsert({
    user_id: targetUserId,
    kenuxa_score:   finalScore,
    trust_score:    trustScore,
    business_score: businessScore,
    last_calculated: new Date().toISOString(),
    score_factors: {
      business_activity:  bizScore,
      payment_history:    payHistScore,
      reputation:         repScore,
      profile_kyc:        profileTotal,
      supply_delivery:    supplyScore,
    },
  }, { onConflict: "user_id" });

  return NextResponse.json({
    user_id:       targetUserId,
    kenuxa_score:  finalScore,
    trust_score:   trustScore,
    business_score: businessScore,
    factors: {
      business_activity:  { score: bizScore,       weight: "30%", max: 255 },
      payment_history:    { score: payHistScore,    weight: "25%", max: 212 },
      reputation:         { score: repScore,        weight: "20%", max: 170 },
      profile_kyc:        { score: profileTotal,    weight: "15%", max: 127 },
      supply_delivery:    { score: supplyScore,     weight: "10%", max: 85  },
    },
    computed_at: new Date().toISOString(),
  });
}
