import { cn, getInitials } from "@/lib/utils";

interface AvatarProps {
  name?: string;
  src?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
  shape?: "circle" | "square";
}

const sizeMap = {
  xs: "w-6 h-6 text-[10px]",
  sm: "w-8 h-8 text-xs",
  md: "w-10 h-10 text-sm",
  lg: "w-12 h-12 text-base",
  xl: "w-16 h-16 text-lg",
};

const shapeMap = {
  circle: "rounded-full",
  square: "rounded-xl",
};

export function Avatar({ name, src, size = "md", className, shape = "circle" }: AvatarProps) {
  const initials = name ? getInitials(name) : "?";

  return (
    <div className={cn(
      "flex-shrink-0 flex items-center justify-center font-bold bg-gradient-to-br from-[#FF6524] to-[#F59E0B] text-white overflow-hidden",
      sizeMap[size],
      shapeMap[shape],
      className
    )}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={name} className="w-full h-full object-cover" />
      ) : (
        initials
      )}
    </div>
  );
}

interface AvatarGroupProps {
  items: Array<{ name: string; src?: string }>;
  max?: number;
  size?: AvatarProps["size"];
}

export function AvatarGroup({ items, max = 4, size = "sm" }: AvatarGroupProps) {
  const visible = items.slice(0, max);
  const remaining = items.length - max;

  return (
    <div className="flex -space-x-2">
      {visible.map((item, i) => (
        <Avatar
          key={i}
          name={item.name}
          {...(item.src !== undefined ? { src: item.src } : {})}
          size={size}
          className="border-2 border-[#07080f]"
        />
      ))}
      {remaining > 0 && (
        <div className={cn(
          "flex items-center justify-center bg-[#111624] border-2 border-[#07080f] text-xs font-medium text-[#64748b] rounded-full",
          sizeMap[size]
        )}>
          +{remaining}
        </div>
      )}
    </div>
  );
}
