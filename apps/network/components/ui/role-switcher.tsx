"use client";

import { useState, useRef, useEffect } from "react";
import { useRoles } from "@/lib/hooks/use-roles";
import type { Role } from "@/lib/rbac";
import {
  ChevronDown, ShoppingBag, Briefcase, Sparkles, Building2,
  Factory, Truck, Users, CheckCircle,
} from "lucide-react";

const ROLE_META: Record<Role, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  customer:          { label: "Customer",         icon: ShoppingBag, color: "#FF8B5E", bg: "rgba(255,101,36,0.12)" },
  job_seeker:        { label: "Job Seeker",        icon: Briefcase,   color: "#10b981", bg: "rgba(16,185,129,0.12)" },
  freelancer:        { label: "Freelancer",        icon: Sparkles,    color: "#a78bfa", bg: "rgba(139,92,246,0.12)" },
  business_owner:    { label: "Business Owner",    icon: Building2,   color: "#FF8B5E", bg: "rgba(255,101,36,0.12)" },
  supplier:          { label: "Supplier",          icon: Factory,     color: "#60A5FA", bg: "rgba(59,130,246,0.12)" },
  delivery_rider:    { label: "Rider",             icon: Truck,       color: "#fbbf24", bg: "rgba(245,158,11,0.12)" },
  recruiter:         { label: "Recruiter",         icon: Users,       color: "#F59E0B", bg: "rgba(245,158,11,0.12)" },
  branch_manager:    { label: "Branch Manager",    icon: Building2,   color: "#60A5FA", bg: "rgba(59,130,246,0.12)" },
  cashier:           { label: "Cashier",           icon: ShoppingBag, color: "#94a3b8", bg: "rgba(148,163,184,0.1)" },
  employee:          { label: "Employee",          icon: Users,       color: "#94a3b8", bg: "rgba(148,163,184,0.1)" },
  financial_partner: { label: "Financial Partner", icon: Building2,   color: "#10b981", bg: "rgba(16,185,129,0.12)" },
  country_admin:     { label: "Country Admin",     icon: Users,       color: "#F59E0B", bg: "rgba(245,158,11,0.12)" },
  super_admin:       { label: "Super Admin",       icon: Users,       color: "#f87171", bg: "rgba(239,68,68,0.12)" },
};

export function RoleSwitcher() {
  const { activeRoles, activeContext, switchContext, loading } = useRoles();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  if (loading || activeRoles.length <= 1) return null;

  const current = ROLE_META[activeContext] ?? ROLE_META.customer;
  const Icon = current.icon;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-white/10 hover:border-white/20 transition-all"
        style={{ background: current.bg }}
      >
        <Icon size={13} style={{ color: current.color }} />
        <span className="text-xs font-medium" style={{ color: current.color }}>{current.label}</span>
        <ChevronDown size={12} className="text-[#64748b]" />
      </button>

      {open && (
        <div className="absolute top-full mt-2 left-0 w-52 bg-[#0d0f1a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50">
          <div className="px-3 py-2 border-b border-white/7">
            <p className="text-[10px] font-semibold text-[#374151] uppercase tracking-wider">Switch Role Context</p>
          </div>
          <div className="p-1.5 space-y-0.5">
            {activeRoles.map((ar) => {
              const meta = ROLE_META[ar.role as Role] ?? ROLE_META.customer;
              const RIcon = meta.icon;
              const isActive = ar.role === activeContext;
              return (
                <button
                  key={ar.role}
                  onClick={() => { switchContext(ar.role as Role); setOpen(false); }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm transition-all text-left ${
                    isActive ? "bg-white/5" : "hover:bg-white/5"
                  }`}
                >
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: meta.bg }}>
                    <RIcon size={13} style={{ color: meta.color }} />
                  </div>
                  <span className={`flex-1 text-xs font-medium ${isActive ? "text-white" : "text-[#94a3b8]"}`}>{meta.label}</span>
                  {isActive && <CheckCircle size={13} className="text-[#FF6524] flex-shrink-0" />}
                </button>
              );
            })}
          </div>
          <div className="px-3 py-2.5 border-t border-white/7">
            <a href="/dashboard/roles" className="text-xs text-[#64748b] hover:text-[#FF8B5E] transition-colors">
              Manage roles →
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
