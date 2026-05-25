"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import Link from "next/link";
import { useRef, useState, useEffect } from "react";
import {
  ArrowRight, BrainCircuit, CircuitBoard, Database,
  GitBranch, Globe, Network, Shield,
  Workflow, Zap, ChevronRight, Activity, Coins,
} from "lucide-react";

/* ── Counter component ──────────────────────────────────────── */
function Counter({ to, suffix = "" }: { to: number; suffix?: string }) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    const step = Math.ceil(to / 60);
    const timer = setInterval(() => {
      setVal(v => {
        if (v + step >= to) { clearInterval(timer); return to; }
        return v + step;
      });
    }, 24);
    return () => clearInterval(timer);
  }, [to]);
  return <>{val.toLocaleString()}{suffix}</>;
}

/* ── Animated mesh orb ──────────────────────────────────────── */
function MeshOrb({ className }: { className: string }) {
  return (
    <div className={`absolute rounded-full blur-3xl pointer-events-none ${className}`} />
  );
}

/* ── Neural node ────────────────────────────────────────────── */
function NeuralNode({ x, y, delay, size = 4 }: { x: number; y: number; delay: number; size?: number }) {
  return (
    <motion.div
      className="absolute rounded-full bg-violet/40"
      style={{ left: `${x}%`, top: `${y}%`, width: size, height: size }}
      animate={{ opacity: [0.2, 0.8, 0.2], scale: [1, 1.4, 1] }}
      transition={{ duration: 3 + delay, repeat: Infinity, ease: "easeInOut", delay }}
    />
  );
}

/* ── Feature card ───────────────────────────────────────────── */
function FeatureCard({
  icon: Icon,
  title,
  description,
  accent,
  href,
}: {
  icon:        React.ElementType;
  title:       string;
  description: string;
  accent:      string;
  href:        string;
}) {
  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.01 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      <Link href={href} className="group block rounded-2xl border border-white/[0.07] bg-surface/60 p-6 backdrop-blur-sm transition-all hover:border-violet/30 hover:bg-surface">
        <div className={`mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl ${accent} ring-1 ring-white/10`}>
          <Icon className="h-5 w-5" />
        </div>
        <h3 className="mb-2 text-[15px] font-semibold text-white">{title}</h3>
        <p className="text-[13px] leading-relaxed text-[#64748b]">{description}</p>
        <div className="mt-4 flex items-center gap-1 text-[12px] font-medium text-violet-light opacity-0 transition-opacity group-hover:opacity-100">
          Explore <ChevronRight className="h-3 w-3" />
        </div>
      </Link>
    </motion.div>
  );
}

/* ── Product orbit card ─────────────────────────────────────── */
function ProductCard({
  name,
  tag,
  color,
  status,
}: {
  name:   string;
  tag:    string;
  color:  string;
  status: string;
}) {
  return (
    <div className={`rounded-2xl border p-4 ${color}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest opacity-70">{tag}</p>
          <p className="mt-0.5 text-sm font-bold text-white">{name}</p>
        </div>
        <span className="rounded-full border border-current/20 bg-current/10 px-2 py-0.5 text-[9px] font-semibold uppercase">
          {status}
        </span>
      </div>
    </div>
  );
}

/* ── Main landing page ──────────────────────────────────────── */
const FEATURES = [
  {
    icon:        BrainCircuit,
    title:       "AI Orchestration Layer",
    description: "Multi-provider AI routing with Groq, OpenAI, and Anthropic. Context assembly, memory injection, usage tracking — one unified gateway for the entire ecosystem.",
    accent:      "bg-violet/15 text-violet-light",
    href:        "/ai",
  },
  {
    icon:        Database,
    title:       "Memory Engine",
    description: "Persistent intelligence layer with 7 typed memory categories, semantic search via pgvector, and long-term contextual recall across all products.",
    accent:      "bg-indigo/15 text-[#818cf8]",
    href:        "/memory",
  },
  {
    icon:        GitBranch,
    title:       "Distributed Event Bus",
    description: "Postgres-backed event system with retries, subscriptions, and webhook triggers. Connect products and automate cross-system reactions.",
    accent:      "bg-cyan/10 text-cyan",
    href:        "/events",
  },
  {
    icon:        Network,
    title:       "Knowledge Graph",
    description: "Connected entity intelligence for people, businesses, markets, and signals. Relationship mapping and ecosystem analysis at every scale.",
    accent:      "bg-violet/15 text-violet-light",
    href:        "/graph",
  },
  {
    icon:        Workflow,
    title:       "Automation Engine",
    description: "Trigger-condition-action workflows with event reactions, schedules, and webhooks. No-code automation foundation for all KENUXA products.",
    accent:      "bg-indigo/15 text-[#818cf8]",
    href:        "/workflows",
  },
  {
    icon:        Shield,
    title:       "Security & Permissions",
    description: "Row-level security, organization isolation, JWT authentication, rate limiting, audit logging, and role-based access control built into every layer.",
    accent:      "bg-emerald/10 text-[#10b981]",
    href:        "/organizations",
  },
  {
    icon:        Coins,
    title:       "KENUX Wallet Economy",
    description: "Built-in token economy powering AI compute, automation credits, marketplace transactions, and subscription billing across every KENUXA product.",
    accent:      "bg-amber-500/15 text-amber-400",
    href:        "/wallet",
  },
];

const NODES = [
  { x: 12, y: 20, delay: 0 }, { x: 85, y: 15, delay: 0.5 },
  { x: 30, y: 60, delay: 1 }, { x: 70, y: 55, delay: 1.5 },
  { x: 50, y: 30, delay: 0.3 }, { x: 20, y: 80, delay: 0.8 },
  { x: 90, y: 70, delay: 1.2 }, { x: 45, y: 85, delay: 0.6 },
];

export default function LandingPage() {
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef });
  const heroOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
  const heroY       = useTransform(scrollYProgress, [0, 0.5], [0, -60]);

  return (
    <div className="min-h-screen bg-bg text-white overflow-x-hidden">

      {/* ── Fixed nav ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex h-16 items-center justify-between px-6 md:px-12 backdrop-blur-xl border-b border-white/[0.06] bg-bg/60">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet/15 ring-1 ring-violet/30">
            <CircuitBoard className="h-4 w-4 text-violet-light" />
          </div>
          <div>
            <span className="text-[10px] font-semibold uppercase tracking-widest text-violet-light">KENUXA</span>
            <span className="ml-1.5 text-sm font-bold text-white">CORE</span>
          </div>
        </div>
        <div className="hidden items-center gap-6 md:flex text-[13px] text-[#64748b]">
          {["AI Control", "Memory", "Events", "Graph", "Docs"].map(item => (
            <Link key={item} href={`/${item.toLowerCase().replace(" ", "-")}`} className="hover:text-white transition-colors">
              {item}
            </Link>
          ))}
        </div>
        <Link
          href="/dashboard"
          className="flex items-center gap-2 rounded-xl bg-violet px-4 py-2 text-[13px] font-semibold text-white shadow-glow-sm hover:bg-violet/90 transition-all"
        >
          Open Dashboard <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </nav>

      {/* ── Hero ── */}
      <section ref={heroRef} className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden pt-16">
        {/* Background mesh orbs */}
        <MeshOrb className="h-[600px] w-[600px] bg-violet/20 -top-20 left-1/2 -translate-x-1/2" />
        <MeshOrb className="h-[400px] w-[400px] bg-indigo/15 top-1/2 -left-32" />
        <MeshOrb className="h-[300px] w-[300px] bg-cyan/10 bottom-20 right-0" />

        {/* Grid bg */}
        <div className="absolute inset-0 grid-bg opacity-40" />

        {/* Neural nodes */}
        {NODES.map((n, i) => <NeuralNode key={i} {...n} />)}

        {/* Hero content */}
        <motion.div
          className="relative z-10 flex flex-col items-center text-center px-6 max-w-5xl"
          style={{ opacity: heroOpacity, y: heroY }}
        >
          {/* Eyebrow */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-6 flex items-center gap-2 rounded-full border border-violet/25 bg-violet/10 px-4 py-2 text-[12px] font-semibold text-violet-light"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-violet-light animate-pulse" />
            Phase 2 Premium Infrastructure · Now Live
          </motion.div>

          {/* Main headline */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="text-5xl md:text-7xl font-black leading-[0.95] tracking-tight"
          >
            The Operating
            <br />
            <span className="gradient-text">System</span> for
            <br />
            <span className="text-white">Africa&apos;s Intelligence</span>
          </motion.h1>

          {/* Sub */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.25 }}
            className="mt-6 max-w-2xl text-[17px] leading-relaxed text-[#64748b]"
          >
            KENUXA CORE is the shared authentication, AI orchestration, memory, event bus,
            knowledge graph, and automation infrastructure powering the entire KENUXA ecosystem.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.4 }}
            className="mt-10 flex items-center gap-4 flex-wrap justify-center"
          >
            <Link
              href="/dashboard"
              className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-violet to-indigo px-6 py-3 text-[14px] font-bold text-white shadow-glow-violet hover:opacity-90 transition-all"
            >
              <Zap className="h-4 w-4" />
              Open Command Center
            </Link>
            <Link
              href="/ai"
              className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-6 py-3 text-[14px] font-semibold text-white hover:bg-white/[0.08] transition-all"
            >
              Explore AI Gateway
              <ArrowRight className="h-4 w-4" />
            </Link>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.7 }}
            className="mt-14 flex items-center gap-10 md:gap-16 flex-wrap justify-center"
          >
            {[
              { value: 30, suffix: "+", label: "Database Tables" },
              { value: 20, suffix: "+", label: "API Routes" },
              { value: 7,  suffix: "",  label: "Memory Types" },
              { value: 6,  suffix: "",  label: "AI Providers" },
            ].map(s => (
              <div key={s.label} className="text-center">
                <p className="text-3xl font-black text-white">
                  <Counter to={s.value} suffix={s.suffix} />
                </p>
                <p className="mt-1 text-[12px] text-[#64748b]">{s.label}</p>
              </div>
            ))}
          </motion.div>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
          animate={{ opacity: [1, 0.4, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <div className="h-10 w-6 rounded-full border border-white/20 flex items-center justify-center">
            <motion.div
              className="h-1.5 w-1.5 rounded-full bg-white/60"
              animate={{ y: [0, 10, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
          </div>
        </motion.div>
      </section>

      {/* ── Live system preview ── */}
      <section className="relative overflow-hidden py-20 px-6 md:px-12">
        <div className="mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-10 text-center"
          >
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-violet-light">Live Infrastructure</p>
            <h2 className="text-3xl md:text-4xl font-black">
              The operating system,<br /><span className="gradient-text">in action.</span>
            </h2>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="relative rounded-3xl border border-white/[0.07] bg-[#080a12] overflow-hidden shadow-[0_40px_80px_rgba(0,0,0,0.6)]"
          >
            {/* Mock window chrome */}
            <div className="flex items-center gap-2 border-b border-white/[0.06] px-5 py-3">
              <span className="h-3 w-3 rounded-full bg-red-500/70" />
              <span className="h-3 w-3 rounded-full bg-amber-400/70" />
              <span className="h-3 w-3 rounded-full bg-emerald/70" />
              <span className="ml-4 text-[11px] font-mono text-[#374151]">KENUXA CORE — Command Center</span>
              <span className="ml-auto flex items-center gap-1.5 text-[10px] text-[#374151]">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald animate-pulse" />Live
              </span>
            </div>

            {/* Mock dashboard layout */}
            <div className="grid grid-cols-3 divide-x divide-white/[0.05]">
              {/* Left: system status */}
              <div className="p-5 space-y-2">
                <p className="text-[9px] font-bold uppercase tracking-widest text-[#374151] mb-3">System Status</p>
                {[
                  { name: "Auth Gateway",    ok: true,  ms: "12ms"  },
                  { name: "AI Orchestrator", ok: true,  ms: "248ms" },
                  { name: "Memory Engine",   ok: true,  ms: "28ms"  },
                  { name: "Event Bus",       ok: true,  ms: "4ms"   },
                  { name: "KENUX Wallet",    ok: true,  ms: "18ms"  },
                  { name: "Knowledge Graph", ok: false, ms: "—"     },
                ].map(({ name, ok, ms }) => (
                  <div key={name} className="flex items-center justify-between rounded-lg bg-white/[0.02] px-3 py-1.5">
                    <div className="flex items-center gap-2">
                      <span className={`h-1.5 w-1.5 rounded-full ${ok ? "bg-emerald" : "bg-amber-400"} ${ok ? "animate-pulse" : ""}`} />
                      <span className="text-[10px] text-[#64748b]">{name}</span>
                    </div>
                    <span className="font-mono text-[9px] text-[#374151]">{ms}</span>
                  </div>
                ))}
              </div>

              {/* Middle: live events */}
              <div className="p-5">
                <p className="text-[9px] font-bold uppercase tracking-widest text-[#374151] mb-3">Live Events</p>
                <div className="space-y-1.5">
                  {[
                    { type: "auth.session.created",   src: "REACH", ok: true  },
                    { type: "ai.inference.completed",  src: "OPS",   ok: true  },
                    { type: "memory.record.stored",    src: "REACH", ok: true  },
                    { type: "wallet.debit",            src: "CORE",  ok: true  },
                    { type: "event.webhook.failed",    src: "OPS",   ok: false },
                    { type: "graph.node.created",      src: "CORE",  ok: true  },
                    { type: "org.member.invited",      src: "CORE",  ok: true  },
                  ].map(({ type, src, ok }, i) => (
                    <motion.div
                      key={type}
                      initial={{ opacity: 0, x: -10 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.05 }}
                      className="flex items-center gap-2"
                    >
                      <span className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${ok ? "bg-emerald" : "bg-red-400"}`} />
                      <span className="flex-1 truncate font-mono text-[9px] text-[#64748b]">{type}</span>
                      <span className="rounded bg-white/[0.03] px-1.5 py-0.5 text-[8px] text-[#374151]">{src}</span>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Right: AI activity + wallet */}
              <div className="p-5 space-y-4">
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-widest text-[#374151] mb-3">AI Activity</p>
                  {[
                    { model: "llama3-70b", calls: 1847, pct: 72 },
                    { model: "gemini-1.5", calls: 241,  pct: 9  },
                    { model: "gpt-4o",     calls: 88,   pct: 3  },
                  ].map(({ model, calls, pct }) => (
                    <div key={model} className="mb-2">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-mono text-[9px] text-[#64748b]">{model}</span>
                        <span className="text-[9px] text-[#374151]">{calls.toLocaleString()}</span>
                      </div>
                      <div className="h-1 w-full overflow-hidden rounded-full bg-white/[0.05]">
                        <motion.div
                          initial={{ width: 0 }}
                          whileInView={{ width: `${pct}%` }}
                          viewport={{ once: true }}
                          transition={{ duration: 0.8 }}
                          className="h-full rounded-full bg-violet/50"
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="rounded-xl border border-amber-500/15 bg-amber-500/[0.04] p-3">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-amber-400/70 mb-2">KENUX Wallet</p>
                  <p className="text-lg font-black text-white">284,910</p>
                  <p className="text-[9px] text-[#374151]">tokens circulating</p>
                  <div className="mt-2 grid grid-cols-2 gap-1 text-[9px]">
                    <div className="rounded-lg bg-white/[0.03] px-2 py-1">
                      <p className="text-[#374151]">Today in</p>
                      <p className="font-bold text-emerald">+12,400</p>
                    </div>
                    <div className="rounded-lg bg-white/[0.03] px-2 py-1">
                      <p className="text-[#374151]">Today out</p>
                      <p className="font-bold text-red-400">-8,200</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Connected products ── */}
      <section className="py-24 px-6 md:px-12">
        <div className="mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-14 text-center"
          >
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-violet-light">
              Ecosystem
            </p>
            <h2 className="text-3xl md:text-4xl font-black">
              Products Powered by <span className="gradient-text">CORE</span>
            </h2>
            <p className="mt-4 text-[15px] text-[#64748b] max-w-xl mx-auto">
              Every KENUXA product connects through CORE for auth, AI, memory, and events.
            </p>
          </motion.div>

          {/* Connected diagram */}
          <div className="relative flex items-center justify-center py-10">
            {/* Center CORE node */}
            <motion.div
              animate={{ boxShadow: ["0 0 30px rgba(124,58,237,0.3)", "0 0 60px rgba(124,58,237,0.5)", "0 0 30px rgba(124,58,237,0.3)"] }}
              transition={{ duration: 3, repeat: Infinity }}
              className="relative z-10 flex h-24 w-24 items-center justify-center rounded-full bg-violet/20 ring-2 ring-violet/40"
            >
              <CircuitBoard className="h-10 w-10 text-violet-light" />
              <p className="absolute -bottom-7 text-[11px] font-bold text-violet-light">CORE</p>
            </motion.div>

            {/* Connection lines (decorative) */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-20" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#7c3aed" stopOpacity="0" />
                  <stop offset="50%" stopColor="#7c3aed" stopOpacity="1" />
                  <stop offset="100%" stopColor="#7c3aed" stopOpacity="0" />
                </linearGradient>
              </defs>
              <line x1="20%" y1="50%" x2="50%" y2="50%" stroke="url(#lineGrad)" strokeWidth="1" strokeDasharray="4 4" />
              <line x1="50%" y1="50%" x2="80%" y2="50%" stroke="url(#lineGrad)" strokeWidth="1" strokeDasharray="4 4" />
              <line x1="50%" y1="20%" x2="50%" y2="50%" stroke="url(#lineGrad)" strokeWidth="1" strokeDasharray="4 4" />
              <line x1="50%" y1="50%" x2="50%" y2="80%" stroke="url(#lineGrad)" strokeWidth="1" strokeDasharray="4 4" />
            </svg>
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <ProductCard name="KENUXA REACH" tag="Distribution Intel" color="border-violet/20 text-violet-light" status="Active" />
            <ProductCard name="KENUXA VOICE" tag="Conversational AI"  color="border-cyan/20 text-cyan"          status="Soon" />
            <ProductCard name="KENUXA Academy" tag="Learning Platform" color="border-indigo/20 text-[#818cf8]"  status="Soon" />
            <ProductCard name="KENUXA OPS" tag="Operations Suite"     color="border-emerald/20 text-[#10b981]"  status="Soon" />
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="py-24 px-6 md:px-12">
        <div className="mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-14 text-center"
          >
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-violet-light">
              Phase 2 Systems
            </p>
            <h2 className="text-3xl md:text-4xl font-black">
              Infrastructure First.<br />
              <span className="gradient-text">Intelligence Always.</span>
            </h2>
          </motion.div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
              >
                <FeatureCard {...f} />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Architecture principles ── */}
      <section className="py-24 px-6 md:px-12">
        <div className="mx-auto max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="rounded-3xl border border-violet/20 bg-violet/[0.06] p-10 md:p-14 text-center backdrop-blur-sm"
          >
            <CircuitBoard className="mx-auto mb-6 h-12 w-12 text-violet-light opacity-80" />
            <h2 className="text-3xl md:text-4xl font-black mb-4">
              Not a dashboard.<br />
              <span className="gradient-text">An operating system.</span>
            </h2>
            <p className="text-[15px] text-[#64748b] max-w-2xl mx-auto leading-relaxed mb-8">
              KENUXA CORE is headless-first. Products connect via APIs, events, and webhooks.
              Auth, AI, memory, and intelligence are shared infrastructure — never duplicated.
            </p>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 text-sm">
              {[
                { icon: Shield, label: "Row-Level Security" },
                { icon: Zap,    label: "Free-First AI" },
                { icon: Globe,  label: "54-Country Africa" },
                { icon: Activity, label: "Real-Time Events" },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="flex flex-col items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.03] p-3">
                  <Icon className="h-4 w-4 text-violet-light" />
                  <span className="text-[11px] text-[#94a3b8]">{label}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="relative overflow-hidden py-24 px-6 md:px-12 text-center">
        <MeshOrb className="h-[400px] w-[400px] bg-violet/20 top-0 left-1/2 -translate-x-1/2" />
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative z-10 mx-auto max-w-2xl"
        >
          <h2 className="text-4xl md:text-5xl font-black mb-6">
            The central nervous
            <br />
            <span className="gradient-text">system is live.</span>
          </h2>
          <p className="text-[15px] text-[#64748b] mb-10">
            Access the full command center. Monitor AI usage, manage events, explore the knowledge graph, and configure integrations.
          </p>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-3 rounded-2xl bg-gradient-to-r from-violet to-indigo px-8 py-4 text-[15px] font-bold text-white shadow-glow-violet hover:opacity-90 transition-all"
          >
            <CircuitBoard className="h-5 w-5" />
            Enter Command Center
            <ArrowRight className="h-5 w-5" />
          </Link>
        </motion.div>
      </section>

      {/* ── Footer ── */}
      {/* ── Phase 2 callout ── */}
      <section className="py-20 px-6 md:px-12">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: "KENUX Wallet",     desc: "Full token economy with escrow, transfers, and AI billing",     color: "border-amber-500/20 bg-amber-500/[0.04]",  text: "text-amber-400"   },
              { label: "Command Palette",  desc: "⌘K global search — navigate everything at keyboard speed",        color: "border-violet/20 bg-violet/[0.04]",        text: "text-violet-light" },
              { label: "OPS Bridge",       desc: "6 dedicated API routes for KENUXA OPS deep integration",          color: "border-emerald/20 bg-emerald/[0.04]",      text: "text-emerald"     },
              { label: "6 AI Providers",   desc: "Groq, OpenRouter, Gemini, Ollama, OpenAI, Anthropic in one gateway", color: "border-cyan-500/20 bg-cyan-500/[0.04]", text: "text-cyan-400"    },
            ].map(({ label, desc, color, text }) => (
              <motion.div
                key={label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className={`rounded-2xl border p-5 ${color}`}
              >
                <p className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${text}`}>New in Phase 2</p>
                <p className="text-[14px] font-bold text-white mb-2">{label}</p>
                <p className="text-[12px] text-[#64748b] leading-relaxed">{desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-white/[0.06] py-8 px-6 text-center">
        <p className="text-[12px] text-[#374151]">
          KENUXA CORE · Phase 2 · Africa&apos;s Premium Intelligence Infrastructure
        </p>
      </footer>
    </div>
  );
}
