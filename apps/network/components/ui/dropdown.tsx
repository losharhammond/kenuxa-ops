"use client";

import { cn } from "@/lib/utils";
import { useEffect, useRef, useState } from "react";

interface DropdownItem {
  label: string;
  icon?: string;
  onClick?: () => void;
  href?: string;
  variant?: "default" | "danger";
  divider?: boolean;
  disabled?: boolean;
}

interface DropdownProps {
  trigger: React.ReactNode;
  items: DropdownItem[];
  align?: "left" | "right";
  className?: string;
}

export function Dropdown({ trigger, items, align = "right", className }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  return (
    <div ref={ref} className={cn("relative inline-block", className)}>
      <div onClick={() => setOpen((v) => !v)} className="cursor-pointer">
        {trigger}
      </div>
      {open && (
        <div className={cn(
          "absolute z-50 top-full mt-1.5 min-w-[180px] bg-[#0d0f1a] border border-white/10 rounded-xl shadow-[0_16px_48px_rgba(0,0,0,0.4)] py-1 animate-fade-in",
          align === "right" ? "right-0" : "left-0"
        )}>
          {items.map((item, i) => {
            if (item.divider) {
              return <div key={i} className="my-1 border-t border-white/7" />;
            }
            return (
              <button
                key={i}
                onClick={() => { item.onClick?.(); setOpen(false); }}
                disabled={item.disabled}
                className={cn(
                  "w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors text-left",
                  "disabled:opacity-40 disabled:cursor-not-allowed",
                  item.variant === "danger"
                    ? "text-[#f87171] hover:bg-[rgba(239,68,68,0.08)]"
                    : "text-[#f1f5f9] hover:bg-white/5"
                )}
              >
                {item.icon && <span className="text-base">{item.icon}</span>}
                {item.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
