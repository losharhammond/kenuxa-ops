import { cn } from "@/lib/utils";
import { forwardRef } from "react";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, icon, iconRight, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="block text-xs font-medium text-[#64748b] mb-1.5">
            {label}
            {props.required && <span className="text-[#f87171] ml-0.5">*</span>}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-[#64748b]">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              "w-full bg-[#111624] border rounded-lg px-3 py-2.5 text-sm text-[#f1f5f9]",
              "placeholder:text-[#374151] outline-none transition-all",
              "border-white/7 focus:border-[#FF6524] focus:shadow-[0_0_0_3px_rgba(255,101,36,0.12)]",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              error && "border-[rgba(239,68,68,0.5)] focus:border-red-500 focus:shadow-[0_0_0_3px_rgba(239,68,68,0.1)]",
              icon && "pl-9",
              iconRight && "pr-9",
              className
            )}
            {...props}
          />
          {iconRight && (
            <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-[#64748b]">
              {iconRight}
            </div>
          )}
        </div>
        {error && <p className="text-xs text-[#f87171] mt-1.5">{error}</p>}
        {hint && !error && <p className="text-xs text-[#374151] mt-1.5">{hint}</p>}
      </div>
    );
  }
);
Input.displayName = "Input";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="block text-xs font-medium text-[#64748b] mb-1.5">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={inputId}
          className={cn(
            "w-full bg-[#111624] border rounded-lg px-3 py-2.5 text-sm text-[#f1f5f9] resize-none",
            "placeholder:text-[#374151] outline-none transition-all",
            "border-white/7 focus:border-[#FF6524] focus:shadow-[0_0_0_3px_rgba(255,101,36,0.12)]",
            error && "border-[rgba(239,68,68,0.5)]",
            className
          )}
          {...props}
        />
        {error && <p className="text-xs text-[#f87171] mt-1.5">{error}</p>}
      </div>
    );
  }
);
Textarea.displayName = "Textarea";

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options?: Array<{ value: string; label: string }>;
  children?: React.ReactNode;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, options, children, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="block text-xs font-medium text-[#64748b] mb-1.5">
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={inputId}
          className={cn(
            "w-full bg-[#111624] border rounded-lg px-3 py-2.5 text-sm text-[#f1f5f9]",
            "outline-none transition-all cursor-pointer appearance-none",
            "border-white/7 focus:border-[#FF6524] focus:shadow-[0_0_0_3px_rgba(255,101,36,0.12)]",
            error && "border-[rgba(239,68,68,0.5)]",
            className
          )}
          {...props}
        >
          {children ?? options?.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        {error && <p className="text-xs text-[#f87171] mt-1.5">{error}</p>}
      </div>
    );
  }
);
Select.displayName = "Select";
