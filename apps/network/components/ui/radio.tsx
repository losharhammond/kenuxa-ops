"use client";

import { cn } from "@/lib/utils";

interface RadioOption {
  value: string;
  label: string;
  description?: string;
  icon?: string;
}

interface RadioGroupProps {
  options: RadioOption[];
  value?: string;
  onChange: (value: string) => void;
  name: string;
  variant?: "default" | "card";
  className?: string;
}

export function RadioGroup({ options, value, onChange, name, variant = "default", className }: RadioGroupProps) {
  return (
    <div className={cn("space-y-2", variant === "card" && "grid grid-cols-2 gap-3 space-y-0", className)}>
      {options.map((opt) => (
        <label
          key={opt.value}
          className={cn(
            "flex items-start gap-3 cursor-pointer",
            variant === "card" && cn(
              "flex-col gap-2 p-4 rounded-xl border transition-all",
              value === opt.value
                ? "border-[rgba(255,101,36,0.5)] bg-[rgba(255,101,36,0.08)]"
                : "border-white/7 bg-[#111624] hover:border-white/20"
            )
          )}
        >
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0",
              value === opt.value
                ? "border-[#FF6524] bg-[#FF6524]"
                : "border-white/30 bg-transparent"
            )}>
              {value === opt.value && (
                <div className="w-1.5 h-1.5 rounded-full bg-white" />
              )}
            </div>
            <input
              type="radio"
              name={name}
              value={opt.value}
              checked={value === opt.value}
              onChange={() => onChange(opt.value)}
              className="sr-only"
            />
            {variant === "default" && (
              <div>
                <p className="text-sm font-medium text-[#f1f5f9]">{opt.label}</p>
                {opt.description && <p className="text-xs text-[#64748b]">{opt.description}</p>}
              </div>
            )}
          </div>
          {variant === "card" && (
            <div>
              {opt.icon && <div className="text-2xl mb-1">{opt.icon}</div>}
              <p className="text-sm font-semibold text-[#f1f5f9]">{opt.label}</p>
              {opt.description && <p className="text-xs text-[#64748b] mt-0.5">{opt.description}</p>}
            </div>
          )}
        </label>
      ))}
    </div>
  );
}
