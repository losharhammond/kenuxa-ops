"use client";

import { forwardRef } from "react";
import { cn } from "@/lib/utils";

interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  description?: string;
  error?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, description, error, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");
    return (
      <label htmlFor={inputId} className="flex items-start gap-3 cursor-pointer group">
        <div className="relative flex-shrink-0 mt-0.5">
          <input
            ref={ref}
            id={inputId}
            type="checkbox"
            className="sr-only peer"
            {...props}
          />
          <div className={cn(
            "w-4 h-4 rounded border transition-all",
            "border-white/20 bg-[#111624]",
            "peer-checked:bg-[#FF6524] peer-checked:border-[#FF6524]",
            "peer-focus:ring-2 peer-focus:ring-[rgba(255,101,36,0.3)]",
            "group-hover:border-white/40",
            error && "border-[rgba(239,68,68,0.5)]",
            className
          )}>
            <svg
              className="w-3 h-3 absolute top-0.5 left-0.5 text-white hidden peer-checked:block"
              viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2"
            >
              <path d="M2 6l3 3 5-5" />
            </svg>
          </div>
        </div>
        {(label || description) && (
          <div>
            {label && <p className="text-sm text-[#f1f5f9] font-medium">{label}</p>}
            {description && <p className="text-xs text-[#64748b] mt-0.5">{description}</p>}
            {error && <p className="text-xs text-[#f87171] mt-1">{error}</p>}
          </div>
        )}
      </label>
    );
  }
);
Checkbox.displayName = "Checkbox";
