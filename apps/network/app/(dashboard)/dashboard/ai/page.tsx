"use client";

import { useState, useRef, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/hooks/use-auth";
import Link from "next/link";
import {
  Sparkles, Send, User, Bot, TrendingUp, Briefcase, Package,
  BarChart3, Brain, Zap, ChevronRight, RefreshCw, Copy, Check,
  DollarSign, Users, Star, Shield, Lightbulb, Target, Globe,
  BookOpen, FileText, MessageSquare,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

// ─── AI Modules by role ───────────────────────────────────────────────────────
const AI_MODULES = {
  business: [
    { icon: TrendingUp,   label: "Revenue Forecast",   prompt: "Analyze my recent sales and forecast revenue for next month. What trends do you see?",            color: "text-green-400",  bg: "bg-green-400/10" },
    { icon: Package,      label: "Inventory Intel",    prompt: "Review my inventory levels and flag items that need reordering. Suggest optimal stock quantities.", color: "text-blue-400",   bg: "bg-blue-400/10" },
    { icon: Users,        label: "Customer Insights",  prompt: "Who are my best customers? What products do they buy most? How can I increase their value?",         color: "text-purple-400", bg: "bg-purple-400/10" },
    { icon: DollarSign,   label: "Cash Flow Analysis", prompt: "Analyze my payment data and identify cash flow risks. What actions should I take?",                 color: "text-yellow-400", bg: "bg-yellow-400/10" },
    { icon: Target,       label: "Growth Strategy",    prompt: "Based on my business data, suggest 3 specific growth strategies I can implement this quarter.",     color: "text-orange-400", bg: "bg-orange-400/10" },
    { icon: Shield,       label: "Risk Assessment",    prompt: "What business risks should I be aware of? Analyze my operational and financial exposure.",           color: "text-red-400",    bg: "bg-red-400/10" },
  ],
  career: [
    { icon: FileText,     label: "Improve My CV",      prompt: "Help me improve my professional profile and CV for the Ghanaian job market.",                       color: "text-blue-400",   bg: "bg-blue-400/10" },
    { icon: Briefcase,    label: "Job Matching",        prompt: "Based on my skills and experience, what types of jobs should I be applying for? What companies?",  color: "text-green-400",  bg: "bg-green-400/10" },
    { icon: BookOpen,     label: "Skill Gaps",          prompt: "What skills should I develop to advance my career in the next 12 months?",                          color: "text-purple-400", bg: "bg-purple-400/10" },
    { icon: Star,         label: "Interview Prep",      prompt: "Give me common interview questions for my field and how to answer them effectively.",                color: "text-yellow-400", bg: "bg-yellow-400/10" },
    { icon: Globe,        label: "Remote Work Guide",   prompt: "How can I position myself for remote work opportunities? What platforms should I use?",             color: "text-cyan-400",   bg: "bg-cyan-400/10" },
    { icon: DollarSign,   label: "Salary Benchmark",    prompt: "What is a fair salary for my role and experience level in Ghana and comparable markets?",          color: "text-orange-400", bg: "bg-orange-400/10" },
  ],
  market: [
    { icon: TrendingUp,   label: "Market Intelligence", prompt: "What are the biggest market opportunities in Ghana right now? Where should businesses focus?",     color: "text-green-400",  bg: "bg-green-400/10" },
    { icon: Globe,        label: "Global Expansion",    prompt: "Which international markets should a Ghanaian SME consider expanding into first? Risks and opportunities?", color: "text-blue-400", bg: "bg-blue-400/10" },
    { icon: BarChart3,    label: "Economic Trends",     prompt: "What economic trends in Ghana should businesses be aware of for planning in 2026?",                 color: "text-purple-400", bg: "bg-purple-400/10" },
    { icon: Package,      label: "Product Trends",      prompt: "What products and services are trending across emerging markets and represent business opportunities?", color: "text-yellow-400", bg: "bg-yellow-400/10" },
  ],
};

// Contextual AI responses (simulated — replace with real AI API in production)
function generateResponse(prompt: string, role: string | null, name: string): string {
  const firstName = name.split(" ")[0] ?? "there";
  const lp = prompt.toLowerCase();

  if (lp.includes("revenue") || lp.includes("forecast") || lp.includes("sales")) {
    return `**Revenue Intelligence for ${firstName}**\n\nBased on typical KENUXA business patterns in Ghana:\n\n📈 **Trend Analysis**\nMost SMEs in your sector see 15–25% revenue growth in Q2 (April–June) driven by school resumption and pre-summer activity.\n\n💡 **3 Revenue Boosters**\n1. **Upsell to existing customers** — Your repeat buyers likely spend 40% more when offered bundles. Create 2–3 combo offers this week.\n2. **WhatsApp ordering** — Businesses using WhatsApp for orders see 18% higher conversion. Set up a dedicated business line.\n3. **Mobile Money incentives** — Offer 2% discount for MoMo payments to accelerate cash collection.\n\n📊 **Forecast**\nIf you maintain current sales velocity and implement one of the above, expect 12–18% revenue uplift next month.\n\n⚡ **Quick Win**: Run a "Weekend Special" promotion this Friday–Sunday. Restaurants using this tactic see 30% higher weekend revenue.`;
  }

  if (lp.includes("inventory") || lp.includes("stock") || lp.includes("reorder")) {
    return `**Inventory Intelligence for ${firstName}**\n\n📦 **Smart Reorder Alerts**\nYour KENUXA inventory data suggests these actions:\n\n⚠️ **Urgent (Reorder Now)**\n- Items below reorder threshold should be restocked within 48 hours to avoid stockouts during peak demand.\n\n📊 **ABC Analysis**\n- **A-items** (70% of revenue): Never let these go out of stock. Maintain 3-week buffer.\n- **B-items** (20% of revenue): 2-week buffer is sufficient.\n- **C-items** (10% of revenue): Order fortnightly to reduce carrying costs.\n\n💡 **Ghana-Specific Insight**\nDue to port delays at Tema, imported goods need 6-week forward ordering. Local produce (tomatoes, peppers) should be sourced weekly from Agbogbloshie or local farmers.\n\n🤖 **AI Recommendation**\nSet up automated reorder alerts when stock falls below 20% of your monthly sales volume.`;
  }

  if (lp.includes("cv") || lp.includes("resume") || lp.includes("profile")) {
    return `**Career Profile Optimization for ${firstName}**\n\n📄 **CV Essentials for Ghana Job Market**\n\n✅ **Must-Have Sections**\n1. Professional headline (not just job title)\n2. Quantified achievements (e.g., "Increased sales by 35%")\n3. Relevant certifications (ICAG, CIMA, Google, etc.)\n4. LinkedIn profile link\n\n💡 **Ghana-Specific Tips**\n- Include your SSNIT/TIN number readiness (shows professionalism)\n- List languages — Twi, Ewe, Ga are assets in local roles\n- Volunteer work at church/community is valued by Ghanaian employers\n\n🚀 **Standout Strategies**\n- Add a 2-sentence personal brand statement at the top\n- Use action verbs: Led, Built, Grew, Delivered, Launched\n- Tailor keywords to each job description for ATS systems\n\n📈 **KENUXA Talent Score**\nComplete your profile to unlock your KENUXA Talent Score — a trust signal that gets you noticed by recruiters on the platform.`;
  }

  if (lp.includes("job") || lp.includes("career") || lp.includes("opportunity")) {
    return `**Job & Career Intelligence for ${firstName}**\n\n🇬🇭 **Top In-Demand Roles in Ghana (2026)**\n1. **Software Engineers** — GHS 4,000–12,000/month (fintech, telcos)\n2. **Digital Marketers** — GHS 2,500–6,000/month\n3. **Accountants/Finance** — GHS 3,000–8,000/month\n4. **Project Managers** — GHS 4,000–10,000/month\n5. **Healthcare Workers** — High demand, government + private\n\n💡 **Emerging Opportunities**\n- **AI/Data roles**: 3x salary premium, huge shortage\n- **Remote work**: US/EU companies hiring Ghanaian talent at $15–50/hour\n- **Gig economy**: KENUXA freelancers earn avg GHS 8,000/month\n\n🎯 **Your Next Steps**\n1. Optimize your KENUXA talent profile\n2. Apply to 5 jobs per week minimum\n3. Network in 2 professional WhatsApp groups\n4. Upskill with 1 online certification this quarter (Coursera, Google, HubSpot)\n\n📊 **KENUXA Match Rate**\nCandidates with complete profiles get 5× more recruiter views.`;
  }

  if (lp.includes("market") || lp.includes("trend") || lp.includes("opportunit") || lp.includes("expansion")) {
    return `**KENUXA Market Intelligence**\n\n**Top Opportunities in 2026**\n\n🇬🇭 **Ghana (Your Home Market)**\n- Digital payments adoption: 67% YoY growth\n- Healthcare: Massive demand, low supply\n- AgriTech: Farm-to-table, produce digitization\n- EdTech: 3.2M students, underserved learning market\n\n**Expansion Targets for Ghanaian SMEs**\n1. **Nigeria** — 220M people, same language, 15× Ghana's GDP\n2. **Côte d'Ivoire** — French-speaking, strong ECOWAS access\n3. **Rwanda** — Easiest to do business in East/Central region\n4. **South Africa** — Premium market for formal businesses\n\n💰 **High-ROI Sectors**\n- Mobile money agent services: 22% annual growth\n- Last-mile delivery: Underpenetrated in secondary cities\n- B2B food supply: Restaurant boom in Accra, Kumasi\n\n🤖 **AI Insight**\nEmerging-market e-commerce is projected to reach $75B by 2030. Businesses that digitize now will capture disproportionate market share.`;
  }

  if (lp.includes("risk") || lp.includes("assessment")) {
    return `**Business Risk Assessment**\n\n⚠️ **Top Risks for Ghanaian SMEs in 2026**\n\n🔴 **High Priority**\n1. **Currency risk** — GHS depreciation of 8–15% annually. Price in USD where possible; hold mobile money balances in stable assets.\n2. **Credit/payment risk** — 40% of B2B invoices paid late. Require deposits; use KENUXA invoice tracking.\n3. **Stock concentration** — Dependence on 1–2 suppliers. Build at least 3 supplier relationships per key input.\n\n🟡 **Medium Priority**\n4. **Power outages** — Budget for generator/inverter costs in operations planning.\n5. **Regulatory** — GRA enforcement increasing. Ensure VAT compliance and digital invoicing readiness.\n6. **Staff turnover** — Average tenure 18 months. Document processes; use KENUXA HR tools.\n\n🟢 **Quick Wins to Reduce Risk**\n- Open a USD/EUR savings account\n- Implement mobile money float tracking\n- Get your business verified on KENUXA (builds trust score)\n\nYour KENUXA Business Score helps lenders and partners assess your risk profile positively.`;
  }

  if (lp.includes("salary") || lp.includes("benchmark") || lp.includes("pay")) {
    return `**Ghana Salary Benchmarks 2026**\n\n💼 **Professional Roles (GHS/month)**\n\n| Role | Entry | Mid | Senior |\n|------|-------|-----|--------|\n| Software Engineer | 3,500 | 7,000 | 15,000+ |\n| Accountant | 2,500 | 5,000 | 10,000 |\n| Marketing Manager | 2,000 | 4,500 | 9,000 |\n| HR Manager | 2,000 | 4,000 | 8,000 |\n| Sales Executive | 1,800 | 3,500 | 7,000 + commission |\n| Nurse/Healthcare | 2,500 | 4,500 | 8,000 |\n| Teacher | 1,500 | 3,000 | 5,500 |\n\n🌍 **Remote Work Rates (USD/hour)**\n- Developers: $15–45\n- Designers: $12–35\n- Digital marketers: $10–25\n- Virtual assistants: $5–15\n\n💡 **Negotiation Tips**\n1. Research 3 comparable offers before negotiating\n2. Total package matters: transport, health, bonus\n3. Ask for performance reviews at 6 months\n4. Your KENUXA Talent Score gives you leverage — a higher score = demonstrated credibility`;
  }

  // Generic response
  return `**KENUXA AI Response for ${firstName}**\n\nThank you for your question. As your Economic AI, I can help you with:\n\n🏢 **For Businesses**: Revenue forecasting, inventory intelligence, customer insights, cash flow analysis, growth strategy, and risk assessment.\n\n👤 **For Career**: CV optimization, job matching, salary benchmarking, interview preparation, and skill gap analysis.\n\n🌍 **For Market Intelligence**: Ghana market trends, global expansion opportunities, sector analysis, and economic insights.\n\n💡 **Try asking me**:\n- "Forecast my revenue for next month"\n- "What skills should I develop?"\n- "What are the biggest market opportunities in Ghana?"\n- "Help me improve my CV"\n- "Assess my business risks"\n\nI combine KENUXA platform data with economic intelligence to give you actionable insights tailored to your context.`;
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function AIPage() {
  const { profile, role } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [activeModule, setActiveModule] = useState<"business" | "career" | "market">("business");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const isBusinessRole = ["business_owner", "branch_manager", "cashier", "employee"].includes(role ?? "");
  const isCareerRole   = ["job_seeker", "freelancer", "delivery_rider"].includes(role ?? "");

  // Set default module based on role
  useEffect(() => {
    if (isCareerRole) setActiveModule("career");
    else setActiveModule("business");
  }, [isCareerRole]);

  // Scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // Welcome message
  useEffect(() => {
    const name = profile?.full_name ?? "there";
    const firstName = name.split(" ")[0]!;
    const greeting = isCareerRole
      ? `I'm your **AI Career Copilot**, ${firstName}. I can help you land your dream job, optimize your profile, benchmark your salary, and navigate the job market.\n\nWhat would you like to work on today?`
      : `I'm your **AI Business Intelligence Engine**, ${firstName}. I analyze your KENUXA data to deliver revenue forecasts, inventory intelligence, customer insights, and growth strategies — all tailored to the Ghanaian market.\n\nWhat business challenge can I help you solve?`;

    setMessages([{
      id: "welcome",
      role: "assistant",
      content: greeting,
      timestamp: new Date(),
    }]);
  }, [profile?.full_name, isCareerRole]);

  const sendMessage = async (text: string) => {
    if (!text.trim()) return;
    const userMsg: ChatMessage = { id: Date.now().toString(), role: "user", content: text, timestamp: new Date() };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setIsTyping(true);

    // Simulate AI thinking delay
    await new Promise((r) => setTimeout(r, 1200 + Math.random() * 800));

    const aiContent = generateResponse(text, role, profile?.full_name ?? "User");
    const aiMsg: ChatMessage = { id: (Date.now() + 1).toString(), role: "assistant", content: aiContent, timestamp: new Date() };
    setMessages((m) => [...m, aiMsg]);
    setIsTyping(false);
  };

  const copyMessage = async (id: string, content: string) => {
    await navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  // Format message content (basic markdown)
  const formatContent = (content: string) => {
    return content
      .replace(/\*\*(.*?)\*\*/g, '<strong class="text-white">$1</strong>')
      .replace(/^(#{1,3})\s+(.+)$/gm, '<p class="text-white font-semibold mt-3 mb-1">$2</p>')
      .replace(/^[-•]\s+(.+)$/gm, '<li class="ml-4 list-disc text-white/70">$1</li>')
      .replace(/^\d+\.\s+(.+)$/gm, '<li class="ml-4 list-decimal text-white/70">$1</li>')
      .replace(/\n\n/g, '<br/><br/>')
      .replace(/\n/g, '<br/>');
  };

  const currentModules = AI_MODULES[activeModule];

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] max-h-[calc(100vh-4rem)]">
      {/* ── HEADER ───────────────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 border-b border-white/8 bg-[#0d0f1a] px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FF6524]/20 to-purple-500/20 border border-[#FF6524]/20 flex items-center justify-center">
              <Brain size={18} className="text-[#FF8B5E]" />
            </div>
            <div>
              <h1 className="text-white font-semibold text-sm flex items-center gap-2">
                KENUXA AI
                <span className="text-[9px] bg-[#FF6524]/20 text-[#FF8B5E] px-1.5 py-0.5 rounded-full font-bold">BETA</span>
              </h1>
              <p className="text-xs text-white/40">KENUXA Economic Intelligence Engine</p>
            </div>
          </div>
          <button onClick={() => {
            setMessages([{
              id: Date.now().toString(),
              role: "assistant",
              content: "New conversation started. How can I help you today?",
              timestamp: new Date(),
            }]);
          }} className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 transition-colors">
            <RefreshCw size={13} /> New chat
          </button>
        </div>

        {/* Module selector */}
        <div className="flex gap-1 mt-4 bg-white/3 border border-white/8 rounded-xl p-1 w-fit">
          {([
            { key: "business" as const, label: "Business AI",    icon: TrendingUp },
            { key: "career"   as const, label: "Career AI",      icon: Briefcase },
            { key: "market"   as const, label: "Market Intel",   icon: Globe },
          ]).map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => setActiveModule(key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                activeModule === key ? "bg-[#FF6524] text-white" : "text-white/50 hover:text-white"
              }`}>
              <Icon size={12} /> {label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* ── QUICK PROMPTS SIDEBAR ────────────────────────────────────────────── */}
        <div className="w-56 flex-shrink-0 border-r border-white/8 overflow-y-auto py-4 px-3 space-y-1 hidden md:block">
          <p className="text-[10px] font-semibold text-white/25 uppercase tracking-widest px-2 mb-3">Quick Actions</p>
          {currentModules.map((mod) => (
            <button key={mod.label} onClick={() => sendMessage(mod.prompt)}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-white/5 text-left group transition-all">
              <div className={`w-7 h-7 rounded-lg ${mod.bg} flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform`}>
                <mod.icon size={13} className={mod.color} />
              </div>
              <span className="text-xs text-white/50 group-hover:text-white/80 transition-colors leading-tight">{mod.label}</span>
            </button>
          ))}

          <div className="pt-4 border-t border-white/8 mt-4">
            <p className="text-[10px] font-semibold text-white/25 uppercase tracking-widest px-2 mb-3">AI-Powered Pages</p>
            {[
              { href: "/dashboard/analytics",   label: "Analytics",     icon: BarChart3 },
              { href: "/dashboard/finance",      label: "Finance",       icon: DollarSign },
              { href: "/dashboard/talent",       label: "Talent Score",  icon: Star },
              { href: "/dashboard/reputation",   label: "Reputation",    icon: Shield },
            ].map(({ href, label, icon: Icon }) => (
              <Link key={href} href={href}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-white/5 text-left group transition-all">
                <Icon size={13} className="text-white/30 group-hover:text-white/60" />
                <span className="text-xs text-white/40 group-hover:text-white/70 transition-colors">{label}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* ── CHAT AREA ────────────────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 md:px-6 py-4 space-y-4">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                {/* Avatar */}
                <div className={`w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center ${
                  msg.role === "assistant"
                    ? "bg-gradient-to-br from-[#FF6524]/20 to-purple-500/20 border border-[#FF6524]/20"
                    : "bg-white/10 border border-white/15"
                }`}>
                  {msg.role === "assistant"
                    ? <Sparkles size={14} className="text-[#FF8B5E]" />
                    : <User size={14} className="text-white/60" />}
                </div>

                {/* Bubble */}
                <div className={`max-w-[80%] ${msg.role === "user" ? "items-end" : "items-start"} flex flex-col gap-1`}>
                  <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-[#FF6524]/20 border border-[#FF6524]/20 text-white rounded-tr-sm"
                      : "bg-white/5 border border-white/8 text-white/80 rounded-tl-sm"
                  }`}>
                    {msg.role === "assistant"
                      ? <div dangerouslySetInnerHTML={{ __html: formatContent(msg.content) }} className="prose-sm" />
                      : msg.content}
                  </div>
                  <div className="flex items-center gap-2 px-1">
                    <span className="text-[10px] text-white/20">{msg.timestamp.toLocaleTimeString("en-GH", { hour: "2-digit", minute: "2-digit" })}</span>
                    {msg.role === "assistant" && (
                      <button onClick={() => copyMessage(msg.id, msg.content)} className="text-white/20 hover:text-white/50 transition-colors">
                        {copiedId === msg.id ? <Check size={11} className="text-green-400" /> : <Copy size={11} />}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {isTyping && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#FF6524]/20 to-purple-500/20 border border-[#FF6524]/20 flex-shrink-0 flex items-center justify-center">
                  <Sparkles size={14} className="text-[#FF8B5E]" />
                </div>
                <div className="bg-white/5 border border-white/8 rounded-2xl rounded-tl-sm px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    {[0, 1, 2].map((i) => (
                      <div key={i} className="w-1.5 h-1.5 rounded-full bg-[#FF6524]/60 animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Quick prompt chips (mobile) */}
          <div className="flex-shrink-0 px-4 py-2 flex gap-2 overflow-x-auto md:hidden border-t border-white/8">
            {currentModules.slice(0, 4).map((mod) => (
              <button key={mod.label} onClick={() => sendMessage(mod.prompt)}
                className={`flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs border border-white/10 ${mod.bg} ${mod.color}`}>
                <mod.icon size={11} /> {mod.label}
              </button>
            ))}
          </div>

          {/* Input area */}
          <div className="flex-shrink-0 border-t border-white/8 px-4 py-3 bg-[#0d0f1a]">
            <div className="flex gap-3 items-end">
              <div className="flex-1 relative">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask anything about your business, career, or the market…"
                  rows={1}
                  disabled={isTyping}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white text-sm placeholder-white/25 focus:outline-none focus:border-[#FF6524]/50 resize-none disabled:opacity-50 transition-all"
                  style={{ maxHeight: "120px" }}
                />
              </div>
              <button
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || isTyping}
                className="w-10 h-10 rounded-xl bg-[#FF6524] hover:bg-[#e55a1f] disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center flex-shrink-0 transition-all"
              >
                <Send size={16} className="text-white" />
              </button>
            </div>
            <p className="text-[10px] text-white/20 mt-2 text-center">
              KENUXA AI · Economic intelligence · Powered by platform data
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
