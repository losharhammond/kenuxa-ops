"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BrainCircuit, Building2, ChevronRight,
  CircuitBoard, Database, GitBranch,
  KeyRound, LayoutDashboard, Network, Settings, Workflow,
  BarChart3, Wallet, Shield, CreditCard, Plug,
} from "lucide-react";
import { OrgSwitcher } from "@/components/org-switcher";

interface NavItem {
  href:        string;
  label:       string;
  icon:        React.ElementType;
  badge?:      string;
  badgeColor?: string;
  new?:        boolean;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const GROUPS: NavGroup[] = [
  {
    label: "Overview",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    ],
  },
  {
    label: "Intelligence",
    items: [
      { href: "/ai",         label: "AI Control",      icon: BrainCircuit, badge: "Live" },
      { href: "/memory",     label: "Memory Engine",   icon: Database },
      { href: "/graph",      label: "Knowledge Graph", icon: Network },
    ],
  },
  {
    label: "Infrastructure",
    items: [
      { href: "/events",     label: "Event Bus",       icon: GitBranch },
      { href: "/workflows",  label: "Workflows",       icon: Workflow },
      { href: "/analytics",  label: "Analytics",       icon: BarChart3 },
    ],
  },
  {
    label: "Platform",
    items: [
      { href: "/organizations", label: "Organizations", icon: Building2 },
      { href: "/integrations",  label: "Integrations",  icon: Plug },
      { href: "/keys",          label: "API Keys",       icon: KeyRound },
    ],
  },
  {
    label: "Economy",
    items: [
      { href: "/wallet",   label: "KENUX Wallet", icon: Wallet, new: true },
      { href: "/billing",  label: "Billing",      icon: CreditCard, new: true },
      { href: "/security", label: "Security",     icon: Shield, new: true },
    ],
  },
];

function cn(...classes: (string | undefined | false)[]) {
  return classes.filter(Boolean).join(" ");
}

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-64 flex-shrink-0 flex-col border-r border-white/[0.07] bg-surface">
      {/* Logo */}
      <div className="flex items-center gap-3 border-b border-white/[0.07] px-5 py-4">
        <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-violet/15 ring-1 ring-violet/30">
          <CircuitBoard className="h-5 w-5 text-violet-light" />
          <span className="absolute right-0.5 top-0.5 h-2 w-2 rounded-full bg-emerald animate-pulse-glow" style={{ boxShadow: "0 0 6px #10b981" }} />
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-violet-light">KENUXA</p>
          <p className="text-sm font-bold text-white leading-tight">CORE</p>
        </div>
      </div>

      {/* Org switcher */}
      <div className="border-b border-white/[0.07] px-3 py-3">
        <OrgSwitcher />
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-4 overflow-y-auto px-3 py-4 scrollbar-thin">
        {GROUPS.map((group) => (
          <div key={group.label}>
            <p className="mb-1.5 px-3 text-[9px] font-semibold uppercase tracking-[0.2em] text-dim">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map(({ href, label, icon: Icon, badge, new: isNew }) => {
                const active = pathname === href || (href !== "/dashboard" && href !== "/" && pathname.startsWith(href));
                return (
                  <Link
                    key={href}
                    href={href}
                    className={cn(
                      "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                      active
                        ? "bg-violet/15 text-violet-light shadow-glow-sm"
                        : "text-[#64748b] hover:bg-white/[0.04] hover:text-slate-300"
                    )}
                  >
                    {active && (
                      <span className="absolute left-0 top-2 bottom-2 w-0.5 rounded-r-full bg-violet-light" />
                    )}
                    <Icon className={cn("h-4 w-4 flex-shrink-0 transition-colors", active ? "text-violet-light" : "text-dim group-hover:text-slate-400")} />
                    <span className="flex-1 leading-none">{label}</span>

                    {badge && !active && (
                      <span className="rounded-full bg-violet/20 px-1.5 py-0.5 text-[9px] font-bold text-violet-light">{badge}</span>
                    )}
                    {isNew && !active && (
                      <span className="rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[9px] font-bold text-emerald-400">NEW</span>
                    )}
                    {active && <ChevronRight className="h-3 w-3 text-violet/60" />}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-white/[0.07] p-3 space-y-0.5">
        <Link href="/settings" className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-[#64748b] hover:bg-white/[0.04] hover:text-slate-300 transition-all">
          <Settings className="h-4 w-4 text-dim" />
          Settings
        </Link>
        <div className="flex items-center gap-3 rounded-xl px-3 py-2">
          <div className="h-1.5 w-1.5 rounded-full bg-emerald animate-pulse" style={{ boxShadow: "0 0 6px #10b981" }} />
          <span className="text-[11px] text-[#374151]">All systems operational</span>
        </div>
      </div>
    </aside>
  );
}
