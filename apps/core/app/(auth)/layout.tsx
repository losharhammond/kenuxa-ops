"use client";

import { motion } from "framer-motion";
import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen bg-[#07080f] overflow-hidden flex items-center justify-center">

      {/* Ambient background glows */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-40 left-1/4 w-[600px] h-[600px] rounded-full bg-violet-600/10 blur-[120px]" />
        <div className="absolute top-1/2 right-0 w-[500px] h-[500px] rounded-full bg-cyan-600/8 blur-[100px]" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-emerald-600/6 blur-[80px]" />
        {/* Grid */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: "linear-gradient(rgba(255,255,255,0.3) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.3) 1px,transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
      </div>

      {/* Floating particles */}
      {[...Array(8)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full bg-violet-500/20"
          style={{
            width: Math.random() * 4 + 2,
            height: Math.random() * 4 + 2,
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
          }}
          animate={{
            y: [-20, 20, -20],
            opacity: [0.2, 0.6, 0.2],
          }}
          transition={{
            duration: 4 + i,
            repeat: Infinity,
            delay: i * 0.4,
          }}
        />
      ))}

      {/* Logo top-left */}
      <Link href="/" className="absolute top-6 left-6 flex items-center gap-2.5 group z-10">
        <div className="relative flex h-8 w-8 items-center justify-center">
          <div className="absolute inset-0 rounded-lg bg-violet-600/20 blur-sm group-hover:bg-violet-600/30 transition-all" />
          <div className="relative h-8 w-8 rounded-lg bg-gradient-to-br from-violet-500 to-violet-700 flex items-center justify-center text-xs font-black text-white shadow-lg shadow-violet-500/20">K</div>
        </div>
        <div>
          <span className="text-[13px] font-bold text-white tracking-tight">KENUXA</span>
          <span className="block text-[9px] text-[#64748b] font-medium tracking-[0.15em] uppercase">CORE</span>
        </div>
      </Link>

      {/* Main content */}
      <motion.div
        className="relative z-10 w-full max-w-md px-4"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      >
        {children}
      </motion.div>

      {/* Footer */}
      <div className="absolute bottom-4 left-0 right-0 flex items-center justify-center gap-4 text-[11px] text-[#374151]">
        <span>© 2026 KENUXA</span>
        <span>·</span>
        <Link href="/privacy" className="hover:text-slate-400 transition-colors">Privacy</Link>
        <span>·</span>
        <Link href="/terms" className="hover:text-slate-400 transition-colors">Terms</Link>
      </div>
    </div>
  );
}
