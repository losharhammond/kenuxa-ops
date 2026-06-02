"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Header } from "@/components/layout/header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/hooks/use-auth";
import { useRoleGuard } from "@/lib/hooks/use-role-guard";
import {
  BadgeCheck, Pen, Plus, X, Shield, CheckCircle2, Upload,
  Briefcase, GraduationCap, Globe, MapPin, Clock,
  TrendingUp, Camera, Save, Loader2,
} from "lucide-react";
import { ImageUpload } from "@/components/ui/image-upload";

// ─── Types ────────────────────────────────────────────────────────────────────

interface TalentProfile {
  id: string;
  user_id: string;
  full_name: string;
  headline: string;
  bio: string;
  skills: string[];
  hourly_rate: number | null;
  location: string;
  availability: string;
  languages: string[];
  linkedin_url: string;
  portfolio_url: string;
  avatar_url: string | null;
  verified: boolean;
  rating: number | null;
  reviews_count: number | null;
  completed_jobs: number | null;
  kenuxa_score: number | null;
}

interface WorkExperience {
  id: string;
  title: string;
  company: string;
  start_date: string;
  end_date: string | null;
  description: string | null;
  current: boolean;
}

interface Education {
  id: string;
  degree: string;
  institution: string;
  year: string;
}

const SKILL_SUGGESTIONS = [
  "Graphic Design", "Logo Design", "Web Development", "Mobile Development",
  "Social Media", "SEO", "Content Writing", "Video Editing",
  "Photography", "Accounting", "Project Management", "Data Analysis",
  "UI/UX Design", "WordPress", "React", "Python", "Marketing",
  "Copywriting", "Translation", "Voice Over", "3D Design",
];

const AVAILABILITY_OPTIONS = [
  { value: "available",      label: "Available",       color: "text-[#10b981]" },
  { value: "busy",           label: "Busy",            color: "text-[#F59E0B]" },
  { value: "not_available",  label: "Not Available",   color: "text-[#f87171]" },
];

// ─── Score ring ───────────────────────────────────────────────────────────────

function ScoreRing({ score, size = 80 }: { score: number; size?: number }) {
  const r = size * 0.38;
  const circ = 2 * Math.PI * r;
  const fill = (score / 100) * circ;
  const color = score >= 80 ? "#10b981" : score >= 60 ? "#F59E0B" : "#f87171";
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={6} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={color} strokeWidth={6}
          strokeDasharray={`${fill} ${circ}`}
          strokeLinecap="round"
          style={{ transition: "stroke-dasharray 0.8s ease" }}
        />
      </svg>
      <div className="absolute text-center">
        <span className="text-lg font-black" style={{ color }}>{score}</span>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TalentProfilePage() {
  useRoleGuard("talent.manage");
  const { profile: authProfile, user } = useAuth();
  const supabase = createClient();

  const [talent, setTalent] = useState<Partial<TalentProfile>>({
    full_name: authProfile?.full_name ?? "",
    headline: "",
    bio: "",
    skills: [],
    hourly_rate: null,
    location: "",
    availability: "available",
    languages: ["English"],
    linkedin_url: "",
    portfolio_url: "",
  });
  const [experience, setExperience] = useState<WorkExperience[]>([]);
  const [education, setEducation] = useState<Education[]>([]);
  const [, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [skillInput, setSkillInput] = useState("");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [portfolioImages, setPortfolioImages] = useState<(string | null)[]>([null, null, null]);
  const fileRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<"profile" | "experience" | "portfolio" | "score">("profile");

  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    const { data } = await supabase
      .from("freelancer_profiles")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();
    if (data) {
      setTalent(data as TalentProfile);
    } else {
      setTalent((prev) => ({ ...prev, full_name: authProfile?.full_name ?? "" }));
    }

    const { data: expData } = await supabase
      .from("work_experience")
      .select("*")
      .eq("user_id", user.id)
      .order("start_date", { ascending: false });
    setExperience((expData as WorkExperience[]) ?? []);

    const { data: eduData } = await supabase
      .from("education")
      .select("*")
      .eq("user_id", user.id)
      .order("year", { ascending: false });
    setEducation((eduData as Education[]) ?? []);

    setLoading(false);
  }, [user?.id, authProfile?.full_name]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!user?.id) return;
    setSaving(true);
    const payload = {
      user_id: user.id,
      business_id: authProfile?.business_id ?? null,
      ...talent,
      updated_at: new Date().toISOString(),
    };
    await supabase.from("freelancer_profiles").upsert(payload, { onConflict: "user_id" });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const addSkill = (skill: string) => {
    const s = skill.trim();
    if (!s || (talent.skills ?? []).includes(s)) return;
    setTalent((prev) => ({ ...prev, skills: [...(prev.skills ?? []), s] }));
    setSkillInput("");
  };

  const removeSkill = (skill: string) => {
    setTalent((prev) => ({ ...prev, skills: (prev.skills ?? []).filter((s) => s !== skill) }));
  };

  const uploadAvatar = async (file: File) => {
    if (!user?.id) return;
    setUploadingAvatar(true);
    const ext = file.name.split(".").pop();
    const path = `avatars/${user.id}.${ext}`;
    const { error } = await supabase.storage.from("profiles").upload(path, file, { upsert: true });
    if (!error) {
      const { data } = supabase.storage.from("profiles").getPublicUrl(path);
      setTalent((prev) => ({ ...prev, avatar_url: data.publicUrl }));
    }
    setUploadingAvatar(false);
  };

  // Compute KENUXA Talent Score
  const computeScore = () => {
    let score = 0;
    if (talent.full_name) score += 10;
    if (talent.headline) score += 10;
    if (talent.bio && talent.bio.length > 50) score += 15;
    if ((talent.skills ?? []).length >= 3) score += 15;
    if (talent.hourly_rate) score += 5;
    if (talent.location) score += 5;
    if (talent.avatar_url) score += 10;
    if (talent.portfolio_url) score += 10;
    if (talent.linkedin_url) score += 5;
    if (experience.length > 0) score += 10;
    if (education.length > 0) score += 5;
    return Math.min(score, 100);
  };

  const score = talent.kenuxa_score ?? computeScore();

  const TABS = [
    { key: "profile" as const,     label: "Profile",     icon: Pen },
    { key: "experience" as const,  label: "Experience",  icon: Briefcase },
    { key: "portfolio" as const,   label: "Portfolio",   icon: Globe },
    { key: "score" as const,       label: "KENUXA Score",icon: BadgeCheck },
  ];

  return (
    <div className="animate-fade-in">
      <Header
        title="Talent Profile"
        subtitle="Your professional identity on KENUXA — be discovered worldwide"
        actions={
          <Button onClick={save} disabled={saving}>
            {saving ? <><Loader2 size={13} className="animate-spin" /> Saving...</> : saved ? <><CheckCircle2 size={13} /> Saved!</> : <><Save size={13} /> Save Profile</>}
          </Button>
        }
      />

      <div className="p-6 space-y-6">
        {/* Profile card preview */}
        <div className="relative rounded-2xl overflow-hidden border border-[rgba(139,92,246,0.2)] bg-gradient-to-r from-[rgba(139,92,246,0.08)] to-transparent p-6">
          <div className="flex items-center gap-5">
            {/* Avatar */}
            <div className="relative flex-shrink-0">
              <div
                onClick={() => fileRef.current?.click()}
                className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[rgba(139,92,246,0.3)] to-[rgba(255,101,36,0.2)] flex items-center justify-center text-2xl font-black text-[#a78bfa] cursor-pointer group relative overflow-hidden border-2 border-[rgba(139,92,246,0.2)] hover:border-[rgba(139,92,246,0.5)] transition-all"
              >
                {talent.avatar_url ? (
                  <Image src={talent.avatar_url} alt="" className="w-full h-full object-cover" width={80} height={80} />
                ) : (
                  talent.full_name?.[0] ?? "?"
                )}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  {uploadingAvatar ? <Loader2 size={16} className="animate-spin text-white" /> : <Camera size={16} className="text-white" />}
                </div>
              </div>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadAvatar(e.target.files[0])} />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-bold text-[#f1f5f9]">{talent.full_name || "Your Name"}</h2>
                {talent.verified && <Shield size={14} className="text-[#3B82F6]" />}
              </div>
              <p className="text-sm text-[#94a3b8] mt-0.5">{talent.headline || "Your professional headline"}</p>
              <div className="flex items-center gap-3 mt-2 flex-wrap">
                {talent.location && <span className="text-xs text-[#64748b] flex items-center gap-1"><MapPin size={10} /> {talent.location}</span>}
                {talent.hourly_rate && <span className="text-xs text-[#FF8B5E] font-medium">{talent.hourly_rate?.toLocaleString()} GHS/hr</span>}
                {talent.availability && (
                  <span className={`text-xs font-medium capitalize flex items-center gap-1 ${AVAILABILITY_OPTIONS.find((a) => a.value === talent.availability)?.color ?? "text-[#64748b]"}`}>
                    <Clock size={9} /> {talent.availability?.replace("_", " ")}
                  </span>
                )}
              </div>
            </div>

            {/* Score */}
            <div className="flex-shrink-0 text-center">
              <ScoreRing score={score} size={72} />
              <p className="text-[10px] text-[#64748b] mt-1">KENUXA Score</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-[#0d0f1a] border border-white/7 rounded-xl w-fit">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${activeTab === key ? "bg-[rgba(139,92,246,0.15)] text-[#a78bfa]" : "text-[#64748b] hover:text-[#f1f5f9]"}`}
            >
              <Icon size={13} />
              {label}
            </button>
          ))}
        </div>

        {/* ── Profile Tab ── */}
        {activeTab === "profile" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-5">
              <Card className="p-5 space-y-4">
                <h3 className="text-sm font-semibold text-[#f1f5f9]">Basic Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#64748b] uppercase tracking-widest mb-1.5">Full Name</label>
                    <Input value={talent.full_name ?? ""} onChange={(e) => setTalent((p) => ({ ...p, full_name: e.target.value }))} placeholder="Your full name" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#64748b] uppercase tracking-widest mb-1.5">Location</label>
                    <Input value={talent.location ?? ""} onChange={(e) => setTalent((p) => ({ ...p, location: e.target.value }))} placeholder="e.g. Accra, Ghana" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#64748b] uppercase tracking-widest mb-1.5">Professional Headline</label>
                  <Input value={talent.headline ?? ""} onChange={(e) => setTalent((p) => ({ ...p, headline: e.target.value }))} placeholder="e.g. Full-Stack Developer & UI Designer" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#64748b] uppercase tracking-widest mb-1.5">Bio</label>
                  <textarea
                    value={talent.bio ?? ""}
                    onChange={(e) => setTalent((p) => ({ ...p, bio: e.target.value }))}
                    rows={4}
                    placeholder="Tell clients about yourself, your expertise, and what makes you unique..."
                    className="w-full bg-[#0d0f1a] border border-white/7 rounded-lg px-3 py-2.5 text-sm text-[#f1f5f9] placeholder:text-[#374151] focus:outline-none focus:border-[rgba(139,92,246,0.4)] resize-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#64748b] uppercase tracking-widest mb-1.5">Hourly Rate (GHS)</label>
                    <Input
                      type="number"
                      value={talent.hourly_rate ?? ""}
                      onChange={(e) => setTalent((p) => ({ ...p, hourly_rate: e.target.value ? parseFloat(e.target.value) : null }))}
                      placeholder="e.g. 150"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#64748b] uppercase tracking-widest mb-1.5">Availability</label>
                    <select
                      value={talent.availability ?? "available"}
                      onChange={(e) => setTalent((p) => ({ ...p, availability: e.target.value }))}
                      className="w-full bg-[#0d0f1a] border border-white/7 rounded-lg px-3 h-9 text-sm text-[#f1f5f9] focus:outline-none focus:border-[rgba(139,92,246,0.4)]"
                    >
                      {AVAILABILITY_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#64748b] uppercase tracking-widest mb-1.5">LinkedIn URL</label>
                    <Input value={talent.linkedin_url ?? ""} onChange={(e) => setTalent((p) => ({ ...p, linkedin_url: e.target.value }))} placeholder="https://linkedin.com/in/..." />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#64748b] uppercase tracking-widest mb-1.5">Portfolio URL</label>
                    <Input value={talent.portfolio_url ?? ""} onChange={(e) => setTalent((p) => ({ ...p, portfolio_url: e.target.value }))} placeholder="https://yourportfolio.com" />
                  </div>
                </div>
              </Card>

              {/* Skills */}
              <Card className="p-5 space-y-3">
                <h3 className="text-sm font-semibold text-[#f1f5f9]">Skills</h3>
                <div className="flex gap-2">
                  <Input
                    value={skillInput}
                    onChange={(e) => setSkillInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSkill(skillInput); } }}
                    placeholder="Type a skill and press Enter"
                    className="flex-1"
                  />
                  <Button size="sm" variant="secondary" onClick={() => addSkill(skillInput)}>
                    <Plus size={13} /> Add
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(talent.skills ?? []).map((s) => (
                    <span key={s} className="flex items-center gap-1.5 px-2.5 py-1 bg-[rgba(139,92,246,0.1)] border border-[rgba(139,92,246,0.2)] text-[#a78bfa] text-xs rounded-full">
                      {s}
                      <button onClick={() => removeSkill(s)} className="hover:text-white transition-colors"><X size={10} /></button>
                    </span>
                  ))}
                </div>
                <div>
                  <p className="text-xs text-[#374151] mb-2">Suggested:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {SKILL_SUGGESTIONS.filter((s) => !(talent.skills ?? []).includes(s)).slice(0, 12).map((s) => (
                      <button key={s} onClick={() => addSkill(s)} className="px-2.5 py-1 bg-white/3 border border-white/7 hover:border-[rgba(139,92,246,0.3)] text-xs text-[#64748b] hover:text-[#a78bfa] rounded-full transition-all">
                        + {s}
                      </button>
                    ))}
                  </div>
                </div>
              </Card>
            </div>

            {/* Sidebar checklist */}
            <div className="space-y-4">
              <Card className="p-5">
                <h3 className="text-sm font-semibold text-[#f1f5f9] mb-3">Profile Strength</h3>
                <div className="mb-3">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-[#64748b]">Completeness</span>
                    <span className="text-[#a78bfa]">{score}%</span>
                  </div>
                  <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-[#a78bfa] rounded-full transition-all" style={{ width: `${score}%` }} />
                  </div>
                </div>
                <div className="space-y-2">
                  {[
                    { label: "Name & headline",   done: !!(talent.full_name && talent.headline) },
                    { label: "Bio (50+ chars)",    done: (talent.bio?.length ?? 0) > 50 },
                    { label: "3+ skills",          done: (talent.skills?.length ?? 0) >= 3 },
                    { label: "Profile photo",      done: !!talent.avatar_url },
                    { label: "Location",           done: !!talent.location },
                    { label: "Hourly rate",        done: !!talent.hourly_rate },
                    { label: "Portfolio URL",      done: !!talent.portfolio_url },
                    { label: "Work experience",    done: experience.length > 0 },
                    { label: "Education",          done: education.length > 0 },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center gap-2 text-xs">
                      <CheckCircle2 size={12} className={item.done ? "text-[#10b981]" : "text-[#374151]"} />
                      <span className={item.done ? "text-[#94a3b8]" : "text-[#64748b]"}>{item.label}</span>
                      {item.done && <span className="ml-auto text-[#10b981] text-[10px]">✓</span>}
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="p-5 border-[rgba(255,101,36,0.2)] bg-[rgba(255,101,36,0.04)]">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp size={13} className="text-[#FF8B5E]" />
                  <p className="text-xs font-bold text-[#FF8B5E]">PRO TIP</p>
                </div>
                <p className="text-xs text-[#94a3b8] leading-relaxed">
                  Profiles with a photo, bio, and 5+ skills get <strong className="text-[#f1f5f9]">3× more views</strong> and are shown first in search results.
                </p>
              </Card>
            </div>
          </div>
        )}

        {/* ── Experience Tab ── */}
        {activeTab === "experience" && (
          <div className="max-w-2xl space-y-4">
            <Card className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-[#f1f5f9]">Work Experience</h3>
                <Button size="sm" variant="secondary" onClick={() => setExperience((prev) => [{ id: Date.now().toString(), title: "", company: "", start_date: "", end_date: null, description: null, current: false }, ...prev])}>
                  <Plus size={13} /> Add
                </Button>
              </div>
              {experience.length === 0 ? (
                <p className="text-sm text-[#64748b] py-4 text-center">No work experience added yet.</p>
              ) : (
                <div className="space-y-4">
                  {experience.map((exp, i) => (
                    <div key={exp.id} className="p-4 bg-[#07080f] border border-white/7 rounded-xl space-y-3">
                      <div className="flex justify-between">
                        <p className="text-xs font-semibold text-[#64748b] uppercase tracking-widest">Experience {i + 1}</p>
                        <button onClick={() => setExperience((prev) => prev.filter((e) => e.id !== exp.id))} className="text-[#374151] hover:text-[#f87171] transition-colors">
                          <X size={13} />
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <Input placeholder="Job Title" value={exp.title} onChange={(e) => setExperience((prev) => prev.map((x) => x.id === exp.id ? { ...x, title: e.target.value } : x))} />
                        <Input placeholder="Company" value={exp.company} onChange={(e) => setExperience((prev) => prev.map((x) => x.id === exp.id ? { ...x, company: e.target.value } : x))} />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <Input type="date" placeholder="Start Date" value={exp.start_date} onChange={(e) => setExperience((prev) => prev.map((x) => x.id === exp.id ? { ...x, start_date: e.target.value } : x))} />
                        <Input type="date" placeholder="End Date" value={exp.end_date ?? ""} disabled={exp.current} onChange={(e) => setExperience((prev) => prev.map((x) => x.id === exp.id ? { ...x, end_date: e.target.value } : x))} />
                      </div>
                      <label className="flex items-center gap-2 text-xs text-[#64748b] cursor-pointer">
                        <input type="checkbox" checked={exp.current} onChange={(e) => setExperience((prev) => prev.map((x) => x.id === exp.id ? { ...x, current: e.target.checked, end_date: null } : x))} className="accent-[#a78bfa]" />
                        Current position
                      </label>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-[#f1f5f9]">Education</h3>
                <Button size="sm" variant="secondary" onClick={() => setEducation((prev) => [{ id: Date.now().toString(), degree: "", institution: "", year: "" }, ...prev])}>
                  <Plus size={13} /> Add
                </Button>
              </div>
              {education.length === 0 ? (
                <p className="text-sm text-[#64748b] py-4 text-center">No education added yet.</p>
              ) : (
                <div className="space-y-3">
                  {education.map((edu) => (
                    <div key={edu.id} className="p-4 bg-[#07080f] border border-white/7 rounded-xl">
                      <div className="flex justify-between mb-3">
                        <GraduationCap size={14} className="text-[#64748b]" />
                        <button onClick={() => setEducation((prev) => prev.filter((e) => e.id !== edu.id))} className="text-[#374151] hover:text-[#f87171] transition-colors"><X size={13} /></button>
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <Input placeholder="Degree / Cert" value={edu.degree} onChange={(e) => setEducation((prev) => prev.map((x) => x.id === edu.id ? { ...x, degree: e.target.value } : x))} className="col-span-2" />
                        <Input placeholder="Year" value={edu.year} onChange={(e) => setEducation((prev) => prev.map((x) => x.id === edu.id ? { ...x, year: e.target.value } : x))} />
                      </div>
                      <Input placeholder="Institution" value={edu.institution} onChange={(e) => setEducation((prev) => prev.map((x) => x.id === edu.id ? { ...x, institution: e.target.value } : x))} className="mt-3" />
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Button onClick={save} disabled={saving} className="w-full">
              {saving ? <><Loader2 size={13} className="animate-spin" /> Saving...</> : <><Save size={13} /> Save Experience</>}
            </Button>
          </div>
        )}

        {/* ── Portfolio Tab ── */}
        {activeTab === "portfolio" && (
          <div className="max-w-2xl">
            <Card className="p-6 space-y-5">
              <h3 className="text-sm font-semibold text-[#f1f5f9]">Portfolio & Links</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[#64748b] uppercase tracking-widest mb-1.5">Portfolio Website</label>
                  <Input value={talent.portfolio_url ?? ""} onChange={(e) => setTalent((p) => ({ ...p, portfolio_url: e.target.value }))} placeholder="https://yourportfolio.com" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#64748b] uppercase tracking-widest mb-1.5">LinkedIn Profile</label>
                  <Input value={talent.linkedin_url ?? ""} onChange={(e) => setTalent((p) => ({ ...p, linkedin_url: e.target.value }))} placeholder="https://linkedin.com/in/yourname" />
                </div>
              </div>

              <div className="p-5 bg-[#07080f] border border-white/7 rounded-xl">
                <div className="flex items-center gap-2 mb-3">
                  <Upload size={14} className="text-[#FF8B5E]" />
                  <p className="text-sm font-semibold text-[#f1f5f9]">Portfolio Work Uploads</p>
                </div>
                <p className="text-xs text-[#64748b] mb-4">Upload images of your work — logo designs, websites, photos, etc.</p>
                <div className="grid grid-cols-3 gap-3">
                  {portfolioImages.map((img, i) => (
                    <ImageUpload
                      key={i}
                      value={img}
                      onChange={(url) => setPortfolioImages((prev) => {
                        const next = [...prev];
                        next[i] = url;
                        return next;
                      })}
                      bucket="portfolio"
                      path={`${user?.id}/item-${i}`}
                      shape="square"
                      size="sm"
                      placeholder={`Work ${i + 1}`}
                    />
                  ))}
                </div>
              </div>

              <Button onClick={save} disabled={saving} className="w-full">
                {saving ? "Saving..." : <><Save size={13} /> Save Portfolio</>}
              </Button>
            </Card>
          </div>
        )}

        {/* ── KENUXA Score Tab ── */}
        {activeTab === "score" && (
          <div className="max-w-2xl space-y-4">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-base font-semibold text-[#f1f5f9]">Your KENUXA Talent Score</h3>
                  <p className="text-sm text-[#64748b] mt-0.5">A reputation metric that earns you trust, visibility & opportunities.</p>
                </div>
                <ScoreRing score={score} size={88} />
              </div>

              <div className="space-y-3">
                {[
                  { label: "Profile Completeness",  pct: (((talent.full_name ? 1 : 0) + (talent.headline ? 1 : 0) + ((talent.bio?.length ?? 0) > 50 ? 1 : 0) + (talent.avatar_url ? 1 : 0)) / 4) * 100, weight: "30%" },
                  { label: "Skills Listed",          pct: Math.min(((talent.skills?.length ?? 0) / 5) * 100, 100), weight: "20%" },
                  { label: "Work Experience",        pct: Math.min(experience.length * 50, 100), weight: "20%" },
                  { label: "Portfolio & Links",      pct: (((talent.portfolio_url ? 1 : 0) + (talent.linkedin_url ? 1 : 0)) / 2) * 100, weight: "15%" },
                  { label: "Reviews & Ratings",      pct: Math.min(((talent.reviews_count ?? 0) / 10) * 100, 100), weight: "15%" },
                ].map((item) => (
                  <div key={item.label}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-[#94a3b8]">{item.label}</span>
                      <span className="text-[#64748b]">{item.weight} weight · {Math.round(item.pct)}% complete</span>
                    </div>
                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full bg-[#a78bfa] rounded-full transition-all" style={{ width: `${item.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-5 border-[rgba(139,92,246,0.2)] bg-[rgba(139,92,246,0.04)]">
              <div className="flex items-center gap-2 mb-3">
                <BadgeCheck size={15} className="text-[#a78bfa]" />
                <h4 className="text-sm font-semibold text-[#f1f5f9]">What your score unlocks</h4>
              </div>
              <div className="space-y-2">
                {[
                  { min: 0,   label: "Basic profile visibility" },
                  { min: 40,  label: "Featured in search results" },
                  { min: 60,  label: "Verified badge eligibility" },
                  { min: 80,  label: "Top Freelancer status + priority listing" },
                  { min: 95,  label: "KENUXA Certified Professional badge" },
                ].map((tier) => (
                  <div key={tier.min} className={`flex items-center gap-2 text-xs ${score >= tier.min ? "text-[#94a3b8]" : "text-[#374151] opacity-50"}`}>
                    <CheckCircle2 size={11} className={score >= tier.min ? "text-[#10b981]" : "text-[#374151]"} />
                    <span className="font-mono text-[10px] w-8">{tier.min}+</span>
                    <span>{tier.label}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
