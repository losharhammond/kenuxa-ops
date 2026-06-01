import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Zap, Network, Shield, Globe, TrendingUp, Rocket } from "lucide-react";

export const metadata: Metadata = {
  title: "About KENUXA — The Economic Network",
  description: "KENUXA Technologies Ltd. — building the economic operating system for fast-growing markets.",
};

const VALUES = [
  { icon: Zap,        title: "Economic Access",      desc: "Every individual and business deserves access to world-class tools, financing, and market connections — regardless of size.", color: "#FF8B5E" },
  { icon: Shield,     title: "Trust First",           desc: "Verified identity, KYC/KYB, and ledger-grade accounting at every layer. Trust is the foundation of economic activity.",     color: "#3b82f6" },
  { icon: Network,    title: "Network Effects",       desc: "Every user, business, and transaction on KENUXA makes the network stronger, smarter, and more valuable for everyone.",       color: "#10b981" },
  { icon: TrendingUp, title: "Mass Adoption",         desc: "Pricing, infrastructure, and design that works at scale across 54 countries — from a kiosk in Kumasi to a chain in Lagos.", color: "#8b5cf6" },
];

const MILESTONES = [
  { year: "2023", event: "KENUXA founded in Accra, Ghana. Mission: one platform for all economic roles." },
  { year: "2024", event: "Core platform launched — POS, Inventory, CRM, Marketplace, Jobs, and Services." },
  { year: "2025", event: "KENUX Economy launched. Wallet infrastructure, Paystack integration, Financial Services." },
  { year: "2026", event: "Phase 4: KENUXA goes live across 54 countries. Full production deployment." },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#060810] text-[#f1f5f9]">
      {/* Nav */}
      <header className="border-b border-white/[0.05] bg-[#060810]/95 backdrop-blur-2xl">
        <div className="max-w-5xl mx-auto px-5 h-[62px] flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-[11px] bg-gradient-to-br from-[#FF6524] to-[#F59E0B] flex items-center justify-center text-white font-black text-base">K</div>
            <span className="font-black text-[#f1f5f9] tracking-tight text-lg">KENUXA</span>
          </Link>
          <Link href="/" className="flex items-center gap-1.5 text-sm text-[#4a5578] hover:text-[#f1f5f9] transition-colors">
            <ArrowLeft size={14} /> Back to Home
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-5 py-20 space-y-24">
        {/* Hero */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2 bg-[rgba(255,101,36,0.08)] border border-[rgba(255,101,36,0.18)] rounded-full px-5 py-2 text-xs font-bold text-[#FF8B5E] mb-8 tracking-wide">
            <Globe size={11} /> KENUXA Technologies Ltd.
          </div>
          <h1 className="text-5xl sm:text-6xl font-black mb-6 leading-tight">
            The Economic Network<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF6524] to-[#F59E0B]">for Fast-Growing Markets</span>
          </h1>
          <p className="text-[#4a5578] text-lg max-w-2xl mx-auto leading-relaxed">
            KENUXA was born from a simple observation: fast-growing markets have millions of businesses, workers, suppliers, and consumers — but no single platform connects them with the tools and finance they need to grow.
          </p>
        </div>

        {/* Mission */}
        <div className="relative p-10 rounded-3xl border border-[rgba(255,101,36,0.2)] bg-[rgba(255,101,36,0.03)] overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,101,36,0.08)_0%,transparent_60%)] pointer-events-none" />
          <div className="relative">
            <p className="text-xs font-bold text-[#FF8B5E] uppercase tracking-[0.2em] mb-4">Our Mission</p>
            <p className="text-2xl sm:text-3xl font-black text-[#f1f5f9] leading-snug">
              &ldquo;Build the economic operating system that connects every business, worker, and financial institution — creating an economy where everyone can participate, transact, and prosper.&rdquo;
            </p>
          </div>
        </div>

        {/* Values */}
        <div>
          <h2 className="text-3xl font-black mb-8 text-center">What We Stand For</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {VALUES.map(({ icon: Icon, title, desc, color }) => (
              <div key={title} className="p-6 rounded-2xl border border-white/[0.07] bg-[#0b0e1a]">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${color}14` }}>
                    <Icon size={18} style={{ color }} />
                  </div>
                  <div>
                    <h3 className="font-bold text-[#f1f5f9] mb-2">{title}</h3>
                    <p className="text-sm text-[#64748b] leading-relaxed">{desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Timeline */}
        <div>
          <h2 className="text-3xl font-black mb-8 text-center">Our Journey</h2>
          <div className="space-y-4">
            {MILESTONES.map(({ year, event }, i) => (
              <div key={year} className="flex gap-6 items-start">
                <div className="flex-shrink-0 w-16 text-right">
                  <span className="text-sm font-black text-[#FF8B5E]">{year}</span>
                </div>
                <div className="flex flex-col items-center gap-1 flex-shrink-0">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#FF6524] mt-1" />
                  {i < MILESTONES.length - 1 && <div className="w-px h-12 bg-gradient-to-b from-[rgba(255,101,36,0.4)] to-transparent" />}
                </div>
                <p className="text-sm text-[#64748b] leading-relaxed pt-0.5">{event}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="text-center pt-8">
          <h2 className="text-3xl font-black mb-4">Join the Economic Network</h2>
          <p className="text-[#4a5578] mb-8">Be part of the fastest-growing economic platform for high-growth markets.</p>
          <div className="flex flex-col sm:flex-row justify-center gap-3">
            <Link href="/register">
              <button className="flex items-center gap-2 px-8 py-3.5 rounded-xl bg-gradient-to-r from-[#FF6524] to-[#F59E0B] text-white font-bold hover:opacity-90 transition-opacity shadow-[0_6px_20px_rgba(255,101,36,0.35)]">
                <Rocket size={15} /> Create Free Account
              </button>
            </Link>
            <Link href="/contact">
              <button className="flex items-center gap-2 px-8 py-3.5 rounded-xl border border-white/[0.1] text-[#7a86a0] font-semibold hover:border-white/[0.2] hover:text-[#f1f5f9] transition-all">
                Contact Us <ArrowRight size={14} />
              </button>
            </Link>
          </div>
        </div>
      </main>

      <footer className="border-t border-white/[0.05] py-8 px-5 text-center">
        <p className="text-xs text-[#2d3450]">© 2026 KENUXA Technologies Ltd. · <Link href="/privacy" className="hover:text-[#374151]">Privacy</Link> · <Link href="/terms" className="hover:text-[#374151]">Terms</Link></p>
      </footer>
    </div>
  );
}
