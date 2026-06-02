"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#07080f] flex flex-col items-center justify-center px-4 text-center">
      <div className="w-16 h-16 rounded-2xl bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.2)] flex items-center justify-center mb-5">
        <AlertTriangle size={28} className="text-[#f87171]" />
      </div>
      <h2 className="text-xl font-bold text-[#f1f5f9] mb-2">Something went wrong</h2>
      <p className="text-sm text-[#64748b] mb-6 max-w-sm">
        {error.message || "An unexpected error occurred. Please try again."}
      </p>
      <Button onClick={reset} className="gap-2">
        <RefreshCw size={14} />
        Try again
      </Button>
    </div>
  );
}
