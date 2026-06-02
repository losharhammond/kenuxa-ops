"use client";

import { Search, Bell, ChevronDown } from "lucide-react";
import { useAuth } from "@/lib/hooks/use-auth";
import { ROLE_LABELS, ROLE_COLORS } from "@/lib/rbac";
import { useState, useRef } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

interface HeaderProps {
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export function Header({ title, subtitle, actions }: HeaderProps) {
  const { profile, role } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const router = useRouter();
  // Stable client ref — never recreated across renders
  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;

  const initials = profile?.full_name
    ? profile.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : "GH";

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <header className="h-16 flex items-center justify-between px-6 border-b border-white/7 bg-[#07080f]/80 backdrop-blur-lg sticky top-0 z-20">
      <div>
        {title && (
          <h1 className="text-base font-semibold text-[#f1f5f9] leading-tight">{title}</h1>
        )}
        {subtitle && <p className="text-xs text-[#64748b]">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-2.5">
        {/* Search */}
        <div className="hidden md:flex items-center gap-2 bg-[#111624] border border-white/7 rounded-lg px-3 h-9 w-56 hover:border-white/15 transition-colors">
          <Search size={13} className="text-[#64748b] flex-shrink-0" />
          <input
            type="text"
            placeholder="Search anything…"
            className="bg-transparent border-none outline-none text-sm text-[#f1f5f9] placeholder:text-[#374151] w-full p-0"
          />
          <kbd className="hidden lg:block text-[10px] text-[#374151] bg-white/5 px-1.5 py-0.5 rounded border border-white/7 flex-shrink-0">⌘K</kbd>
        </div>

        {actions}

        {/* Notifications */}
        <button className="relative w-9 h-9 flex items-center justify-center rounded-lg bg-[#111624] border border-white/7 hover:border-white/20 transition-colors text-[#64748b] hover:text-[#f1f5f9]">
          <Bell size={15} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#FF6524] rounded-full ring-2 ring-[#07080f]" />
        </button>

        {/* User menu */}
        <div className="relative">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="flex items-center gap-2 h-9 pl-1 pr-2 rounded-lg hover:bg-white/5 transition-colors"
          >
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#FF6524] to-[#F59E0B] flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0">
              {initials}
            </div>
            <div className="hidden md:block text-left">
              <p className="text-xs font-medium text-[#f1f5f9] leading-tight">{profile?.full_name ?? "My Account"}</p>
              {role && (
                <p className="text-[10px] leading-tight" style={{ color: ROLE_COLORS[role] }}>
                  {ROLE_LABELS[role]}
                </p>
              )}
            </div>
            <ChevronDown size={13} className="text-[#64748b] hidden md:block" />
          </button>

          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-11 z-20 w-48 bg-[#111624] border border-white/10 rounded-xl shadow-2xl overflow-hidden animate-slide-up py-1">
                <Link href="/dashboard/profile" onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-[#f1f5f9] hover:bg-white/5 transition-colors">
                  Profile
                </Link>
                <Link href="/dashboard/settings" onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-[#f1f5f9] hover:bg-white/5 transition-colors">
                  Settings
                </Link>
                <div className="h-px bg-white/7 my-1" />
                <button
                  onClick={handleSignOut}
                  className="w-full text-left flex items-center gap-2.5 px-4 py-2.5 text-sm text-[#f87171] hover:bg-[rgba(239,68,68,0.08)] transition-colors"
                >
                  Sign out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
