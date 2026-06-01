import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Mail, MessageCircle, Building2, MapPin, Clock, Zap } from "lucide-react";

export const metadata: Metadata = {
  title: "Contact KENUXA — Get in Touch",
  description: "Contact KENUXA Technologies Ltd. — sales, support, partnerships, and compliance enquiries.",
};

const CONTACTS = [
  {
    label: "General Enquiries",
    email: "hello@kenuxa.com",
    icon: Mail,
    desc: "Platform questions, general support",
    color: "#FF8B5E",
  },
  {
    label: "Business Sales",
    email: "sales@kenuxa.com",
    icon: Building2,
    desc: "Enterprise plans, bulk licensing, demos",
    color: "#3b82f6",
  },
  {
    label: "Financial Partners",
    email: "partners@kenuxa.com",
    icon: Zap,
    desc: "Banks, MFIs, fintechs, API integration",
    color: "#10b981",
  },
  {
    label: "Privacy & Compliance",
    email: "privacy@kenuxa.com",
    icon: MessageCircle,
    desc: "Data requests, GDPR, DPO enquiries",
    color: "#8b5cf6",
  },
];

export default function ContactPage() {
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

      <main className="max-w-4xl mx-auto px-5 py-20">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-[rgba(255,101,36,0.08)] border border-[rgba(255,101,36,0.18)] rounded-full px-5 py-2 text-xs font-bold text-[#FF8B5E] mb-8 tracking-wide">
            <span className="w-1.5 h-1.5 bg-[#FF6524] rounded-full animate-pulse" />
            We respond within 24 hours
          </div>
          <h1 className="text-5xl font-black mb-5">Get in Touch</h1>
          <p className="text-[#4a5578] text-lg max-w-xl mx-auto leading-relaxed">
            Whether you&apos;re a business, financial partner, developer, or individual — we&apos;re here to help.
          </p>
        </div>

        {/* Contact cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-16">
          {CONTACTS.map(({ label, email, icon: Icon, desc, color }) => (
            <a key={label} href={`mailto:${email}`} className="group p-6 rounded-2xl border border-white/[0.07] bg-[#0b0e1a] hover:border-white/[0.15] transition-all">
              <div className="flex items-start gap-4">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 border border-white/[0.05]" style={{ background: `${color}14` }}>
                  <Icon size={20} style={{ color }} />
                </div>
                <div>
                  <p className="font-semibold text-[#f1f5f9] mb-0.5">{label}</p>
                  <p className="text-sm text-[#64748b] mb-1">{desc}</p>
                  <p className="text-sm font-medium group-hover:text-[#FF8B5E] transition-colors" style={{ color }}>{email}</p>
                </div>
              </div>
            </a>
          ))}
        </div>

        {/* Office info */}
        <div className="grid sm:grid-cols-3 gap-4">
          {[
            { icon: MapPin, label: "Headquarters", value: "Accra, Ghana", sub: "Airport City" },
            { icon: Clock,  label: "Business Hours", value: "Mon–Fri", sub: "8:00 AM – 6:00 PM GMT" },
            { icon: Zap,    label: "Response Time", value: "< 24 hours", sub: "for all enquiries" },
          ].map(({ icon: Icon, label, value, sub }) => (
            <div key={label} className="p-5 rounded-2xl border border-white/[0.07] bg-[#0b0e1a] text-center">
              <div className="w-10 h-10 rounded-xl bg-[rgba(255,101,36,0.1)] flex items-center justify-center mx-auto mb-3">
                <Icon size={18} className="text-[#FF8B5E]" />
              </div>
              <p className="text-xs text-[#64748b] mb-1">{label}</p>
              <p className="text-sm font-bold text-[#f1f5f9]">{value}</p>
              <p className="text-xs text-[#374151]">{sub}</p>
            </div>
          ))}
        </div>
      </main>

      <footer className="border-t border-white/[0.05] py-8 px-5 text-center">
        <p className="text-xs text-[#2d3450]">© 2026 KENUXA Technologies Ltd. · <Link href="/privacy" className="hover:text-[#374151]">Privacy</Link> · <Link href="/terms" className="hover:text-[#374151]">Terms</Link></p>
      </footer>
    </div>
  );
}
