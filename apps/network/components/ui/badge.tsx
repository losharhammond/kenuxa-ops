import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full text-xs font-medium px-2.5 py-0.5 border",
  {
    variants: {
      variant: {
        default:  "bg-white/5 text-[#f1f5f9] border-white/10",
        orange:   "bg-[rgba(255,101,36,0.15)] text-[#FF8B5E] border-[rgba(255,101,36,0.3)]",
        green:    "bg-[rgba(16,185,129,0.15)] text-[#34d399] border-[rgba(16,185,129,0.3)]",
        red:      "bg-[rgba(239,68,68,0.15)] text-[#f87171] border-[rgba(239,68,68,0.3)]",
        amber:    "bg-[rgba(245,158,11,0.15)] text-[#fbbf24] border-[rgba(245,158,11,0.3)]",
        blue:     "bg-[rgba(59,130,246,0.15)] text-[#93c5fd] border-[rgba(59,130,246,0.3)]",
        violet:   "bg-[rgba(124,58,237,0.15)] text-[#a78bfa] border-[rgba(124,58,237,0.3)]",
        verified: "bg-[rgba(16,185,129,0.15)] text-[#34d399] border-[rgba(16,185,129,0.3)]",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
