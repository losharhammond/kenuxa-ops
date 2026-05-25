import Link from "next/link";
import { Activity, BrainCircuit, Building2, GitBranch, KeyRound, Network, Workflow } from "lucide-react";

const items = [
  { href: "/dashboard", label: "Dashboard", icon: Activity },
  { href: "/ai", label: "AI Control", icon: BrainCircuit },
  { href: "/memory", label: "Memory", icon: Network },
  { href: "/events", label: "Events", icon: GitBranch },
  { href: "/integrations", label: "Integrations", icon: KeyRound },
  { href: "/organizations", label: "Organizations", icon: Building2 },
  { href: "/api/analytics", label: "Health API", icon: Workflow }
];

export function Navigation() {
  return (
    <aside className="hidden min-h-screen w-64 border-r border-border bg-black/18 px-4 py-6 lg:block">
      <div className="mb-8">
        <p className="text-xs uppercase tracking-[0.22em] text-accent">KENUXA CORE</p>
        <h1 className="mt-2 text-xl font-semibold">Shared Intelligence OS</h1>
      </div>
      <nav className="space-y-1">
        {items.map((item) => (
          <Link key={item.href} href={item.href} className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted transition hover:bg-white/6 hover:text-foreground">
            <item.icon className="h-4 w-4" />
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
