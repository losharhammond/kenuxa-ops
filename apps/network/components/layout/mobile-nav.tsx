"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Logo, KenuxaBadge } from "@/components/brand/logo";
import {
  LayoutDashboard, Map, Monitor, Sparkles, MoreHorizontal,
  ShoppingBag, Wrench, Briefcase, Factory, Star,
  Package, Users, FileText, CreditCard, Truck,
  Megaphone, BarChart3, Landmark, Building2, Settings, X, Search, Target,
} from "lucide-react";
import { NotificationBell } from "@/components/layout/notification-bell";
import { useAuth } from "@/lib/hooks/use-auth";
import { useRoles } from "@/lib/hooks/use-roles";
import { hasPermission, type Role, type Permission } from "@/lib/rbac";

interface MobileNavItem {
  href: string;
  label: string;
  Icon: React.ElementType;
  permission?: Permission;
}

const BOTTOM_NAV: MobileNavItem[] = [
  { href: "/dashboard",           label: "Home",      Icon: LayoutDashboard },
  { href: "/dashboard/directory", label: "Directory", Icon: Map },
  { href: "/dashboard/pos",       label: "POS",       Icon: Monitor,  permission: "pos.access" },
  { href: "/dashboard/ai",        label: "AI",        Icon: Sparkles },
];

const ALL_NAV: MobileNavItem[] = [
  { href: "/dashboard/opportunities", label: "Opportunities", Icon: Target },
  { href: "/dashboard/marketplace",   label: "Products",      Icon: ShoppingBag, permission: "marketplace.buy" },
  { href: "/dashboard/services",    label: "Services",    Icon: Wrench,      permission: "services.book" },
  { href: "/dashboard/jobs",        label: "Jobs",        Icon: Briefcase,   permission: "jobs.apply" },
  { href: "/dashboard/suppliers",   label: "Suppliers",   Icon: Factory,     permission: "suppliers.view" },
  { href: "/dashboard/reputation",  label: "Reputation",  Icon: Star,        permission: "business.view" },
  { href: "/dashboard/inventory",   label: "Inventory",   Icon: Package,     permission: "inventory.view" },
  { href: "/dashboard/crm",         label: "CRM",         Icon: Users,       permission: "crm.view" },
  { href: "/dashboard/invoicing",   label: "Invoicing",   Icon: FileText,    permission: "invoicing.view" },
  { href: "/dashboard/payments",    label: "Payments",    Icon: CreditCard,  permission: "payments.view" },
  { href: "/dashboard/delivery",    label: "Delivery",    Icon: Truck,       permission: "delivery.manage" },
  { href: "/dashboard/marketing",   label: "Marketing",   Icon: Megaphone,   permission: "marketing.view" },
  { href: "/dashboard/analytics",   label: "Analytics",   Icon: BarChart3,   permission: "analytics.view" },
  { href: "/dashboard/finance",     label: "Finance",     Icon: Landmark,    permission: "finance.view" },
  { href: "/dashboard/profile",     label: "Profile",     Icon: Building2,   permission: "business.edit" },
  { href: "/dashboard/treasury",    label: "Treasury",    Icon: Landmark },
  { href: "/dashboard/settings",    label: "Settings",    Icon: Settings,    permission: "settings.view" },
];

export function MobileNav() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const { role } = useAuth();
  const { activeContext } = useRoles();
  const currentRole: Role = (activeContext || role || "customer") as Role;

  return (
    <>
      {/* Bottom tab bar */}
      <div className="fixed bottom-0 inset-x-0 z-40 bg-[#0d0f1a]/95 backdrop-blur-xl border-t border-white/7 md:hidden safe-area-pb">
        <div className="flex items-center justify-around px-2 py-1.5">
          {BOTTOM_NAV.filter((item) => !item.permission || hasPermission(currentRole, item.permission)).map(({ href, label, Icon }) => {
            const active = href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-colors",
                  active ? "text-[#FF8B5E]" : "text-[#64748b]"
                )}
              >
                <Icon size={20} strokeWidth={active ? 2.25 : 1.75} />
                <span className="text-[10px] leading-none">{label}</span>
              </Link>
            );
          })}
          <button
            onClick={() => setMenuOpen(true)}
            className="flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-colors text-[#64748b]"
          >
            <MoreHorizontal size={20} strokeWidth={1.75} />
            <span className="text-[10px] leading-none">More</span>
          </button>
        </div>
      </div>

      {/* Full menu drawer */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setMenuOpen(false)} />
          <div className="absolute bottom-0 inset-x-0 bg-[#0d0f1a] border-t border-white/10 rounded-t-2xl max-h-[85vh] overflow-y-auto animate-slide-up">
            {/* Drawer handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-8 h-1 rounded-full bg-white/20" />
            </div>
            <div className="px-4 py-3 border-b border-white/7 flex items-center justify-between">
              <Logo variant="full" size="sm" />
              <button
                onClick={() => setMenuOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 text-[#64748b] hover:bg-white/10 transition-colors"
              >
                <X size={16} />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-1 p-3">
              {ALL_NAV.filter((item) => !item.permission || hasPermission(currentRole, item.permission)).map(({ href, label, Icon }) => {
                const active = pathname.startsWith(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setMenuOpen(false)}
                    className={cn(
                      "flex flex-col items-center gap-2 p-3 rounded-xl text-center transition-colors",
                      active
                        ? "bg-[rgba(255,101,36,0.12)] text-[#FF8B5E]"
                        : "text-[#64748b] hover:bg-white/5 hover:text-[#f1f5f9]"
                    )}
                  >
                    <Icon size={22} strokeWidth={active ? 2.25 : 1.75} />
                    <span className="text-[11px] leading-tight font-medium">{label}</span>
                  </Link>
                );
              })}
            </div>
            <div className="h-8" />
          </div>
        </div>
      )}
    </>
  );
}

export function MobileHeader({ title }: { title?: string }) {
  return (
    <div className="md:hidden sticky top-0 z-30 bg-[#07080f]/90 backdrop-blur-lg border-b border-white/7 h-14 flex items-center justify-between px-4">
      <Link href="/dashboard" className="flex items-center">
        <KenuxaBadge size={28} />
        <span className="ml-2 font-bold text-[#f1f5f9] text-sm">{title || "KENUXA"}</span>
      </Link>
      <div className="flex items-center gap-2">
        <button className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#111624] border border-white/7 text-[#64748b] hover:text-[#f1f5f9] transition-colors">
          <Search size={14} />
        </button>
        <NotificationBell iconSize={14} />
      </div>
    </div>
  );
}
