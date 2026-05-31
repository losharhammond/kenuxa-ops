"use client";

import Link from "next/link";
import { type IndustryConfig } from "@/lib/hooks/use-industry";

interface Props {
  industry: IndustryConfig;
}

export function IndustryBanner({ industry }: Props) {
  if (industry.key === "default") return null;

  return (
    <div
      className="flex items-center justify-between px-4 py-2.5 rounded-xl border text-sm"
      style={{
        borderColor: `${industry.color}30`,
        background: `${industry.color}08`,
      }}
    >
      <div className="flex items-center gap-2">
        <span className="text-base">{industry.icon}</span>
        <span className="text-xs font-bold uppercase tracking-widest" style={{ color: industry.color }}>
          {industry.label}
        </span>
        <span className="text-xs text-[#64748b]">Mode Active</span>
      </div>
      <div className="flex gap-2">
        {industry.quickActions.slice(0, 3).map((a) => (
          <Link
            key={a.href + a.label}
            href={a.href}
            className="px-2.5 py-1 rounded-lg text-xs font-medium border border-white/7 text-[#64748b] hover:text-[#f1f5f9] hover:border-white/15 transition-all"
          >
            {a.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
