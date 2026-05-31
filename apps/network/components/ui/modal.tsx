"use client";

import { cn } from "@/lib/utils";
import { useEffect } from "react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const sizeMap = {
  sm: "max-w-sm",
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
};

export function Modal({ open, onClose, title, description, children, size = "md", className }: ModalProps) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />
      {/* Panel */}
      <div className={cn(
        "relative w-full bg-[#0d0f1a] border border-white/10 rounded-2xl shadow-[0_24px_64px_rgba(0,0,0,0.6)]",
        "animate-slide-up",
        sizeMap[size],
        className
      )}>
        {(title || description) && (
          <div className="px-6 py-5 border-b border-white/7">
            {title && <h2 className="text-base font-semibold text-[#f1f5f9]">{title}</h2>}
            {description && <p className="text-sm text-[#64748b] mt-1">{description}</p>}
          </div>
        )}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-lg text-[#64748b] hover:text-[#f1f5f9] hover:bg-white/5 transition-colors text-lg"
        >
          ×
        </button>
        {children}
      </div>
    </div>
  );
}

export function ModalContent({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("px-6 py-5", className)}>{children}</div>;
}

export function ModalFooter({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("px-6 py-4 border-t border-white/7 flex items-center justify-end gap-3", className)}>
      {children}
    </div>
  );
}
