import type { ReactNode } from "react";
import { cn, formatCurrency, formatNumber } from "@/lib/utils";
import { Card } from "./card";
import { TrendingUp, TrendingDown } from "lucide-react";

interface StatCardProps {
  title: string;
  value: number | string;
  change?: number;
  format?: "currency" | "number" | "plain";
  currency?: string;
  icon?: ReactNode;
  color?: "orange" | "green" | "blue" | "amber" | "red";
  className?: string;
}

const COLOR_CONFIG = {
  orange: {
    border: "border-[rgba(255,101,36,0.2)]",
    grad: "from-[rgba(255,101,36,0.08)]",
    dot: "bg-[#FF6524]",
    text: "text-[#FF8B5E]",
  },
  green: {
    border: "border-[rgba(16,185,129,0.2)]",
    grad: "from-[rgba(16,185,129,0.08)]",
    dot: "bg-[#10b981]",
    text: "text-[#34d399]",
  },
  blue: {
    border: "border-[rgba(59,130,246,0.2)]",
    grad: "from-[rgba(59,130,246,0.08)]",
    dot: "bg-[#3B82F6]",
    text: "text-[#93c5fd]",
  },
  amber: {
    border: "border-[rgba(245,158,11,0.2)]",
    grad: "from-[rgba(245,158,11,0.08)]",
    dot: "bg-[#F59E0B]",
    text: "text-[#fbbf24]",
  },
  red: {
    border: "border-[rgba(239,68,68,0.2)]",
    grad: "from-[rgba(239,68,68,0.08)]",
    dot: "bg-[#ef4444]",
    text: "text-[#f87171]",
  },
};

export function StatCard({
  title,
  value,
  change,
  format = "plain",
  currency = "GHS",
  color = "orange",
  className,
}: StatCardProps) {
  const cfg = COLOR_CONFIG[color];

  const formatted =
    format === "currency"
      ? formatCurrency(Number(value), currency)
      : format === "number"
      ? formatNumber(Number(value))
      : String(value);

  const isPositive = change !== undefined && change >= 0;

  return (
    <Card className={cn("bg-gradient-to-br", cfg.grad, "to-transparent", cfg.border, "p-5", className)}>
      <div className="flex items-center gap-2 mb-3">
        <div className={cn("w-1.5 h-1.5 rounded-full", cfg.dot)} />
        <p className="text-xs font-medium text-[#64748b] uppercase tracking-wider truncate">{title}</p>
      </div>
      <p className="text-2xl font-bold text-[#f1f5f9] truncate">{formatted}</p>
      {change !== undefined && (
        <div className={cn("flex items-center gap-1 mt-2 text-xs font-medium", isPositive ? "text-[#34d399]" : "text-[#f87171]")}>
          {isPositive
            ? <TrendingUp size={11} />
            : <TrendingDown size={11} />}
          {Math.abs(change)}% vs last month
        </div>
      )}
    </Card>
  );
}
