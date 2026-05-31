"use client";

import { cn } from "@/lib/utils";
import { createContext, useContext, useState, useCallback, useEffect } from "react";

type ToastVariant = "success" | "error" | "warning" | "info";

interface Toast {
  id: string;
  message: string;
  variant?: ToastVariant;
  duration?: number;
}

interface ToastContextValue {
  toasts: Toast[];
  toast: (message: string, variant?: ToastVariant, duration?: number) => void;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue>({
  toasts: [],
  toast: () => {},
  dismiss: () => {},
});

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((message: string, variant: ToastVariant = "info", duration = 4000) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, message, variant, duration }]);
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, toast, dismiss }}>
      {children}
      <ToastContainer />
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}

const variantStyles: Record<ToastVariant, string> = {
  success: "border-[rgba(16,185,129,0.4)] bg-[rgba(16,185,129,0.1)] text-[#34d399]",
  error:   "border-[rgba(239,68,68,0.4)] bg-[rgba(239,68,68,0.1)] text-[#f87171]",
  warning: "border-[rgba(245,158,11,0.4)] bg-[rgba(245,158,11,0.1)] text-[#fbbf24]",
  info:    "border-[rgba(59,130,246,0.4)] bg-[rgba(59,130,246,0.1)] text-[#93c5fd]",
};

const variantIcons: Record<ToastVariant, string> = {
  success: "✓",
  error:   "✕",
  warning: "⚠",
  info:    "ℹ",
};

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, toast.duration ?? 4000);
    return () => clearTimeout(timer);
  }, [toast.duration, onDismiss]);

  return (
    <div className={cn(
      "flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg animate-slide-up",
      "min-w-[280px] max-w-sm",
      variantStyles[toast.variant ?? "info"]
    )}>
      <span className="text-base flex-shrink-0">{variantIcons[toast.variant ?? "info"]}</span>
      <p className="text-sm flex-1">{toast.message}</p>
      <button onClick={onDismiss} className="text-xs opacity-60 hover:opacity-100 ml-2">✕</button>
    </div>
  );
}

function ToastContainer() {
  const { toasts, dismiss } = useContext(ToastContext);
  if (!toasts.length) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
      ))}
    </div>
  );
}
