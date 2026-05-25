"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Check, ChevronDown, Settings } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Org {
  id: string;
  name: string;
  slug: string;
  tier: "free" | "pro" | "business" | "enterprise";
  role: string;
  avatar?: string;
}

// ─── Mock data ────────────────────────────────────────────────────────────────

const MOCK_ORGS: Org[] = [
  { id: "org1", name: "KENUXA HQ",   slug: "kenuxa-hq",   tier: "enterprise", role: "Owner" },
  { id: "org2", name: "Acme Corp",   slug: "acme-corp",   tier: "business",   role: "Admin" },
  { id: "org3", name: "Demo Org",    slug: "demo-org",    tier: "free",       role: "Viewer" },
];

const TIER_COLORS: Record<string, string> = {
  free:       "text-[#64748b] bg-[#374151]/30",
  pro:        "text-violet-400 bg-violet-500/15",
  business:   "text-emerald-400 bg-emerald-500/15",
  enterprise: "text-amber-400 bg-amber-500/15",
};

function orgInitials(name: string) {
  return name.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase();
}

// ─── Component ────────────────────────────────────────────────────────────────

interface OrgSwitcherProps {
  collapsed?: boolean;
}

export function OrgSwitcher({ collapsed = false }: OrgSwitcherProps) {
  const [open,    setOpen]    = useState(false);
  const [current, setCurrent] = useState(MOCK_ORGS[0]);

  function select(org: Org) {
    setCurrent(org);
    setOpen(false);
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`flex w-full items-center gap-2.5 rounded-xl border border-white/[0.07] bg-white/[0.03] px-3 py-2.5 text-left transition-all hover:bg-white/[0.06] hover:border-white/[0.1] ${collapsed ? "justify-center px-2" : ""}`}
      >
        {/* Avatar */}
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600 to-violet-800 text-[10px] font-bold text-white">
          {orgInitials(current.name)}
        </div>

        {!collapsed && (
          <>
            <div className="flex-1 min-w-0">
              <p className="truncate text-[12px] font-semibold text-white leading-none">{current.name}</p>
              <p className="mt-0.5 text-[10px] text-[#374151] capitalize">{current.role}</p>
            </div>
            <ChevronDown className={`h-3.5 w-3.5 text-[#374151] transition-transform ${open ? "rotate-180" : ""}`} />
          </>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-40"
            />

            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.98 }}
              transition={{ duration: 0.15 }}
              className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-xl border border-white/[0.1] bg-[#0d0f1a]/95 shadow-xl shadow-black/50 backdrop-blur-2xl"
            >
              {/* Header */}
              <div className="border-b border-white/[0.06] px-3 py-2">
                <p className="text-[10px] font-semibold text-[#374151] uppercase tracking-[0.12em]">Organizations</p>
              </div>

              {/* Org list */}
              <div className="py-1.5">
                {MOCK_ORGS.map(org => (
                  <button
                    key={org.id}
                    onClick={() => select(org)}
                    className="flex w-full items-center gap-2.5 px-3 py-2 hover:bg-white/[0.05] transition-colors"
                  >
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600 to-violet-800 text-[10px] font-bold text-white">
                      {orgInitials(org.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-[12px] font-medium text-white">{org.name}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className={`rounded-sm px-1 py-px text-[9px] font-semibold uppercase ${TIER_COLORS[org.tier]}`}>{org.tier}</span>
                        <span className="text-[10px] text-[#374151]">·</span>
                        <span className="text-[10px] text-[#374151]">{org.role}</span>
                      </div>
                    </div>
                    {current.id === org.id && <Check className="h-3.5 w-3.5 text-violet-400 shrink-0" />}
                  </button>
                ))}
              </div>

              {/* Footer */}
              <div className="border-t border-white/[0.06] py-1.5">
                <button className="flex w-full items-center gap-2.5 px-3 py-2 text-[12px] text-[#374151] hover:bg-white/[0.05] hover:text-slate-400 transition-colors">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-dashed border-white/[0.1]">
                    <Plus className="h-3 w-3" />
                  </div>
                  Create organization
                </button>
                <button className="flex w-full items-center gap-2.5 px-3 py-2 text-[12px] text-[#374151] hover:bg-white/[0.05] hover:text-slate-400 transition-colors">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/[0.03]">
                    <Settings className="h-3 w-3" />
                  </div>
                  Org settings
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
