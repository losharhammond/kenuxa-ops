import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Button } from "./button";

interface EmptyStateProps {
  icon?: ReactNode | string;
  title: string;
  description?: string;
  action?: ReactNode | { label: string; onClick: () => void };
  secondaryAction?: ReactNode | { label: string; onClick: () => void };
  className?: string;
}

function isActionObj(a: unknown): a is { label: string; onClick: () => void } {
  return typeof a === "object" && a !== null && "label" in a && "onClick" in a;
}

export function EmptyState({ icon, title, description, action, secondaryAction, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-16 px-8 text-center", className)}>
      {icon && (
        <div className="w-16 h-16 rounded-2xl bg-[rgba(255,101,36,0.08)] border border-[rgba(255,101,36,0.15)] flex items-center justify-center text-3xl mb-4">
          {icon}
        </div>
      )}
      <h3 className="text-base font-semibold text-[#f1f5f9] mb-2">{title}</h3>
      {description && (
        <p className="text-sm text-[#64748b] max-w-sm leading-relaxed mb-6">{description}</p>
      )}
      {(action || secondaryAction) && (
        <div className="flex items-center gap-3">
          {secondaryAction && (
            isActionObj(secondaryAction)
              ? <Button variant="secondary" size="md" onClick={secondaryAction.onClick}>{secondaryAction.label}</Button>
              : secondaryAction
          )}
          {action && (
            isActionObj(action)
              ? <Button size="md" onClick={action.onClick}>{action.label}</Button>
              : action
          )}
        </div>
      )}
    </div>
  );
}
