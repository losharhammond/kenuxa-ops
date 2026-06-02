"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Share2, MessageSquare, CheckCircle2, AlertCircle, Edit3 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/hooks/use-auth";
import { timeAgo } from "@/lib/utils";

interface Review {
  id: string;
  author_name: string | null;
  rating: number;
  comment: string | null;
  is_verified_purchase: boolean;
  has_reply: boolean;
  created_at: string;
}

interface Dispute {
  id: string;
  dispute_type: string;
  customer_name: string | null;
  status: string;
  created_at: string;
  resolution_note: string | null;
}

interface ReputationData {
  trust_score: number;
  avg_rating: number;
  total_reviews: number;
  rating_dist: { stars: number; count: number; pct: number }[];
}

function Stars({ rating }: { rating: number }) {
  return (
    <span>
      {[1, 2, 3, 4, 5].map((s) => (
        <span key={s} className={s <= rating ? "text-amber-400" : "text-[#374151]"}>★</span>
      ))}
    </span>
  );
}

const TRUST_FACTORS = [
  { label: "Business Verification",  weight: 20, field: "verification_score" },
  { label: "Payment Timeliness",     weight: 25, field: "payment_score"       },
  { label: "Customer Satisfaction",  weight: 30, field: "satisfaction_score"  },
  { label: "Order Completion Rate",  weight: 15, field: "completion_score"    },
  { label: "Response Time",          weight: 10, field: "response_score"      },
];

export default function ReputationPage() {
  const { profile } = useAuth();
  const supabase = createClient();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [reputation, setReputation] = useState<ReputationData | null>(null);
  const [trustFactors, setTrustFactors] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.business_id) return;
    async function load() {
      setLoading(true);
      try {
      const [{ data: revData }, { data: disData }, { data: repData }] = await Promise.all([
        supabase
          .from("business_reviews")
          .select("id, author_name, rating, comment, is_verified_purchase, has_reply, created_at")
          .eq("business_id", profile!.business_id)
          .order("created_at", { ascending: false })
          .limit(10),
        supabase
          .from("business_disputes")
          .select("id, dispute_type, customer_name, status, created_at, resolution_note")
          .eq("business_id", profile!.business_id)
          .order("created_at", { ascending: false })
          .limit(5),
        supabase
          .from("business_reputation")
          .select("trust_score, avg_rating, total_reviews, rating_dist, verification_score, payment_score, satisfaction_score, completion_score, response_score")
          .eq("business_id", profile!.business_id)
          .single(),
      ]);

      setReviews((revData as Review[]) ?? []);
      setDisputes((disData as Dispute[]) ?? []);

      if (repData) {
        const r = repData as ReputationData & Record<string, number>;
        setReputation({
          trust_score: r.trust_score ?? 0,
          avg_rating: r.avg_rating ?? 0,
          total_reviews: r.total_reviews ?? 0,
          rating_dist: r.rating_dist ?? [],
        });
        setTrustFactors({
          verification_score: r.verification_score ?? 0,
          payment_score:      r.payment_score ?? 0,
          satisfaction_score: r.satisfaction_score ?? 0,
          completion_score:   r.completion_score ?? 0,
          response_score:     r.response_score ?? 0,
        });
      }
      } finally {
        setLoading(false);
      }
    }
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.business_id]);

  const trustScore = reputation?.trust_score ?? 0;
  const avgRating  = reputation?.avg_rating ?? 0;
  const totalRevs  = reputation?.total_reviews ?? 0;
  const ratingDist = reputation?.rating_dist ?? [];

  return (
    <div className="animate-fade-in">
      <Header
        title="Business Reputation"
        subtitle="Trust score, reviews, and dispute management"
        actions={
          <Button size="sm" variant="secondary">
            <Share2 size={13} />
            Share Profile
          </Button>
        }
      />

      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-[rgba(52,211,153,0.2)] bg-[rgba(52,211,153,0.04)] md:col-span-1">
            <CardContent className="p-6 text-center">
              {loading ? (
                <div className="h-24 bg-white/5 rounded-full w-24 mx-auto animate-pulse mb-3" />
              ) : (
                <div className="relative inline-flex items-center justify-center mb-3">
                  <svg className="w-24 h-24 -rotate-90" viewBox="0 0 36 36">
                    <circle cx="18" cy="18" r="15.9" fill="none" stroke="#1a2235" strokeWidth="3.5" />
                    <circle
                      cx="18" cy="18" r="15.9" fill="none"
                      stroke="#34d399" strokeWidth="3.5"
                      strokeDasharray={`${trustScore} ${100 - trustScore}`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute text-center">
                    <div className="text-2xl font-black text-[#34d399]">{trustScore}</div>
                    <div className="text-[9px] text-[#64748b] uppercase tracking-wide">Trust</div>
                  </div>
                </div>
              )}
              <h3 className="font-bold text-[#f1f5f9] mb-1">
                {trustScore >= 90 ? "Trusted Business" : trustScore >= 70 ? "Good Standing" : "Building Trust"}
              </h3>
              <Badge variant={trustScore >= 90 ? "green" : trustScore >= 70 ? "blue" : "amber"}>
                {trustScore >= 90 ? "Grade A" : trustScore >= 70 ? "Grade B" : "Grade C"}
              </Badge>
              <p className="text-xs text-[#64748b] mt-3">Top 8% of businesses on KENUXA</p>
            </CardContent>
          </Card>

          <Card className="md:col-span-2">
            <CardContent className="p-6">
              {loading ? (
                <div className="h-32 bg-white/5 rounded animate-pulse" />
              ) : (
                <div className="flex items-start gap-6">
                  <div className="text-center flex-shrink-0">
                    <div className="text-5xl font-black text-[#f1f5f9]">{avgRating.toFixed(1)}</div>
                    <Stars rating={Math.round(avgRating)} />
                    <p className="text-xs text-[#64748b] mt-1">{totalRevs.toLocaleString()} reviews</p>
                  </div>
                  <div className="flex-1 space-y-1.5">
                    {ratingDist.length > 0 ? ratingDist.map((r) => (
                      <div key={r.stars} className="flex items-center gap-2 text-xs">
                        <span className="text-[#64748b] w-6 text-right">{r.stars}★</span>
                        <div className="flex-1 h-2 bg-[#111624] rounded-full overflow-hidden">
                          <div className="h-full bg-amber-400 rounded-full" style={{ width: `${r.pct}%` }} />
                        </div>
                        <span className="text-[#64748b] w-8">{r.pct}%</span>
                        <span className="text-[#374151] w-8">({r.count})</span>
                      </div>
                    )) : (
                      <p className="text-sm text-[#64748b]">No reviews yet</p>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Trust Score Breakdown</CardTitle>
              <span className="text-xs text-[#64748b]">How your score is calculated</span>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {TRUST_FACTORS.map((f) => {
              const score = trustFactors[f.field] ?? 0;
              return (
                <div key={f.label}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-[#f1f5f9]">{f.label}</span>
                      <span className="text-xs text-[#374151]">({f.weight}% weight)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-[#f1f5f9]">{score}%</span>
                      <Badge
                        variant={score >= 90 ? "green" : score >= 70 ? "blue" : "amber"}
                        className="text-[10px]"
                      >
                        {score >= 90 ? "excellent" : score >= 70 ? "good" : "fair"}
                      </Badge>
                    </div>
                  </div>
                  <Progress value={score} color={score >= 90 ? "green" : score >= 70 ? "blue" : "amber"} />
                </div>
              );
            })}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-[#f1f5f9]">Recent Reviews</h3>
              <select className="bg-[#111624] border border-white/7 text-[#64748b] text-xs rounded-lg px-2 py-1.5 outline-none">
                <option>All Ratings</option>
                <option>5 Star</option>
                <option>4 Star</option>
                <option>3 Star & below</option>
              </select>
            </div>

            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <Card key={i}><CardContent className="p-4"><div className="h-16 bg-white/5 rounded animate-pulse" /></CardContent></Card>
              ))
            ) : reviews.length === 0 ? (
              <Card><CardContent className="p-16 text-center">
                <MessageSquare size={28} className="mx-auto text-[#374151] mb-3" />
                <p className="text-sm text-[#64748b]">No reviews yet</p>
              </CardContent></Card>
            ) : (
              reviews.map((r) => (
                <Card key={r.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-[rgba(255,101,36,0.1)] flex items-center justify-center text-sm font-bold text-[#FF8B5E] flex-shrink-0">
                          {(r.author_name ?? "?")[0]?.toUpperCase() ?? "?"}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-medium text-[#f1f5f9]">{r.author_name ?? "Anonymous"}</span>
                            {r.is_verified_purchase && <Badge variant="verified" className="text-[9px] px-1">Verified</Badge>}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <Stars rating={r.rating} />
                            <span className="text-xs text-[#374151]">{timeAgo(r.created_at)}</span>
                          </div>
                        </div>
                      </div>
                      <Button size="sm" variant="ghost" className="flex-shrink-0 text-xs">
                        {r.has_reply ? <><Edit3 size={11} className="mr-1" />Edit Reply</> : <><MessageSquare size={11} className="mr-1" />Reply</>}
                      </Button>
                    </div>
                    {r.comment && <p className="text-sm text-[#94a3b8] leading-relaxed">{r.comment}</p>}
                    {r.has_reply && (
                      <div className="mt-3 bg-[rgba(255,101,36,0.06)] border border-[rgba(255,101,36,0.15)] rounded-lg p-3">
                        <p className="text-xs font-semibold text-[#FF8B5E] mb-1">Your Reply</p>
                        <p className="text-xs text-[#94a3b8]">Thank you for your feedback! We appreciate your continued support.</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          <div className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Disputes</CardTitle>
                  <Badge variant="amber">{disputes.filter((d) => d.status !== "resolved").length} open</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {loading ? (
                  <div className="h-16 bg-white/5 rounded animate-pulse" />
                ) : disputes.length === 0 ? (
                  <p className="text-sm text-[#64748b] text-center py-4">No disputes</p>
                ) : (
                  disputes.map((d) => (
                    <div key={d.id} className="border border-white/7 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-[#f1f5f9]">{d.dispute_type}</span>
                        <Badge
                          variant={d.status === "resolved" ? "green" : d.status === "open" ? "red" : "amber"}
                          className="text-[10px]"
                        >
                          {d.status.replace("_", " ")}
                        </Badge>
                      </div>
                      <p className="text-xs text-[#64748b]">{d.customer_name ?? "—"} · {timeAgo(d.created_at)}</p>
                      {d.resolution_note && (
                        <p className="text-xs text-[#34d399] mt-1 flex items-center gap-1">
                          <CheckCircle2 size={10} /> {d.resolution_note}
                        </p>
                      )}
                      {d.status !== "resolved" && (
                        <Button size="sm" variant="ghost" className="w-full mt-2 text-xs">View & Respond</Button>
                      )}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Verification Status</CardTitle></CardHeader>
              <CardContent className="space-y-2.5">
                {[
                  { item: "Business Registration", done: true  },
                  { item: "Phone Verified",         done: true  },
                  { item: "Email Verified",         done: true  },
                  { item: "Location Verified",      done: true  },
                  { item: "Bank Account Linked",    done: false },
                  { item: "Ghana Card Verified",    done: false },
                ].map((v) => (
                  <div key={v.item} className="flex items-center justify-between text-sm">
                    <span className={v.done ? "text-[#f1f5f9]" : "text-[#64748b]"}>{v.item}</span>
                    {v.done
                      ? <CheckCircle2 size={14} className="text-[#34d399]" />
                      : <div className="w-3.5 h-3.5 rounded-full border border-[#374151]" />}
                  </div>
                ))}
                <Button size="sm" className="w-full mt-3">Complete Verification</Button>
              </CardContent>
            </Card>

            <Card className="border-[rgba(239,68,68,0.15)]">
              <CardContent className="p-4 text-center">
                <p className="text-xs text-[#64748b] mb-3">Received a fraudulent review or spam?</p>
                <Button variant="danger" size="sm" className="w-full">
                  <AlertCircle size={13} />
                  Report Fraud / Spam
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
