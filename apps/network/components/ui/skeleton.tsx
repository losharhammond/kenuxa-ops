import { cn } from "@/lib/utils";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  width?: string | number;
  height?: string | number;
}

export function Skeleton({ className, width, height, style, ...props }: SkeletonProps) {
  return (
    <div
      className={cn("skeleton rounded-md", className)}
      style={{ width, height, ...style }}
      {...props}
    />
  );
}

export function SkeletonCard() {
  return (
    <div className="bg-[#111624] border border-white/7 rounded-xl p-5 space-y-3">
      <div className="flex items-center gap-3">
        <Skeleton width={44} height={44} className="rounded-xl" />
        <div className="flex-1 space-y-2">
          <Skeleton height={14} width="60%" />
          <Skeleton height={11} width="40%" />
        </div>
      </div>
      <Skeleton height={11} width="90%" />
      <Skeleton height={11} width="70%" />
      <Skeleton height={32} className="rounded-lg" />
    </div>
  );
}

export function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 py-3 px-4">
      <Skeleton width={36} height={36} className="rounded-full flex-shrink-0" />
      <div className="flex-1 space-y-1.5">
        <Skeleton height={13} width="50%" />
        <Skeleton height={10} width="35%" />
      </div>
      <Skeleton width={80} height={13} />
    </div>
  );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-0">
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonRow key={i} />
      ))}
    </div>
  );
}

export function SkeletonStats() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="bg-[#111624] border border-white/7 rounded-xl p-5">
          <Skeleton height={10} width="60%" className="mb-3" />
          <Skeleton height={28} width="70%" className="mb-2" />
          <Skeleton height={10} width="40%" />
        </div>
      ))}
    </div>
  );
}
