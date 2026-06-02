"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/hooks/use-auth";
import {
  Building2, Briefcase, ShoppingBag, Truck, Factory, Users,
  ArrowRight, Zap, CheckCircle2, Loader2,
} from "lucide-react";

// Onboarding role options shown to new users
const ROLES = [
  {
    id: "customer",
    label: "Customer",
    sublabel: "Shop, discover services, book freelancers",
    icon: ShoppingBag,
    color: "#06b6d4",
    href: "/dashboard",
    description: "Browse the marketplace, find local businesses, book services, and enjoy exclusive rewards.",
  },
  {
    id: "business_owner",
    label: "Business Owner",
    sublabel: "Run your business on KENUXA",
    icon: Building2,
    color: "#3B82F6",
    href: "/dashboard/onboarding/business",
    description: "POS, inventory, CRM, payroll, analytics, and every business tool you need in one place.",
  },
  {
    id: "freelancer",
    label: "Freelancer",
    sublabel: "Offer your skills, get paid",
    icon: Briefcase,
    color: "#a78bfa",
    href: "/dashboard/onboarding/freelancer",
    description: "List your services, bid on projects, and receive payments directly to your KENUXA wallet.",
  },
  {
    id: "job_seeker",
    label: "Job Seeker",
    sublabel: "Find your next opportunity",
    icon: Users,
    color: "#6366f1",
    href: "/dashboard/onboarding/job-seeker",
    description: "Browse thousands of jobs, apply with one tap, and track all your applications in one place.",
  },
  {
    id: "supplier",
    label: "Supplier",
    sublabel: "Supply businesses at scale",
    icon: Factory,
    color: "#f97316",
    href: "/dashboard/onboarding/supplier",
    description: "Respond to RFQs, manage orders, issue invoices, and get paid fast.",
  },
  {
    id: "delivery_rider",
    label: "Delivery Rider",
    sublabel: "Earn with every delivery",
    icon: Truck,
    color: "#84cc16",
    href: "/dashboard/onboarding/rider",
    description: "Accept delivery requests, track earnings, and get paid directly to your KENUXA wallet.",
  },
];

export default function OnboardingHub() {
  const { user, profile } = useAuth();
  const router = useRouter();
  const supabase = createClient();
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const displayName = (profile as { full_name?: string } | null)?.full_name
    ?? user?.user_metadata?.full_name
    ?? user?.user_metadata?.name
    ?? "there";
  const firstName = displayName.split(" ")[0];

  async function handleContinue() {
    if (!selected || !user) return;
    setLoading(true);
    try {
      const roleObj = ROLES.find((r) => r.id === selected)!;

      // Update the user's role
      await supabase
        .from("user_profiles")
        .update({ role: selected, onboarding_completed: selected === "customer" })
        .eq("id", user.id);

      // Welcome bonus already provisioned via /api/onboarding/provision on OAuth callback
      // Route to role-specific onboarding or directly to dashboard
      router.push(roleObj.href);
    } catch {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#080a14] flex flex-col items-center justify-center px-4 py-16">
      {/* Header */}
      <div className="text-center mb-10">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#FF6524] to-[#F59E0B] flex items-center justify-center text-white font-black text-2xl shadow-[0_0_32px_rgba(255,101,36,0.4)] mx-auto mb-5">
          K
        </div>
        <h1 className="text-3xl font-bold text-[#f1f5f9] mb-2">
          Welcome, {firstName}! 👋
        </h1>
        <p className="text-[#64748b] text-sm max-w-md mx-auto">
          How do you want to participate in the KENUXA network? You can add more roles later.
        </p>

        {/* Welcome KENUX bonus callout */}
        <div className="mt-4 inline-flex items-center gap-2 bg-[rgba(255,101,36,0.08)] border border-[rgba(255,101,36,0.2)] rounded-full px-4 py-2">
          <Zap size={13} className="text-[#FF8B5E]" />
          <span className="text-xs text-[#FF8B5E] font-medium">500 KENUX welcome bonus credited to your wallet</span>
        </div>
      </div>

      {/* Role cards */}
      <div className="w-full max-w-3xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {ROLES.map((role) => {
          const Icon = role.icon;
          const active = selected === role.id;
          return (
            <button
              key={role.id}
              onClick={() => setSelected(role.id)}
              className={`relative text-left p-5 rounded-2xl border transition-all duration-150 ${
                active
                  ? "bg-[rgba(255,101,36,0.08)] border-[rgba(255,101,36,0.4)] shadow-[0_0_20px_rgba(255,101,36,0.1)]"
                  : "bg-[#111624] border-white/7 hover:border-white/15 hover:bg-[#161929]"
              }`}
            >
              {active && (
                <CheckCircle2
                  size={16}
                  className="absolute top-3 right-3 text-[#FF8B5E]"
                />
              )}
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
                style={{ backgroundColor: `${role.color}18` }}
              >
                <Icon size={18} style={{ color: role.color }} />
              </div>
              <p className="text-sm font-semibold text-[#f1f5f9] mb-0.5">{role.label}</p>
              <p className="text-xs text-[#64748b] leading-relaxed">{role.description}</p>
            </button>
          );
        })}
      </div>

      {/* CTA */}
      <button
        onClick={handleContinue}
        disabled={!selected || loading}
        className="flex items-center gap-2 bg-gradient-to-r from-[#FF6524] to-[#F59E0B] text-white font-semibold px-8 py-3.5 rounded-xl text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-[0_4px_20px_rgba(255,101,36,0.4)] transition-all"
      >
        {loading ? (
          <><Loader2 size={16} className="animate-spin" /> Setting up your account…</>
        ) : (
          <>{selected ? `Continue as ${ROLES.find((r) => r.id === selected)?.label}` : "Select your role to continue"} <ArrowRight size={16} /></>
        )}
      </button>

      <p className="text-xs text-[#374151] mt-4">
        You can switch roles and add more profiles anytime from your dashboard.
      </p>
    </div>
  );
}
