import { cn } from "@/lib/utils";

interface LogoProps {
  variant?: "full" | "icon" | "wordmark";
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  mono?: boolean;
  light?: boolean;
  className?: string;
}

const SIZES = {
  xs: { icon: 20, text: "text-sm" },
  sm: { icon: 28, text: "text-base" },
  md: { icon: 36, text: "text-xl" },
  lg: { icon: 48, text: "text-2xl" },
  xl: { icon: 64, text: "text-4xl" },
};

/** KENUXA Network Icon Mark — Hexagonal network node */
function KenuxaIconMark({ size = 36, mono = false, light = false }: { size?: number; mono?: boolean; light?: boolean }) {
  const primary = mono ? (light ? "#ffffff" : "#000000") : "#FF6524";
  const secondary = mono ? (light ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.5)") : "#F59E0B";
  const s = size;

  return (
    <svg width={s} height={s} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Hexagonal outer ring */}
      <path
        d="M20 3L35.588 12V28L20 37L4.412 28V12L20 3Z"
        fill={`url(#kn-grad-${size})`}
        opacity="0.12"
      />
      <path
        d="M20 3L35.588 12V28L20 37L4.412 28V12L20 3Z"
        stroke={primary}
        strokeWidth="1.5"
        fill="none"
        opacity="0.4"
      />

      {/* Central node */}
      <circle cx="20" cy="20" r="4" fill={primary} />

      {/* Network connections — 6 outer nodes */}
      <circle cx="20" cy="8"  r="2.5" fill={secondary} />
      <circle cx="30" cy="14" r="2.5" fill={secondary} />
      <circle cx="30" cy="26" r="2.5" fill={secondary} />
      <circle cx="20" cy="32" r="2.5" fill={secondary} />
      <circle cx="10" cy="26" r="2.5" fill={secondary} />
      <circle cx="10" cy="14" r="2.5" fill={secondary} />

      {/* Connection lines */}
      <line x1="20" y1="16" x2="20" y2="10.5"  stroke={primary} strokeWidth="1" opacity="0.5" />
      <line x1="20" y1="16" x2="27.5" y2="15"  stroke={primary} strokeWidth="1" opacity="0.5" />
      <line x1="20" y1="16" x2="27.5" y2="25"  stroke={primary} strokeWidth="1" opacity="0.5" />
      <line x1="20" y1="24" x2="20" y2="29.5"  stroke={primary} strokeWidth="1" opacity="0.5" />
      <line x1="20" y1="24" x2="12.5" y2="25"  stroke={primary} strokeWidth="1" opacity="0.5" />
      <line x1="20" y1="24" x2="12.5" y2="15"  stroke={primary} strokeWidth="1" opacity="0.5" />

      {/* Gradient def */}
      <defs>
        <linearGradient id={`kn-grad-${size}`} x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={primary} />
          <stop offset="100%" stopColor={secondary} />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function Logo({ variant = "full", size = "sm", mono = false, light = false, className }: LogoProps) {
  const { icon: iconSize, text: textSize } = SIZES[size];
  const textColor = light ? "text-white" : mono ? "text-black" : "text-[#f1f5f9]";
  const subColor = light ? "text-white/60" : mono ? "text-black/50" : "text-[#FF6524]";

  if (variant === "icon") {
    return (
      <span className={cn("inline-flex items-center justify-center", className)}>
        <KenuxaIconMark size={iconSize} mono={mono} light={light} />
      </span>
    );
  }

  if (variant === "wordmark") {
    return (
      <span className={cn("inline-flex items-center", className)}>
        <span className={cn("font-black tracking-tight leading-none", textSize, textColor)}>
          KENU<span className={subColor}>XA</span>
        </span>
      </span>
    );
  }

  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <KenuxaIconMark size={iconSize} mono={mono} light={light} />
      <span className={cn("font-black tracking-tight leading-none", textSize, textColor)}>
        KENU<span className={subColor}>XA</span>
        {size !== "xs" && (
          <span className={cn("block font-medium tracking-widest uppercase", light ? "text-white/50" : "text-[#64748b]",
            size === "sm" ? "text-[8px]" : size === "md" ? "text-[9px]" : "text-[10px]"
          )}>
            Network
          </span>
        )}
      </span>
    </span>
  );
}

/** Compact K badge for favicons, app icons, avatars */
export function KenuxaBadge({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <rect width="40" height="40" rx="10" fill="#FF6524" />
      <rect width="40" height="40" rx="10" fill="url(#badge-grad)" opacity="0.6" />
      {/* K letterform */}
      <path d="M12 10H16V19L23 10H28L20.5 20L28 30H23L16 21V30H12V10Z" fill="white" />
      <defs>
        <linearGradient id="badge-grad" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FF8B5E" />
          <stop offset="100%" stopColor="#F59E0B" />
        </linearGradient>
      </defs>
    </svg>
  );
}
