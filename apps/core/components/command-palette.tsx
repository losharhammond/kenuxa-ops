"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, ArrowRight, LayoutDashboard, Cpu, Brain, Zap, Network,
  Building2, Key, BarChart3, Settings, Wallet, Shield, Plug,
  CreditCard, Command,
} from "lucide-react";

// ─── Commands ─────────────────────────────────────────────────────────────────

const COMMANDS = [
  { id: "dashboard",     label: "Dashboard",          desc: "System overview",                  icon: LayoutDashboard, href: "/dashboard",    group: "Pages" },
  { id: "ai",            label: "AI Control Center",  desc: "Provider management",              icon: Cpu,             href: "/ai",           group: "Pages" },
  { id: "memory",        label: "Memory Explorer",    desc: "Semantic memory engine",           icon: Brain,           href: "/memory",       group: "Pages" },
  { id: "events",        label: "Event Monitor",      desc: "Event bus and subscriptions",      icon: Zap,             href: "/events",       group: "Pages" },
  { id: "graph",         label: "Knowledge Graph",    desc: "Entity relationships",             icon: Network,         href: "/graph",        group: "Pages" },
  { id: "workflows",     label: "Workflow Center",    desc: "Automation pipelines",             icon: ArrowRight,      href: "/workflows",    group: "Pages" },
  { id: "integrations",  label: "Integration Hub",   desc: "Connect services",                 icon: Plug,            href: "/integrations", group: "Pages" },
  { id: "organizations", label: "Organizations",      desc: "Team and org management",          icon: Building2,       href: "/organizations",group: "Pages" },
  { id: "keys",          label: "API Keys",           desc: "Manage API access",                icon: Key,             href: "/keys",         group: "Pages" },
  { id: "analytics",     label: "Analytics",          desc: "Usage and performance metrics",    icon: BarChart3,       href: "/analytics",    group: "Pages" },
  { id: "wallet",        label: "KENUX Wallet",       desc: "Token balance and transactions",   icon: Wallet,          href: "/wallet",       group: "Pages" },
  { id: "billing",       label: "Billing",            desc: "Plans and invoices",               icon: CreditCard,      href: "/billing",      group: "Pages" },
  { id: "security",      label: "Security Center",    desc: "Sessions and audit logs",          icon: Shield,          href: "/security",     group: "Pages" },
  { id: "settings",      label: "Settings",           desc: "Platform configuration",           icon: Settings,        href: "/settings",     group: "Pages" },
];

// ─── Props ────────────────────────────────────────────────────────────────────

interface CommandPaletteProps {
  open:    boolean;
  onClose: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const [query,     setQuery]     = useState("");
  const [selected,  setSelected]  = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = query
    ? COMMANDS.filter(c =>
        c.label.toLowerCase().includes(query.toLowerCase()) ||
        c.desc.toLowerCase().includes(query.toLowerCase())
      )
    : COMMANDS;

  const navigate = useCallback((href: string) => {
    window.location.href = href;
    onClose();
  }, [onClose]);

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;
    setQuery("");
    setSelected(0);
    setTimeout(() => inputRef.current?.focus(), 50);

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") { onClose(); return; }
      if (e.key === "ArrowDown") { e.preventDefault(); setSelected(s => Math.min(s + 1, filtered.length - 1)); }
      if (e.key === "ArrowUp")   { e.preventDefault(); setSelected(s => Math.max(s - 1, 0)); }
      if (e.key === "Enter" && filtered[selected]) { navigate(filtered[selected].href); }
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, filtered, selected, navigate, onClose]);

  useEffect(() => { setSelected(0); }, [query]);

  // Group by category
  const groups = filtered.reduce((acc, cmd) => {
    (acc[cmd.group] ??= []).push(cmd);
    return acc;
  }, {} as Record<string, typeof COMMANDS>);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          />

          {/* Palette */}
          <motion.div
            initial={{ opacity: 0, y: -16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="fixed left-1/2 top-[20%] z-50 w-full max-w-xl -translate-x-1/2 px-4"
          >
            <div className="overflow-hidden rounded-2xl border border-white/[0.1] bg-[#0d0f1a]/95 shadow-2xl shadow-black/60 backdrop-blur-2xl">
              {/* Search input */}
              <div className="flex items-center gap-3 border-b border-white/[0.07] px-4 py-3.5">
                <Search className="h-4 w-4 shrink-0 text-[#374151]" />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Search pages, actions, settings…"
                  className="flex-1 bg-transparent text-[14px] text-white placeholder-[#374151] outline-none"
                />
                <kbd className="flex items-center gap-1 rounded-md border border-white/[0.06] bg-white/[0.03] px-1.5 py-0.5 text-[10px] text-[#374151]">
                  <Command className="h-2.5 w-2.5" /> K
                </kbd>
              </div>

              {/* Results */}
              <div className="max-h-[400px] overflow-y-auto py-2">
                {filtered.length === 0 ? (
                  <div className="px-4 py-8 text-center text-[13px] text-[#374151]">No results for &quot;{query}&quot;</div>
                ) : (
                  Object.entries(groups).map(([group, cmds]) => (
                    <div key={group}>
                      <div className="px-4 py-2 text-[10px] font-semibold text-[#374151] uppercase tracking-[0.12em]">{group}</div>
                      {cmds.map((cmd) => {
                        const Icon = cmd.icon;
                        const globalIdx = filtered.indexOf(cmd);
                        return (
                          <button
                            key={cmd.id}
                            onClick={() => navigate(cmd.href)}
                            onMouseEnter={() => setSelected(globalIdx)}
                            className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                              selected === globalIdx ? "bg-violet-600/15" : "hover:bg-white/[0.03]"
                            }`}
                          >
                            <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-colors ${selected === globalIdx ? "bg-violet-500/20" : "bg-white/[0.04]"}`}>
                              <Icon className={`h-3.5 w-3.5 ${selected === globalIdx ? "text-violet-400" : "text-[#374151]"}`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`text-[13px] font-medium ${selected === globalIdx ? "text-white" : "text-slate-300"}`}>{cmd.label}</p>
                              <p className="text-[11px] text-[#374151] truncate">{cmd.desc}</p>
                            </div>
                            {selected === globalIdx && <ArrowRight className="h-3.5 w-3.5 text-violet-400 shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  ))
                )}
              </div>

              {/* Footer hint */}
              <div className="flex items-center gap-4 border-t border-white/[0.06] px-4 py-2.5">
                {[["↑↓", "Navigate"], ["↵", "Open"], ["Esc", "Close"]].map(([key, label]) => (
                  <div key={key} className="flex items-center gap-1.5">
                    <kbd className="rounded border border-white/[0.08] bg-white/[0.04] px-1.5 py-0.5 text-[10px] text-[#374151] font-mono">{key}</kbd>
                    <span className="text-[11px] text-[#374151]">{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
