"use client";

import { useState, useEffect } from "react";
import { Bell, Search, Command } from "lucide-react";
import { CommandPalette } from "@/components/command-palette";
import { NotificationsPanel } from "@/components/notifications-panel";

interface TopbarProps {
  title:        string;
  description?: string;
  actions?:     React.ReactNode;
}

const UNREAD_COUNT = 3; // In production: fetched from notifications API

export function Topbar({ title, description, actions }: TopbarProps) {
  const [cmdOpen,  setCmdOpen]  = useState(false);
  const [bellOpen, setBellOpen] = useState(false);

  // ⌘K / Ctrl+K global shortcut
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCmdOpen(prev => !prev);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-white/[0.07] bg-surface/80 px-6 backdrop-blur-xl">
        {/* Title area */}
        <div className="flex-1 min-w-0">
          <h1 className="text-[15px] font-semibold text-white leading-none truncate">{title}</h1>
          {description && (
            <p className="mt-0.5 text-[11px] text-[#64748b] leading-none truncate">{description}</p>
          )}
        </div>

        {/* Custom actions slot */}
        {actions && <div className="flex items-center gap-2">{actions}</div>}

        {/* Right utilities */}
        <div className="flex items-center gap-1">
          {/* Search / Command palette trigger */}
          <button
            onClick={() => setCmdOpen(true)}
            className="flex h-8 items-center gap-2 rounded-lg border border-white/[0.06] bg-white/[0.02] px-2.5 text-[#374151] hover:bg-white/[0.05] hover:border-white/[0.1] hover:text-slate-300 transition-all"
          >
            <Search className="h-3.5 w-3.5 shrink-0" />
            <span className="hidden sm:flex items-center gap-1 text-[11px]">
              <Command className="h-3 w-3" />
              <span>K</span>
            </span>
          </button>

          {/* Notifications */}
          <button
            onClick={() => setBellOpen(prev => !prev)}
            className="relative flex h-8 w-8 items-center justify-center rounded-lg text-[#374151] hover:bg-white/[0.06] hover:text-slate-300 transition-all"
          >
            <Bell className="h-3.5 w-3.5" />
            {UNREAD_COUNT > 0 && (
              <span className="absolute right-1 top-1 flex h-[14px] min-w-[14px] items-center justify-center rounded-full bg-violet-600 px-0.5 text-[8px] font-bold text-white">
                {UNREAD_COUNT > 9 ? "9+" : UNREAD_COUNT}
              </span>
            )}
          </button>

          {/* Version badge */}
          <div className="ml-1 hidden sm:flex items-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.03] px-3 py-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" style={{ boxShadow: "0 0 4px #10b981" }} />
            <span className="text-[11px] font-medium text-[#64748b]">CORE v2.0</span>
          </div>
        </div>
      </header>

      {/* Command Palette */}
      <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} />

      {/* Notifications panel */}
      <NotificationsPanel open={bellOpen} onClose={() => setBellOpen(false)} />
    </>
  );
}
