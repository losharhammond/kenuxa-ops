"use client";

import { useRouter } from "next/navigation";
import { useRoles } from "@/lib/hooks/use-roles";
import { useAuth } from "@/lib/hooks/use-auth";
import { Header } from "@/components/layout/header";
import {
  ShoppingBag, Briefcase, Pen, Building2, Factory, Truck,
  CheckCircle, Lock, ArrowRight, Loader2, Users, Star,
  Zap, CreditCard, BarChart3, Package, MessageSquare,
} from "lucide-react";
import type { Role } from "@/lib/rbac";

interface RoleDef {
  role: Role;
  label: string;
  tagline: string;
  description: string;
  icon: React.ElementType;
  color: string;
  bg: string;
  selfActivate: boolean;
  onboardingPath?: string;
  benefits: string[];
}

const ROLE_DEFS: RoleDef[] = [
  {
    role: "customer",
    label: "Customer",
    tagline: "Shop, discover, earn rewards",
    description: "Browse businesses, buy products & services, earn loyalty points, write reviews, and follow your favourite brands.",
    icon: ShoppingBag,
    color: "#FF8B5E", bg: "rgba(255,101,36,0.07)",
    selfActivate: true,
    benefits: ["Browse & buy on the marketplace", "Earn KENUXA reward points", "Save businesses & wishlists", "Track orders & deliveries", "Write reviews"],
  },
  {
    role: "job_seeker",
    label: "Job Seeker",
    tagline: "Find your next opportunity",
    description: "Create a professional profile, apply to jobs, get AI career coaching, and connect with top employers.",
    icon: Briefcase,
    color: "#10b981", bg: "rgba(16,185,129,0.07)",
    selfActivate: true,
    onboardingPath: "/dashboard/onboarding/job-seeker",
    benefits: ["Professional talent profile", "Apply to full-time, part-time & gig roles", "AI career coaching & CV review", "Job alerts & smart matching", "Track applications"],
  },
  {
    role: "freelancer",
    label: "Freelancer",
    tagline: "Offer services, win projects",
    description: "List your services, receive client leads, submit proposals, deliver work, and build your reputation.",
    icon: Pen,
    color: "#8b5cf6", bg: "rgba(139,92,246,0.07)",
    selfActivate: true,
    onboardingPath: "/dashboard/onboarding/freelancer",
    benefits: ["Service marketplace profile", "Receive client leads & proposals", "Secure payments & escrow", "Build reviews & reputation", "Portfolio showcase"],
  },
  {
    role: "business_owner",
    label: "Business Owner",
    tagline: "Create & grow your business",
    description: "Launch your business storefront, manage POS, CRM, inventory, staff, and analytics in one platform.",
    icon: Building2,
    color: "#3b82f6", bg: "rgba(59,130,246,0.07)",
    selfActivate: true,
    onboardingPath: "/dashboard/onboarding/business",
    benefits: ["Public business storefront", "POS, inventory & CRM", "Staff & branch management", "Business analytics", "Payments & invoicing"],
  },
  {
    role: "supplier",
    label: "Supplier",
    tagline: "Supply businesses at scale",
    description: "List your inventory, receive RFQs from hundreds of businesses, submit quotes, and fulfill purchase orders.",
    icon: Factory,
    color: "#f97316", bg: "rgba(249,115,22,0.07)",
    selfActivate: true,
    onboardingPath: "/dashboard/onboarding/supplier",
    benefits: ["Supplier marketplace listing", "Receive & respond to RFQs", "Manage purchase orders", "Invoice management", "Buyer analytics"],
  },
  {
    role: "delivery_rider",
    label: "Delivery Rider",
    tagline: "Deliver & earn flexibly",
    description: "Accept delivery jobs from businesses, navigate optimized routes, confirm deliveries, and receive daily earnings.",
    icon: Truck,
    color: "#84cc16", bg: "rgba(132,204,22,0.07)",
    selfActivate: true,
    onboardingPath: "/dashboard/onboarding/rider",
    benefits: ["Flexible delivery hours", "GPS-optimized routes", "Daily earnings payout", "Ratings & reviews", "Performance bonuses"],
  },
];

const ASSIGNED_ROLES: { role: Role; label: string; icon: React.ElementType; note: string }[] = [
  { role: "branch_manager", label: "Branch Manager", icon: BarChart3,     note: "Assigned by a Business Owner" },
  { role: "cashier",        label: "Cashier",         icon: CreditCard,   note: "Assigned by Owner or Manager" },
  { role: "employee",       label: "Employee",        icon: Users,        note: "Assigned by Owner or Manager" },
  { role: "recruiter",      label: "Recruiter",       icon: MessageSquare, note: "Assigned by a Business" },
];

export default function RolesPage() {
  const router = useRouter();
  const { profile } = useAuth();
  const { activeRoles, activateRole, switchContext, loading } = useRoles();

  const activeRoleNames = activeRoles.map((r) => r.role);

  const handleActivate = async (def: RoleDef) => {
    if (def.onboardingPath) {
      router.push(def.onboardingPath);
      return;
    }
    await activateRole(def.role);
    await switchContext(def.role);
  };

  return (
    <>
      <Header
        title="My Roles"
        subtitle="Activate roles to unlock new capabilities in your KENUXA account"
      />
      <div className="p-6 space-y-8">
        {/* Identity banner */}
        <div className="relative rounded-2xl overflow-hidden border border-[rgba(255,101,36,0.2)] bg-gradient-to-r from-[rgba(255,101,36,0.08)] to-transparent p-5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#FF6524] to-[#F59E0B] flex items-center justify-center text-white font-black text-xl flex-shrink-0">
              {profile?.full_name?.[0]?.toUpperCase() ?? "K"}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-[#f1f5f9]">{profile?.full_name ?? "KENUXA Member"}</p>
              <p className="text-xs text-[#64748b]">KENUXA ID · {activeRoleNames.length} active role{activeRoleNames.length !== 1 ? "s" : ""}</p>
            </div>
            <div className="ml-auto flex flex-wrap gap-1.5 justify-end">
              {activeRoleNames.map((r) => (
                <span key={r} className="px-2 py-0.5 rounded-full bg-[rgba(255,101,36,0.1)] border border-[rgba(255,101,36,0.2)] text-[#FF8B5E] text-[10px] font-medium capitalize">
                  {r.replace(/_/g, " ")}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Self-activatable roles */}
        <div>
          <h2 className="text-sm font-semibold text-[#f1f5f9] mb-1">Activate a Role</h2>
          <p className="text-xs text-[#64748b] mb-4">Each role unlocks a new set of tools and capabilities. You can hold all roles simultaneously.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {ROLE_DEFS.map((def) => {
              const Icon = def.icon;
              const isActive = activeRoleNames.includes(def.role);
              return (
                <div
                  key={def.role}
                  className="rounded-xl border p-5 transition-all"
                  style={{ background: def.bg, borderColor: isActive ? def.color : "rgba(255,255,255,0.07)" }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: `${def.color}20` }}>
                        <Icon size={17} style={{ color: def.color }} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-[#f1f5f9]">{def.label}</p>
                        <p className="text-xs" style={{ color: def.color }}>{def.tagline}</p>
                      </div>
                    </div>
                    {isActive && <CheckCircle size={16} style={{ color: def.color }} className="flex-shrink-0" />}
                  </div>
                  <p className="text-xs text-[#64748b] mb-3 leading-relaxed">{def.description}</p>
                  <ul className="space-y-1 mb-4">
                    {def.benefits.slice(0, 3).map((b) => (
                      <li key={b} className="flex items-center gap-2 text-xs text-[#94a3b8]">
                        <Zap size={10} style={{ color: def.color }} className="flex-shrink-0" />
                        {b}
                      </li>
                    ))}
                  </ul>
                  {isActive ? (
                    <button
                      onClick={async () => { await switchContext(def.role); router.push("/dashboard"); }}
                      className="w-full h-9 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all"
                      style={{ background: `${def.color}18`, color: def.color, border: `1px solid ${def.color}40` }}
                    >
                      <Star size={12} /> Switch to this context
                    </button>
                  ) : (
                    <button
                      onClick={() => handleActivate(def)}
                      disabled={loading}
                      className="w-full h-9 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all hover:opacity-90 disabled:opacity-50 text-white"
                      style={{ background: def.color }}
                    >
                      {loading ? <Loader2 size={12} className="animate-spin" /> : <><span>Activate {def.label}</span><ArrowRight size={12} /></>}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Assigned roles */}
        <div>
          <h2 className="text-sm font-semibold text-[#f1f5f9] mb-1">Assigned Roles</h2>
          <p className="text-xs text-[#64748b] mb-4">These roles are granted by a business or administrator.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {ASSIGNED_ROLES.map(({ role, label, icon: Icon, note }) => {
              const isActive = activeRoleNames.includes(role);
              return (
                <div key={role} className={`flex items-center gap-3 p-4 rounded-xl border transition-all ${
                  isActive ? "border-[rgba(255,101,36,0.3)] bg-[rgba(255,101,36,0.05)]" : "border-white/7 bg-[#111624]"
                }`}>
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${isActive ? "bg-[rgba(255,101,36,0.1)]" : "bg-[#0d0f1a]"}`}>
                    {isActive ? <Icon size={16} className="text-[#FF8B5E]" /> : <Lock size={14} className="text-[#374151]" />}
                  </div>
                  <div className="min-w-0">
                    <p className={`text-sm font-medium ${isActive ? "text-[#f1f5f9]" : "text-[#374151]"}`}>{label}</p>
                    <p className="text-xs text-[#374151] truncate">{isActive ? "Active" : note}</p>
                  </div>
                  {isActive && (
                    <button onClick={async () => { await switchContext(role); router.push("/dashboard"); }}
                      className="ml-auto text-xs text-[#FF8B5E] hover:text-[#FF6524] flex items-center gap-1 flex-shrink-0 transition-colors">
                      Use <ArrowRight size={11} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Tip */}
        <div className="rounded-xl border border-white/7 bg-[#111624] p-4">
          <div className="flex items-start gap-3">
            <Package size={16} className="text-[#FF8B5E] mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs font-semibold text-[#f1f5f9] mb-1">One KENUXA ID. Many Economic Roles.</p>
              <p className="text-xs text-[#64748b] leading-relaxed">
                You can be a customer buying groceries, a freelancer taking design projects, and a business owner selling products — all at once.
                Use the role switcher in the sidebar to change your active context at any time.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
