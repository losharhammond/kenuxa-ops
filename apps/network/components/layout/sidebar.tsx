"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/brand/logo";
import {
  LayoutDashboard, BarChart3, Map, ShoppingBag, Wrench, Briefcase,
  Factory, Monitor, Package, Truck, Users, FileText, CreditCard, Landmark,
  Megaphone, Sparkles, Building2, Settings, ShieldCheck,
  Compass, Gift, Flame, Pen, MessageSquare, BadgeCheck,
  ClipboardList, Banknote, Code2, UtensilsCrossed, Smartphone as SmartphoneIcon,
  Pill, BedDouble, Sprout, Stethoscope, GraduationCap, Network, Award,
  Bell, Activity, UserCog, Zap, Receipt, TrendingUp, Wallet, Star,
  Globe, HandCoins, ChevronRight, Target,
} from "lucide-react";
import { useAuth } from "@/lib/hooks/use-auth";
import { useRoles } from "@/lib/hooks/use-roles";
import { hasPermission, isAdminRole, type Permission, type Role } from "@/lib/rbac";
import { NotificationBell } from "@/components/layout/notification-bell";
import { RoleSwitcher } from "@/components/ui/role-switcher";

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  permission?: Permission;
  badge?: string;
  roles?: Role[];
  hideFor?: Role[];
}

interface NavGroup {
  label: string;
  items: NavItem[];
  showFor?: Role[];
}

// ─────────────────────────────────────────────────────────────
// KENUXA ECONOMIC NETWORK — Role-Specific Navigation
// Primary: Discover & Participate | Secondary: Business Tools
// ─────────────────────────────────────────────────────────────
const NAV_GROUPS: NavGroup[] = [

  // ── 1. HOME (all roles) ──────────────────────────────────
  {
    label: "Home",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    ],
  },

  // ── 2. DISCOVER (Economic Network primary nav) ────────────
  // Customers, Job Seekers, Freelancers, general participants
  {
    label: "Discover",
    items: [
      { href: "/dashboard/discover",       label: "Explore",            icon: Compass,   badge: "NEW" },
      { href: "/dashboard/opportunities",  label: "Opportunities",      icon: Target,    badge: "HOT" },
      { href: "/dashboard/directory",      label: "Businesses",         icon: Map },
      { href: "/dashboard/marketplace",    label: "Products",           icon: ShoppingBag, permission: "marketplace.buy" },
      { href: "/dashboard/services",       label: "Services",           icon: Wrench,     permission: "services.book" },
      { href: "/dashboard/jobs",           label: "Jobs",               icon: Briefcase,  permission: "jobs.apply" },
      { href: "/dashboard/freelancers",    label: "Freelancers",        icon: Pen },
      { href: "/dashboard/suppliers",      label: "Suppliers",          icon: Factory,    permission: "suppliers.view" },
      { href: "/dashboard/trending",       label: "Trending",           icon: Flame },
    ],
    showFor: ["customer", "job_seeker", "freelancer", "business_owner",
              "branch_manager", "cashier", "employee", "supplier", "delivery_rider",
              "recruiter", "financial_partner", "super_admin", "country_admin"],
  },

  // ── 3. EARN & PARTICIPATE (Freelancer / Job Seeker) ──────
  {
    label: "Earn",
    items: [
      { href: "/dashboard/talent",     label: "My Talent Profile",  icon: BadgeCheck },
      { href: "/dashboard/skills",     label: "Skills Marketplace", icon: Award },
      { href: "/dashboard/jobs",       label: "Find Jobs",          icon: Briefcase },
      { href: "/dashboard/freelancers",label: "Find Projects",      icon: Pen },
      { href: "/dashboard/analytics",  label: "Earnings",           icon: TrendingUp },
    ],
    showFor: ["freelancer", "job_seeker"],
  },

  // ── 4. SUPPLY CHAIN (Suppliers) ──────────────────────────
  {
    label: "Supply Chain",
    items: [
      { href: "/dashboard/rfq",        label: "RFQs & Quotes",      icon: ClipboardList },
      { href: "/dashboard/invoicing",  label: "Invoicing",          icon: FileText },
      { href: "/dashboard/payments",   label: "Payments",           icon: CreditCard },
      { href: "/dashboard/analytics",  label: "Analytics",          icon: BarChart3 },
    ],
    showFor: ["supplier"],
  },

  // ── 5. DELIVERIES (Riders) ───────────────────────────────
  {
    label: "Deliveries",
    items: [
      { href: "/dashboard/delivery",   label: "Active Deliveries",  icon: Truck },
      { href: "/dashboard/analytics",  label: "My Earnings",        icon: TrendingUp },
    ],
    showFor: ["delivery_rider"],
  },

  // ── 6. RECRUITMENT (Recruiters) ──────────────────────────
  {
    label: "Recruitment",
    items: [
      { href: "/dashboard/jobs",       label: "Job Postings",       icon: Briefcase },
      { href: "/dashboard/analytics",  label: "Applications",       icon: BarChart3 },
    ],
    showFor: ["recruiter"],
  },

  // ── 7. OPERATIONS (Business tools — secondary) ───────────
  {
    label: "Operations",
    items: [
      { href: "/dashboard/pos",           label: "Point of Sale",      icon: Monitor,         permission: "pos.access" },
      { href: "/dashboard/inventory",     label: "Inventory",          icon: Package,         permission: "inventory.view" },
      { href: "/dashboard/delivery",      label: "Delivery",           icon: Truck,           permission: "delivery.manage" },
      { href: "/dashboard/restaurant",    label: "Restaurant OS",      icon: UtensilsCrossed, permission: "pos.access" },
      { href: "/dashboard/mobile-money",  label: "Mobile Money OS",    icon: SmartphoneIcon,  permission: "payments.view" },
      { href: "/dashboard/pharmacy",      label: "Pharmacy OS",        icon: Pill,            permission: "inventory.view" },
      { href: "/dashboard/hotel",         label: "Hotel OS",           icon: BedDouble,       permission: "pos.access" },
      { href: "/dashboard/agriculture",   label: "Agriculture OS",     icon: Sprout,          permission: "inventory.view" },
      { href: "/dashboard/healthcare",    label: "Healthcare OS",      icon: Stethoscope,     permission: "pos.access" },
      { href: "/dashboard/education",     label: "Education OS",       icon: GraduationCap,   permission: "inventory.view" },
      { href: "/dashboard/professional",  label: "Professional OS",    icon: Briefcase,       permission: "invoicing.view" },
    ],
    showFor: ["business_owner", "branch_manager", "cashier", "employee", "super_admin"],
  },

  // ── 8. BUSINESS (Management tools) ───────────────────────
  {
    label: "Business",
    items: [
      { href: "/dashboard/crm",        label: "CRM",                icon: Users,        permission: "crm.view" },
      { href: "/dashboard/invoicing",  label: "Invoicing",          icon: FileText,     permission: "invoicing.view" },
      { href: "/dashboard/payments",   label: "Payments",           icon: CreditCard,   permission: "payments.view" },
      { href: "/dashboard/finance",    label: "Finance",            icon: Landmark,     permission: "finance.view" },
      { href: "/dashboard/lending",    label: "Lending",            icon: Banknote,     permission: "finance.view" },
      { href: "/dashboard/rfq",        label: "Procurement",        icon: ClipboardList, permission: "suppliers.view" },
      { href: "/dashboard/team",       label: "Team",               icon: UserCog,      permission: "users.manage" },
      { href: "/dashboard/billing",    label: "Billing & Plans",    icon: Receipt,      permission: "business.billing" },
    ],
    showFor: ["business_owner", "branch_manager", "cashier", "employee", "super_admin", "country_admin"],
  },

  // ── 9. LENDING PORTAL (Financial Partners) ───────────────
  {
    label: "Lending Portal",
    items: [
      { href: "/dashboard/finance-partner", label: "Applications",    icon: Landmark },
      { href: "/dashboard/analytics",       label: "Portfolio",       icon: BarChart3 },
      { href: "/dashboard/developer",       label: "API Integration", icon: Code2 },
    ],
    showFor: ["financial_partner"],
  },

  // ── 10. GROWTH (Business owners) ─────────────────────────
  {
    label: "Growth",
    items: [
      { href: "/dashboard/marketing",      label: "Marketing",        icon: Megaphone,  permission: "marketing.view" },
      { href: "/dashboard/reputation",     label: "Reputation",       icon: Star,       permission: "business.view" },
      { href: "/dashboard/ai",             label: "AI Assistant",     icon: Sparkles },
      { href: "/dashboard/economic-graph", label: "Economic Graph",   icon: Network,   badge: "NEW" },
      { href: "/dashboard/analytics",      label: "Analytics",        icon: BarChart3, permission: "analytics.view" },
      { href: "/dashboard/developer",      label: "Developer",        icon: Code2 },
    ],
    showFor: ["business_owner", "branch_manager", "super_admin"],
  },

  // ── 11. COMMUNITY (All roles) ─────────────────────────────
  {
    label: "Community",
    items: [
      { href: "/dashboard/community", label: "Social Feed",          icon: MessageSquare, badge: "NEW" },
      { href: "/dashboard/directory", label: "Business Directory",   icon: Globe },
      { href: "/dashboard/ai",        label: "AI Assistant",         icon: Sparkles,
        hideFor: ["business_owner", "branch_manager"] },
    ],
  },

  // ── 12. FINANCE (Wallet, KENUX, Credit) ──────────────────
  {
    label: "Finance",
    items: [
      { href: "/dashboard/wallet",    label: "Wallet",              icon: Wallet },
      { href: "/dashboard/kenux",     label: "KENUX",               icon: Zap },
      { href: "/dashboard/credit",    label: "KENUXA Credit",       icon: TrendingUp },
      { href: "/dashboard/rewards",   label: "Rewards",             icon: Gift },
      { href: "/dashboard/lending",   label: "Financing",           icon: HandCoins,
        hideFor: ["business_owner", "branch_manager"] },
      { href: "/dashboard/treasury",  label: "Treasury",            icon: Landmark,
        roles: ["super_admin", "country_admin", "financial_partner", "business_owner"] },
    ],
  },

  // ── 13. MY KENUXA (Personal) ─────────────────────────────
  {
    label: "My KENUXA",
    items: [
      { href: "/dashboard/account",       label: "My Account",         icon: ShoppingBag,
        hideFor: ["business_owner", "branch_manager", "cashier"] },
      { href: "/dashboard/notifications", label: "Notifications",      icon: Bell },
      { href: "/dashboard/activity",      label: "Activity",           icon: Activity },
      { href: "/dashboard/talent",        label: "Talent Profile",     icon: BadgeCheck,
        hideFor: ["business_owner", "cashier", "branch_manager", "customer"] },
      { href: "/dashboard/identity",      label: "KENUXA ID",          icon: ShieldCheck },
      { href: "/dashboard/roles",         label: "My Roles",           icon: Users },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { role, profile } = useAuth();
  const { activeContext } = useRoles();

  const currentRole: Role = (activeContext || role || "customer") as Role;

  const visibleGroups = NAV_GROUPS
    .filter((group) => {
      if (!group.showFor) return true;
      return group.showFor.includes(currentRole);
    })
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => {
        if (item.hideFor?.includes(currentRole)) return false;
        if (item.roles && !item.roles.includes(currentRole)) return false;
        if (item.permission && !hasPermission(currentRole, item.permission)) return false;
        return true;
      }),
    }))
    .filter((group) => group.items.length > 0);

  return (
    <aside className="fixed inset-y-0 left-0 w-64 bg-[#0d0f1a] border-r border-white/7 flex flex-col z-30 overflow-hidden">
      {/* Logo */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-white/7 flex-shrink-0">
        <Link href="/dashboard" className="flex items-center">
          <Logo variant="full" size="sm" />
        </Link>
        <div className="flex items-center gap-1.5">
          <RoleSwitcher />
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-5">
        {visibleGroups.map((group) => (
          <div key={group.label}>
            <p className="text-[10px] font-semibold text-[#2d3450] uppercase tracking-widest px-2 mb-1.5">
              {group.label}
            </p>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const active =
                  item.href === "/dashboard"
                    ? pathname === "/dashboard"
                    : pathname.startsWith(item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        "flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-all",
                        active
                          ? "bg-[rgba(255,101,36,0.12)] text-[#FF8B5E] font-medium"
                          : "text-[#64748b] hover:text-[#f1f5f9] hover:bg-white/5"
                      )}
                    >
                      <Icon size={15} className="flex-shrink-0" strokeWidth={active ? 2 : 1.75} />
                      <span className="truncate">{item.label}</span>
                      {item.badge && (
                        <span className="ml-auto text-[9px] font-bold bg-[rgba(255,101,36,0.2)] text-[#FF8B5E] px-1.5 py-0.5 rounded-full flex-shrink-0">
                          {item.badge}
                        </span>
                      )}
                      {active && !item.badge && (
                        <span className="ml-auto w-1 h-4 rounded-full bg-[#FF6524] opacity-80 flex-shrink-0" />
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Notifications strip */}
      <div className="flex-shrink-0 px-3 py-2 border-t border-white/7">
        <div className="flex items-center gap-2.5 px-2.5 py-1.5">
          <NotificationBell iconSize={15} />
          <span className="text-sm text-[#64748b]">Notifications</span>
        </div>
      </div>

      {/* Bottom — Admin + Settings + Identity */}
      <div className="flex-shrink-0 p-3 border-t border-white/7 space-y-0.5">
        {isAdminRole(currentRole) && (
          <Link
            href="/admin"
            className={cn(
              "flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-all",
              pathname.startsWith("/admin")
                ? "bg-[rgba(255,101,36,0.12)] text-[#FF8B5E]"
                : "text-[#F59E0B] hover:text-[#fbbf24] hover:bg-white/5"
            )}
          >
            <ShieldCheck size={15} className="flex-shrink-0" />
            <span>Admin Panel</span>
          </Link>
        )}
        {hasPermission(currentRole, "business.edit") && (
          <Link
            href="/dashboard/profile"
            className={cn(
              "flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-all",
              pathname === "/dashboard/profile"
                ? "bg-[rgba(255,101,36,0.12)] text-[#FF8B5E]"
                : "text-[#64748b] hover:text-[#f1f5f9] hover:bg-white/5"
            )}
          >
            <Building2 size={15} className="flex-shrink-0" />
            <span>Business Profile</span>
          </Link>
        )}
        {hasPermission(currentRole, "settings.view") && (
          <Link
            href="/dashboard/settings"
            className={cn(
              "flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-all",
              pathname.startsWith("/dashboard/settings")
                ? "bg-[rgba(255,101,36,0.12)] text-[#FF8B5E]"
                : "text-[#64748b] hover:text-[#f1f5f9] hover:bg-white/5"
            )}
          >
            <Settings size={15} className="flex-shrink-0" />
            <span>Settings</span>
          </Link>
        )}

        {/* User identity strip */}
        <Link
          href="/dashboard/identity"
          className="mt-2 flex items-center gap-2.5 px-2.5 py-2.5 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.1] hover:bg-white/[0.04] transition-all group"
        >
          <div className="w-8 h-8 rounded-xl overflow-hidden flex-shrink-0 bg-gradient-to-br from-[rgba(255,101,36,0.2)] to-[rgba(255,101,36,0.05)] flex items-center justify-center">
            {(profile as { avatar_url?: string | null } | null)?.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={(profile as { avatar_url?: string | null } | null)?.avatar_url ?? ""}
                alt="You"
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-[#FF8B5E] text-xs font-black">
                {profile?.full_name?.[0] ?? "?"}
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-[#94a3b8] truncate group-hover:text-[#f1f5f9] transition-colors">
              {profile?.full_name ?? "Your Profile"}
            </p>
            <p className="text-[10px] text-[#374151] capitalize">
              {currentRole?.replace(/_/g, " ")}
            </p>
          </div>
          <ChevronRight size={12} className="text-[#374151] group-hover:text-[#64748b] transition-colors flex-shrink-0" />
        </Link>
      </div>
    </aside>
  );
}
