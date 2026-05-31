import { cn } from "@/lib/utils";

interface ProgressProps {
  value: number;
  max?: number;
  label?: string;
  showValue?: boolean;
  color?: "orange" | "green" | "blue" | "amber" | "red";
  size?: "sm" | "md" | "lg";
  className?: string;
}

const colorMap = {
  orange: "bg-[#FF6524]",
  green:  "bg-[#10b981]",
  blue:   "bg-[#3B82F6]",
  amber:  "bg-[#F59E0B]",
  red:    "bg-[#ef4444]",
};

const sizeMap = {
  sm: "h-1.5",
  md: "h-2.5",
  lg: "h-4",
};

export function Progress({ value, max = 100, label, showValue, color = "orange", size = "md", className }: ProgressProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));

  return (
    <div className={cn("w-full", className)}>
      {(label || showValue) && (
        <div className="flex items-center justify-between mb-1.5">
          {label && <span className="text-xs text-[#64748b]">{label}</span>}
          {showValue && <span className="text-xs font-medium text-[#f1f5f9]">{pct.toFixed(0)}%</span>}
        </div>
      )}
      <div className={cn("w-full bg-[#111624] rounded-full overflow-hidden", sizeMap[size])}>
        <div
          className={cn("h-full rounded-full transition-all duration-500", colorMap[color])}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
