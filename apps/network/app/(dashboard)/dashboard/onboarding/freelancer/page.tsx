"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/hooks/use-auth";
import { useRoles } from "@/lib/hooks/use-roles";
import {
  Pen, CheckCircle, ArrowRight, ArrowLeft, Loader2, Plus, X,
} from "lucide-react";

const STEPS = ["Services", "Pricing & Availability", "Portfolio", "Done"];

const SERVICE_CATEGORIES = [
  "Web Development", "Mobile Apps", "UI/UX Design", "Graphic Design",
  "Content Writing", "Digital Marketing", "SEO", "Video Editing",
  "Photography", "Translation", "Accounting", "Legal", "Consulting",
  "Data Analysis", "AI / ML", "Cybersecurity", "Other",
];

const AVAILABILITY_OPTIONS = [
  { value: "full_time", label: "Full-time (40h/week)" },
  { value: "part_time", label: "Part-time (20h/week)" },
  { value: "weekends",  label: "Weekends only" },
  { value: "flexible",  label: "Flexible hours" },
];

export default function FreelancerOnboardingPage() {
  const router = useRouter();
  const supabase = createClient();
  const { user } = useAuth();
  const { activateRole } = useRoles();

  const [step, setStep]     = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState("");

  // Step 0 — services
  const [serviceTitle, setServiceTitle] = useState("");
  const [category, setCategory]         = useState("");
  const [bio, setBio]                   = useState("");
  const [skills, setSkills]             = useState<string[]>([]);
  const [skillInput, setSkillInput]     = useState("");

  // Step 1 — pricing
  const [hourlyRate, setHourlyRate]   = useState("");
  const [availability, setAvail]      = useState("flexible");
  const [currency]                    = useState("GHS");

  // Step 2 — portfolio
  const [portfolioLinks, setPortfolioLinks] = useState([""]);

  const addSkill = (s: string) => { const t = s.trim(); if (t && !skills.includes(t)) setSkills([...skills, t]); setSkillInput(""); };

  const handleSave = async () => {
    setLoading(true);
    setError("");
    try {
      const { error: err } = await supabase
        .from("skill_profiles")
        .upsert({
          user_id: user!.id,
          display_name: serviceTitle,
          title: serviceTitle,
          bio,
          skills,
          category: category.toLowerCase().replace(/\s+/g, "_") || "other",
          level: "Professional",
          availability: availability,
          hourly_rate: hourlyRate ? parseFloat(hourlyRate) : null,
        }, { onConflict: "user_id" });

      if (err) throw err;
      await activateRole("freelancer", { service_title: serviceTitle, category });
      setStep(3);
    } catch (e: unknown) {
      setError((e as Error)?.message ?? "Failed to create profile");
    } finally {
      setLoading(false);
    }
  };

  const inputCls = "w-full bg-[#0d0f1a] border border-white/10 rounded-xl px-3.5 h-11 text-sm text-[#f1f5f9] outline-none focus:border-[#8b5cf6] transition-colors placeholder-[#374151]";
  const textareaCls = "w-full bg-[#0d0f1a] border border-white/10 rounded-xl px-3.5 py-3 text-sm text-[#f1f5f9] outline-none focus:border-[#8b5cf6] transition-colors placeholder-[#374151] resize-none";

  return (
    <div className="min-h-screen bg-[#080a14] flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="flex items-center gap-2 mb-8">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-2 flex-1">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                i < step ? "bg-[#8b5cf6] text-white" :
                i === step ? "bg-[rgba(139,92,246,0.2)] border-2 border-[#8b5cf6] text-[#8b5cf6]" :
                "bg-[#111624] border border-white/10 text-[#374151]"
              }`}>
                {i < step ? <CheckCircle size={13} /> : i + 1}
              </div>
              <span className={`text-xs hidden sm:block truncate ${i === step ? "text-[#f1f5f9] font-medium" : "text-[#374151]"}`}>{s}</span>
              {i < STEPS.length - 1 && <div className={`h-px flex-1 ml-2 ${i < step ? "bg-[#8b5cf6]" : "bg-white/7"}`} />}
            </div>
          ))}
        </div>

        <div className="bg-[#111624] border border-white/7 rounded-2xl p-6 shadow-2xl">
          {step === 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-[rgba(139,92,246,0.15)] flex items-center justify-center">
                  <Pen size={18} className="text-[#8b5cf6]" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-[#f1f5f9]">Your Services</h2>
                  <p className="text-xs text-[#64748b]">What do you offer to clients?</p>
                </div>
              </div>
              <div>
                <label className="text-xs text-[#64748b] mb-1.5 block">Service Title *</label>
                <input className={inputCls} placeholder="e.g. Full-Stack Web Developer" value={serviceTitle} onChange={(e) => setServiceTitle(e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-[#64748b] mb-2 block">Category *</label>
                <div className="grid grid-cols-3 gap-2">
                  {SERVICE_CATEGORIES.map((c) => (
                    <button key={c} type="button" onClick={() => setCategory(c)}
                      className={`px-2.5 py-2 rounded-lg border text-xs font-medium text-left transition-all ${
                        category === c ? "border-[#8b5cf6] bg-[rgba(139,92,246,0.1)] text-[#8b5cf6]" : "border-white/7 text-[#64748b] hover:border-white/20"
                      }`}>
                      {c}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs text-[#64748b] mb-1.5 block">About Your Services</label>
                <textarea className={textareaCls} rows={3} placeholder="Describe what you do and the value you bring to clients..." value={bio} onChange={(e) => setBio(e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-[#64748b] mb-1.5 block">Skills</label>
                <div className="flex gap-2 mb-2">
                  <input className={`${inputCls} flex-1`} placeholder="Add a skill..." value={skillInput}
                    onChange={(e) => setSkillInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSkill(skillInput); }}} />
                  <button type="button" onClick={() => addSkill(skillInput)} className="h-11 px-3 rounded-xl bg-[#8b5cf6] text-white hover:bg-[#7c3aed] transition-colors">
                    <Plus size={15} />
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {skills.map((s) => (
                    <span key={s} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[rgba(139,92,246,0.1)] border border-[rgba(139,92,246,0.2)] text-[#8b5cf6] text-xs">
                      {s}<button onClick={() => setSkills(skills.filter((x) => x !== s))}><X size={10} /></button>
                    </span>
                  ))}
                </div>
              </div>
              <button onClick={() => serviceTitle && category && setStep(1)} disabled={!serviceTitle || !category}
                className="w-full h-11 bg-[#8b5cf6] rounded-xl text-white font-semibold text-sm flex items-center justify-center gap-2 hover:bg-[#7c3aed] disabled:opacity-40 transition-colors">
                Continue <ArrowRight size={15} />
              </button>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-[#f1f5f9] mb-1">Pricing & Availability</h2>
              <div>
                <label className="text-xs text-[#64748b] mb-1.5 block">Hourly Rate ({currency})</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-3 text-sm text-[#64748b]">₵</span>
                  <input type="number" className={`${inputCls} pl-8`} placeholder="150" value={hourlyRate} onChange={(e) => setHourlyRate(e.target.value)} />
                </div>
                <p className="text-xs text-[#374151] mt-1">You can always update this later. Leave blank to negotiate per project.</p>
              </div>
              <div>
                <label className="text-xs text-[#64748b] mb-2 block">Availability</label>
                <div className="space-y-2">
                  {AVAILABILITY_OPTIONS.map((opt) => (
                    <button key={opt.value} type="button" onClick={() => setAvail(opt.value)}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl border text-sm transition-all ${
                        availability === opt.value ? "border-[#8b5cf6] bg-[rgba(139,92,246,0.08)] text-[#f1f5f9]" : "border-white/7 text-[#64748b] hover:border-white/20"
                      }`}>
                      <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${availability === opt.value ? "border-[#8b5cf6] bg-[#8b5cf6]" : "border-white/20"}`} />
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setStep(0)} className="flex-1 h-11 border border-white/10 rounded-xl text-[#64748b] text-sm hover:border-white/20 flex items-center justify-center gap-2 transition-all">
                  <ArrowLeft size={15} /> Back
                </button>
                <button onClick={() => setStep(2)} className="flex-1 h-11 bg-[#8b5cf6] rounded-xl text-white font-semibold text-sm flex items-center justify-center gap-2 hover:bg-[#7c3aed] transition-colors">
                  Continue <ArrowRight size={15} />
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-[#f1f5f9] mb-1">Portfolio</h2>
              <p className="text-xs text-[#64748b]">Share links to your previous work (optional)</p>
              {portfolioLinks.map((link, i) => (
                <div key={i} className="flex gap-2">
                  <input className={`${inputCls} flex-1`} placeholder="https://your-work.com or Behance / GitHub link" value={link}
                    onChange={(e) => { const n = [...portfolioLinks]; n[i] = e.target.value; setPortfolioLinks(n); }} />
                  {portfolioLinks.length > 1 && (
                    <button type="button" onClick={() => setPortfolioLinks(portfolioLinks.filter((_, j) => j !== i))}
                      className="h-11 px-3 rounded-xl border border-white/10 text-[#64748b] hover:border-[rgba(239,68,68,0.3)] hover:text-[#f87171] transition-all">
                      <X size={14} />
                    </button>
                  )}
                </div>
              ))}
              <button type="button" onClick={() => setPortfolioLinks([...portfolioLinks, ""])}
                className="flex items-center gap-2 text-xs text-[#64748b] hover:text-[#8b5cf6] transition-colors">
                <Plus size={13} /> Add another link
              </button>
              {error && <p className="text-xs text-[#f87171] bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.2)] rounded-lg px-3 py-2">{error}</p>}
              <div className="flex gap-3 pt-2">
                <button onClick={() => setStep(1)} className="flex-1 h-11 border border-white/10 rounded-xl text-[#64748b] text-sm hover:border-white/20 flex items-center justify-center gap-2 transition-all">
                  <ArrowLeft size={15} /> Back
                </button>
                <button onClick={handleSave} disabled={loading} className="flex-1 h-11 bg-[#8b5cf6] rounded-xl text-white font-semibold text-sm flex items-center justify-center gap-2 hover:bg-[#7c3aed] disabled:opacity-60 transition-all">
                  {loading ? <><Loader2 size={15} className="animate-spin" /> Saving...</> : <><span>Launch Profile</span><ArrowRight size={15} /></>}
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="text-center space-y-4 py-4">
              <div className="w-16 h-16 rounded-2xl bg-[#8b5cf6] flex items-center justify-center mx-auto">
                <CheckCircle size={32} className="text-white" />
              </div>
              <h2 className="text-xl font-bold text-[#f1f5f9]">Freelancer Profile Live!</h2>
              <p className="text-sm text-[#64748b]">Clients can now find and hire you on KENUXA Skills Marketplace.</p>
              <div className="flex gap-3 pt-2">
                <button onClick={() => router.push("/dashboard/skills")} className="flex-1 h-11 border border-white/10 rounded-xl text-[#64748b] text-sm hover:border-white/20 flex items-center justify-center gap-2 transition-all">
                  Browse Marketplace
                </button>
                <button onClick={() => router.push("/dashboard")} className="flex-1 h-11 bg-[#8b5cf6] rounded-xl text-white font-semibold text-sm flex items-center justify-center gap-2 hover:bg-[#7c3aed] transition-colors">
                  Go to Dashboard <ArrowRight size={15} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
