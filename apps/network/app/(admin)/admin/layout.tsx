"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/brand/logo";
import {
  LayoutDashboard, Building2, Users, CreditCard, ShieldCheck,
  Settings, BarChart3, ScrollText, Globe, ChevronRight, Database,
  Activity, Landmark,
} from "lucide-react";
import { useAuth } from "@/lib/hooks/use-auth";
import { isAdminEmail } from "@/lib/utils/admin";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

const ADMIN_NAV = [
  { href: "/admin",               label: "Overview",         icon: LayoutDashboard, exact: true },
  { href: "/admin/businesses",    label: "Businesses",       icon: Building2 },
  { href: "/admin/users",         label: "Users",            icon: Users },
  { href: "/admin/finance",       label: "Finance",          icon: CreditCard },
  { href: "/admin/treasury",      label: "Treasury",         icon: Landmark },
  { href: "/admin/compliance",    label: "Compliance & KYC", icon: ShieldCheck },
  { href: "/admin/analytics",     label: "Analytics",        icon: BarChart3 },
  { href: "/admin/noc",           label: "NOC",              icon: Activity },
  { href: "/admin/logs",          label: "Audit Logs",       icon: ScrollText },
  { href: "/admin/data-platform", label: "Data Platform",    icon: Database },
  { href: "/admin/system",        label: "System",           icon: Settings },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, loading } = useAuth();
  const router = useRouter();

  const isAdmin = user?.email ? isAdminEmail(user.email) : false;

  useEffect(() => {
    if (!loading && !isAdmin) {
      router.replace("/dashboard");
    }
  }, [isAdmin, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#07080f] flex items-center justify-center">
        <div className="flex items-center gap-3 text-[#64748b]">
          <div className="w-5 h-5 border-2 border-[#FF6524] border-t-transparent rounded-full animate-spin" />
          <span className="text-sm">Verifying access...</span>
        </div>
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-[#07080f] flex">
      {/* Admin Sidebar */}
      <aside className="fixed inset-y-0 left-0 w-60 bg-[#07080f] border-r border-white/7 flex flex-col z-30">
        {/* Logo + badge */}
        <div className="h-16 flex items-center px-5 border-b border-white/7">
          <Link href="/admin" className="flex items-center gap-3">
            <Logo variant="full" size="sm" />
          </Link>
        </div>
        <div className="px-4 py-2.5 border-b border-white/7">
          <div className="flex items-center gap-2 bg-[rgba(245,158,11,0.08)] border border-[rgba(245,158,11,0.2)] rounded-lg px-3 py-2">
            <ShieldCheck size={14} className="text-[#F59E0B] flex-shrink-0" />
            <span className="text-xs font-semibold text-[#F59E0B]">Admin Panel</span>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-0.5">
          {ADMIN_NAV.map(({ href, label, icon: Icon, exact }) => {
            const active = exact ? pathname === href : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-all group",
                  active
                    ? "bg-[rgba(245,158,11,0.1)] text-[#F59E0B] font-medium"
                    : "text-[#64748b] hover:text-[#f1f5f9] hover:bg-white/5"
                )}
              >
                <Icon size={15} strokeWidth={active ? 2 : 1.75} className="flex-shrink-0" />
                <span className="flex-1 truncate">{label}</span>
                {active && <ChevronRight size={12} className="flex-shrink-0 opacity-60" />}
              </Link>
            );
          })}
        </nav>

        <div className="flex-shrink-0 p-3 border-t border-white/7">
          <Link
            href="/dashboard"
            className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-[#64748b] hover:text-[#f1f5f9] hover:bg-white/5 transition-all"
          >
            <Globe size={15} />
            <span>Back to Network</span>
          </Link>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 ml-60 min-h-screen">
        {children}
      </main>
    </div>
  );
}

