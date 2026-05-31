"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/hooks/use-auth";
import { useRoles } from "@/lib/hooks/use-roles";
import {
  Briefcase, CheckCircle, ArrowRight, ArrowLeft,
  Loader2, Plus, X, Sparkles,
} from "lucide-react";

const STEPS = ["Profile", "Experience", "Skills & Education", "Done"];

const AVAILABILITY_OPTIONS = ["Immediately", "2 weeks notice", "1 month notice", "Not actively looking"];
const JOB_TYPES = ["Full-time", "Part-time", "Contract", "Freelance", "Internship", "Remote"];
const SKILL_SUGGESTIONS = [
  "JavaScript", "Python", "React", "Node.js", "SQL", "Excel",
  "Marketing", "Sales", "Accounting", "Project Management",
  "Graphic Design", "Customer Service", "Data Analysis", "Leadership",
];

export default function JobSeekerOnboardingPage() {
  const router = useRouter();
  const supabase = createClient();
  const { user } = useAuth();
  const { activateRole } = useRoles();

  const [step, setStep]     = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState("");

  // Step 0
  const [headline, setHeadline]     = useState("");
  const [bio, setBio]               = useState("");
  const [availability, setAvail]    = useState("");
  const [jobTypes, setJobTypes]     = useState<string[]>([]);
  const [location, setLocation]     = useState("");

  // Step 1 — experience
  const [experiences, setExperiences] = useState([
    { company: "", title: "", years: "", current: false },
  ]);

  // Step 2 — skills + education
  const [skills, setSkills]         = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState("");
  const [education, setEducation]   = useState("");
  const [certifications, setCerts]  = useState("");

  const toggleJobType = (jt: string) => setJobTypes((prev) => prev.includes(jt) ? prev.filter((x) => x !== jt) : [...prev, jt]);
  const addSkill = (sk: string) => { const s = sk.trim(); if (s && !skills.includes(s)) setSkills([...skills, s]); setSkillInput(""); };
  const removeSkill = (sk: string) => setSkills(skills.filter((s) => s !== sk));

  const handleSave = async () => {
    setLoading(true);
    setError("");
    try {
      const { error: profileErr } = await supabase
        .from("skill_profiles")
        .upsert({
          user_id: user!.id,
          display_name: headline,
          title: headline,
          bio,
          skills,
          availability: availability || "Immediately",
          category: "professional",
          level: "Mid-level",
        }, { onConflict: "user_id" });

      if (profileErr) throw profileErr;

      await activateRole("job_seeker", { headline });
      setStep(3);
    } catch (err: unknown) {
      setError((err as Error)?.message ?? "Failed to save profile");
    } finally {
      setLoading(false);
    }
  };

  const inputCls = "w-full bg-[#0d0f1a] border border-white/10 rounded-xl px-3.5 h-11 text-sm text-[#f1f5f9] outline-none focus:border-[#10b981] transition-colors placeholder-[#374151]";
  const textareaCls = "w-full bg-[#0d0f1a] border border-white/10 rounded-xl px-3.5 py-3 text-sm text-[#f1f5f9] outline-none focus:border-[#10b981] transition-colors placeholder-[#374151] resize-none";

  return (
    <div className="min-h-screen bg-[#080a14] flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Progress */}
        <div className="flex items-center gap-2 mb-8">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-2 flex-1">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 transition-all ${
                i < step ? "bg-[#10b981] text-white" :
                i === step ? "bg-[rgba(16,185,129,0.2)] border-2 border-[#10b981] text-[#10b981]" :
                "bg-[#111624] border border-white/10 text-[#374151]"
              }`}>
                {i < step ? <CheckCircle size={13} /> : i + 1}
              </div>
              <span className={`text-xs hidden sm:block truncate ${i === step ? "text-[#f1f5f9] font-medium" : "text-[#374151]"}`}>{s}</span>
              {i < STEPS.length - 1 && <div className={`h-px flex-1 ml-2 ${i < step ? "bg-[#10b981]" : "bg-white/7"}`} />}
            </div>
          ))}
        </div>

        <div className="bg-[#111624] border border-white/7 rounded-2xl p-6 shadow-2xl">
          {/* Step 0 — Profile */}
          {step === 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-[rgba(16,185,129,0.15)] flex items-center justify-center">
                  <Briefcase size={18} className="text-[#10b981]" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-[#f1f5f9]">Your Professional Profile</h2>
                  <p className="text-xs text-[#64748b]">Help employers discover you</p>
                </div>
              </div>
              <div>
                <label className="text-xs text-[#64748b] mb-1.5 block">Professional Headline *</label>
                <input className={inputCls} placeholder="e.g. Software Engineer | 5 years experience" value={headline} onChange={(e) => setHeadline(e.target.value)} required />
              </div>
              <div>
                <label className="text-xs text-[#64748b] mb-1.5 block">Professional Summary</label>
                <textarea className={textareaCls} rows={3} placeholder="Brief overview of your background and what you're looking for..." value={bio} onChange={(e) => setBio(e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-[#64748b] mb-1.5 block">Location</label>
                <input className={inputCls} placeholder="e.g. Accra, Ghana" value={location} onChange={(e) => setLocation(e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-[#64748b] mb-1.5 block">Availability</label>
                <div className="flex flex-wrap gap-2">
                  {AVAILABILITY_OPTIONS.map((opt) => (
                    <button key={opt} type="button" onClick={() => setAvail(opt)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                        availability === opt ? "border-[#10b981] bg-[rgba(16,185,129,0.1)] text-[#10b981]" : "border-white/10 text-[#64748b] hover:border-white/20"
                      }`}>
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs text-[#64748b] mb-1.5 block">Job Types I&apos;m Open To</label>
                <div className="flex flex-wrap gap-2">
                  {JOB_TYPES.map((jt) => (
                    <button key={jt} type="button" onClick={() => toggleJobType(jt)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                        jobTypes.includes(jt) ? "border-[#10b981] bg-[rgba(16,185,129,0.1)] text-[#10b981]" : "border-white/10 text-[#64748b] hover:border-white/20"
                      }`}>
                      {jt}
                    </button>
                  ))}
                </div>
              </div>
              <button onClick={() => headline && setStep(1)} disabled={!headline}
                className="w-full h-11 bg-[#10b981] rounded-xl text-white font-semibold text-sm flex items-center justify-center gap-2 hover:bg-[#059669] disabled:opacity-40 transition-colors">
                Continue <ArrowRight size={15} />
              </button>
            </div>
          )}

          {/* Step 1 — Experience */}
          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-[#f1f5f9] mb-1">Work Experience</h2>
              <p className="text-xs text-[#64748b] mb-2">Add your most recent roles (optional)</p>
              {experiences.map((exp, i) => (
                <div key={i} className="p-4 rounded-xl bg-[#0d0f1a] border border-white/7 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-[#64748b] mb-1 block">Company</label>
                      <input className={inputCls} placeholder="Company name" value={exp.company} onChange={(e) => { const n = [...experiences]; n[i]!.company = e.target.value; setExperiences(n); }} />
                    </div>
                    <div>
                      <label className="text-xs text-[#64748b] mb-1 block">Job Title</label>
                      <input className={inputCls} placeholder="Your role" value={exp.title} onChange={(e) => { const n = [...experiences]; n[i]!.title = e.target.value; setExperiences(n); }} />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-[#64748b] mb-1 block">Years / Period</label>
                    <input className={inputCls} placeholder="e.g. 2020 – 2023 (3 years)" value={exp.years} onChange={(e) => { const n = [...experiences]; n[i]!.years = e.target.value; setExperiences(n); }} />
                  </div>
                </div>
              ))}
              <button type="button" onClick={() => setExperiences([...experiences, { company: "", title: "", years: "", current: false }])}
                className="flex items-center gap-2 text-xs text-[#64748b] hover:text-[#10b981] transition-colors">
                <Plus size={13} /> Add another role
              </button>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setStep(0)} className="flex-1 h-11 border border-white/10 rounded-xl text-[#64748b] text-sm hover:border-white/20 flex items-center justify-center gap-2 transition-all">
                  <ArrowLeft size={15} /> Back
                </button>
                <button onClick={() => setStep(2)} className="flex-1 h-11 bg-[#10b981] rounded-xl text-white font-semibold text-sm flex items-center justify-center gap-2 hover:bg-[#059669] transition-colors">
                  Continue <ArrowRight size={15} />
                </button>
              </div>
            </div>
          )}

          {/* Step 2 — Skills */}
          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-[#f1f5f9] mb-1">Skills & Education</h2>
              <div>
                <label className="text-xs text-[#64748b] mb-1.5 block">Your Skills</label>
                <div className="flex gap-2 mb-2">
                  <input className={`${inputCls} flex-1`} placeholder="Add a skill..." value={skillInput}
                    onChange={(e) => setSkillInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSkill(skillInput); }}} />
                  <button type="button" onClick={() => addSkill(skillInput)} className="h-11 px-3 rounded-xl bg-[#10b981] text-white hover:bg-[#059669] transition-colors">
                    <Plus size={15} />
                  </button>
                </div>
                {/* Quick add */}
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {SKILL_SUGGESTIONS.filter((s) => !skills.includes(s)).slice(0, 8).map((s) => (
                    <button key={s} type="button" onClick={() => addSkill(s)}
                      className="px-2.5 py-1 rounded-lg border border-white/10 text-xs text-[#64748b] hover:border-[#10b981] hover:text-[#10b981] transition-all">
                      + {s}
                    </button>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2">
                  {skills.map((s) => (
                    <span key={s} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[rgba(16,185,129,0.1)] border border-[rgba(16,185,129,0.2)] text-[#10b981] text-xs">
                      {s}
                      <button onClick={() => removeSkill(s)}><X size={10} /></button>
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs text-[#64748b] mb-1.5 block">Highest Education</label>
                <input className={inputCls} placeholder="e.g. BSc Computer Science, University of Ghana" value={education} onChange={(e) => setEducation(e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-[#64748b] mb-1.5 block">Certifications</label>
                <input className={inputCls} placeholder="e.g. AWS Certified, Google Analytics" value={certifications} onChange={(e) => setCerts(e.target.value)} />
              </div>
              {error && <p className="text-xs text-[#f87171] bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.2)] rounded-lg px-3 py-2">{error}</p>}
              <div className="flex gap-3 pt-2">
                <button onClick={() => setStep(1)} className="flex-1 h-11 border border-white/10 rounded-xl text-[#64748b] text-sm hover:border-white/20 flex items-center justify-center gap-2 transition-all">
                  <ArrowLeft size={15} /> Back
                </button>
                <button onClick={handleSave} disabled={loading} className="flex-1 h-11 bg-[#10b981] rounded-xl text-white font-semibold text-sm flex items-center justify-center gap-2 hover:bg-[#059669] disabled:opacity-60 transition-all">
                  {loading ? <><Loader2 size={15} className="animate-spin" /> Saving...</> : <><span>Create Profile</span><ArrowRight size={15} /></>}
                </button>
              </div>
            </div>
          )}

          {/* Step 3 — Done */}
          {step === 3 && (
            <div className="text-center space-y-4 py-4">
              <div className="w-16 h-16 rounded-2xl bg-[#10b981] flex items-center justify-center mx-auto">
                <CheckCircle size={32} className="text-white" />
              </div>
              <h2 className="text-xl font-bold text-[#f1f5f9]">Profile Created!</h2>
              <p className="text-sm text-[#64748b]">Your talent profile is live. AI job matching has started.</p>
              <div className="p-4 rounded-xl bg-[rgba(16,185,129,0.05)] border border-[rgba(16,185,129,0.15)] text-left">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles size={14} className="text-[#10b981]" />
                  <span className="text-xs font-semibold text-[#10b981]">AI Career Copilot Activated</span>
                </div>
                <p className="text-xs text-[#64748b]">Get personalized job matches, CV review, and interview coaching from your AI assistant.</p>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => router.push("/dashboard/jobs")} className="flex-1 h-11 border border-white/10 rounded-xl text-[#64748b] text-sm hover:border-white/20 flex items-center justify-center gap-2 transition-all">
                  Browse Jobs
                </button>
                <button onClick={() => router.push("/dashboard")} className="flex-1 h-11 bg-[#10b981] rounded-xl text-white font-semibold text-sm flex items-center justify-center gap-2 hover:bg-[#059669] transition-colors">
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
