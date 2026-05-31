import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#07080f] grid-bg flex flex-col items-center justify-center px-4 text-center">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_30%_at_50%_50%,rgba(255,101,36,0.08)_0%,transparent_70%)]" />
      <div className="relative">
        <p className="text-8xl font-black text-[#FF6524] mb-4 opacity-20">404</p>
        <h1 className="text-2xl font-bold text-[#f1f5f9] mb-3 -mt-10">Page not found</h1>
        <p className="text-[#64748b] mb-8 max-w-sm">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link href="/dashboard"><Button>Go to Dashboard</Button></Link>
          <Link href="/"><Button variant="secondary">Homepage</Button></Link>
        </div>
      </div>
    </div>
  );
}
