"use client";

import { useEffect, useState, useCallback } from "react";
import { Header } from "@/components/layout/header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatCard } from "@/components/ui/stat-card";
import { formatCurrency } from "@/lib/utils";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/hooks/use-auth";
import {
  Pen, Search, Star, MapPin, Users, Briefcase, Shield,
  Clock, CheckCircle2, ArrowRight,
  Code, Palette, Megaphone, Camera, BookOpen, BarChart2,
  Wrench, Globe, Zap, Plus,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface FreelancerProfile {
  id: string;
  full_name: string;
  headline: string | null;
  skills: string[] | null;
  hourly_rate: number | null;
  location: string | null;
  rating: number | null;
  reviews_count: number | null;
  completed_jobs: number | null;
  availability: string | null;
  verified: boolean | null;
  avatar_url: string | null;
}

interface ServicePackage {
  id: string;
  title: string;
  description: string | null;
  price: number;
  delivery_days: number | null;
  freelancer_name: string | null;
  category: string | null;
  rating: number | null;
}

type Tab = "browse" | "post" | "my_services";

const SKILL_CATEGORIES = [
  { label: "All Skills",       icon: Globe,      color: "text-[#64748b]"  },
  { label: "Technology",       icon: Code,       color: "text-[#3B82F6]"  },
  { label: "Design",           icon: Palette,    color: "text-[#8B5CF6]"  },
  { label: "Marketing",        icon: Megaphone,  color: "text-[#F59E0B]"  },
  { label: "Photography",      icon: Camera,     color: "text-[#f87171]"  },
  { label: "Writing",          icon: BookOpen,   color: "text-[#10b981]"  },
  { label: "Finance",          icon: BarChart2,  color: "text-[#FF8B5E]"  },
  { label: "Trades",           icon: Wrench,     color: "text-[#94a3b8]"  },
];

const POPULAR_SKILLS = [
  "Logo Design", "Web Development", "Social Media Management",
  "Video Editing", "SEO", "Content Writing", "Mobile App Dev",
  "UI/UX Design", "Photography", "Data Analysis", "Accounting",
  "Translation", "Voice Over", "Animation", "WordPress",
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function FreelancersPage() {
  const { profile, role } = useAuth();
  const supabase = createClient();

  const [tab, setTab] = useState<Tab>("browse");
  const [query, setQuery] = useState("");
  const [skillCat, setSkillCat] = useState("All Skills");
  const [freelancers, setFreelancers] = useState<FreelancerProfile[]>([]);
  const [packages, setPackages] = useState<ServicePackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalFreelancers, setTotalFreelancers] = useState(0);

  // Post-a-job form
  const [jobTitle, setJobTitle] = useState("");
  const [jobDesc, setJobDesc] = useState("");
  const [jobBudget, setJobBudget] = useState("");
  const [jobDeadline, setJobDeadline] = useState("");
  const [posting, setPosting] = useState(false);
  const [postSuccess, setPostSuccess] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [profilesRes, countRes, packagesRes] = await Promise.all([
        supabase
          .from("freelancer_profiles")
          .select("id, full_name, headline, skills, hourly_rate, location, rating, reviews_count, completed_jobs, availability, verified, avatar_url")
          .ilike(query ? "full_name" : "availability", query ? `%${query}%` : "%")
          .order("rating", { ascending: false })
          .limit(12),
        supabase
          .from("freelancer_profiles")
          .select("id", { count: "exact", head: true }),
        supabase
          .from("freelancer_packages")
          .select("id, title, description, price, delivery_days, freelancer_name, category, rating")
          .order("rating", { ascending: false, nullsFirst: false })
          .limit(8),
      ]);

      setFreelancers((profilesRes.data as FreelancerProfile[]) ?? []);
      setTotalFreelancers(countRes.count ?? 0);
      setPackages((packagesRes.data as ServicePackage[]) ?? []);
    } finally {
      setLoading(false);
    }
  }, [query]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const t = setTimeout(() => load(), 300);
    return () => clearTimeout(t);
  }, [load]);

  const postJob = async () => {
    if (!jobTitle.trim() || !profile?.business_id) return;
    setPosting(true);
    try {
      const { error: insertErr } = await supabase.from("freelance_requests").insert({
        business_id: profile.business_id,
        title: jobTitle,
        description: jobDesc,
        budget: jobBudget ? parseFloat(jobBudget) : null,
        deadline: jobDeadline || null,
        status: "open",
      });
      if (!insertErr) {
        setPostSuccess(true);
        setJobTitle(""); setJobDesc(""); setJobBudget(""); setJobDeadline("");
        setTimeout(() => setPostSuccess(false), 3000);
      }
    } finally {
      setPosting(false);
    }
  };

  const isBusiness = ["business_owner", "branch_manager", "employee"].includes(role ?? "");

  return (
    <div className="animate-fade-in">
      <Header
        title="Freelancers"
        subtitle="The talent marketplace — hire skills, find clients, grow together"
        actions={
          <div className="flex gap-2">
            {isBusiness && (
              <Button size="sm" onClick={() => setTab("post")}>
                <Plus size={13} /> Post a Job
              </Button>
            )}
            <Button size="sm" variant="secondary" onClick={() => setTab("browse")}>
              <Search size={13} /> Browse Talent
            </Button>
          </div>
        }
      />

      <div className="p-6 space-y-6">
        {/* Hero */}
        <div className="relative rounded-2xl overflow-hidden border border-[rgba(139,92,246,0.2)] bg-gradient-to-br from-[rgba(139,92,246,0.1)] via-[rgba(139,92,246,0.04)] to-[rgba(255,101,36,0.06)] p-7">
          <div className="relative z-10 max-w-xl">
            <div className="flex items-center gap-2 mb-2">
              <Pen size={16} className="text-[#a78bfa]" />
              <span className="text-xs font-bold text-[#a78bfa] uppercase tracking-widest">KENUXA Freelancers</span>
            </div>
            <h2 className="text-xl font-bold text-[#f1f5f9] mb-2">Find the perfect talent for any project</h2>
            <p className="text-sm text-[#94a3b8]">Connect with verified freelancers on KENUXA. From logo design to software development, find your match in minutes.</p>
            <div className="flex gap-3 mt-4">
              <div className="flex items-center gap-1.5 text-xs text-[#64748b]">
                <CheckCircle2 size={12} className="text-[#10b981]" />
                <span>Verified profiles</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-[#64748b]">
                <Shield size={12} className="text-[#3B82F6]" />
                <span>Secure payments</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-[#64748b]">
                <Star size={12} className="text-[#F59E0B]" />
                <span>Rated & reviewed</span>
              </div>
            </div>
          </div>
          <Pen size={100} className="absolute right-8 top-1/2 -translate-y-1/2 text-[#8B5CF6] opacity-5" />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard title="Freelancers"    value={loading ? 0 : totalFreelancers} format="number" color="orange" icon={<Users size={16} />} />
          <StatCard title="Skills Listed"  value={loading ? 0 : packages.length}  format="number" color="blue"   icon={<Briefcase size={16} />} />
          <StatCard title="Avg Rating"     value={4.8}                            format="number" color="amber"  icon={<Star size={16} />} />
          <StatCard title="Jobs Completed" value={loading ? 0 : freelancers.reduce((s, f) => s + (f.completed_jobs ?? 0), 0)} format="number" color="green" icon={<CheckCircle2 size={16} />} />
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-[#0d0f1a] border border-white/7 rounded-xl w-fit">
          {([
            { key: "browse",      label: "Browse Talent" },
            { key: "post",        label: "Post a Job",    hidden: !isBusiness },
            { key: "my_services", label: "My Services" },
          ] as { key: Tab; label: string; hidden?: boolean }[]).filter((t) => !t.hidden).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${tab === key ? "bg-[rgba(139,92,246,0.15)] text-[#a78bfa]" : "text-[#64748b] hover:text-[#f1f5f9]"}`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* ── Browse Tab ── */}
        {tab === "browse" && (
          <div className="space-y-6">
            {/* Search */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748b]" />
                <Input
                  placeholder="Search by name, skill, or category..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            {/* Skill categories */}
            <div className="flex gap-2 flex-wrap">
              {SKILL_CATEGORIES.map(({ label, icon: Icon, color }) => (
                <button
                  key={label}
                  onClick={() => setSkillCat(label)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-all ${
                    skillCat === label
                      ? "border-[rgba(139,92,246,0.5)] bg-[rgba(139,92,246,0.1)] text-[#a78bfa]"
                      : "border-white/7 text-[#64748b] hover:border-white/15 hover:text-[#f1f5f9]"
                  }`}
                >
                  <Icon size={11} className={skillCat === label ? "text-[#a78bfa]" : color} />
                  {label}
                </button>
              ))}
            </div>

            {/* Popular skills */}
            <div>
              <p className="text-xs text-[#374151] mb-2">Popular skills:</p>
              <div className="flex flex-wrap gap-1.5">
                {POPULAR_SKILLS.map((s) => (
                  <button
                    key={s}
                    onClick={() => setQuery(s)}
                    className="px-2.5 py-1 bg-[#0d0f1a] border border-white/5 hover:border-[rgba(139,92,246,0.3)] text-xs text-[#64748b] hover:text-[#f1f5f9] rounded-lg transition-all"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Freelancer grid */}
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-52 bg-[#111624] rounded-2xl animate-pulse" />
                ))}
              </div>
            ) : freelancers.length === 0 ? (
              <div className="bg-[#0d0f1a] border border-white/7 rounded-2xl p-16 text-center">
                <Pen size={36} className="mx-auto mb-3 text-[#374151]" />
                <p className="text-[#f1f5f9] font-semibold mb-1">No freelancers found</p>
                <p className="text-sm text-[#64748b]">Be the first to create a freelancer profile on KENUXA.</p>
                <Button size="sm" className="mt-4" onClick={() => setTab("my_services")}>Create Profile</Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {freelancers.map((f) => (
                  <Card key={f.id} className="p-5 hover:border-[rgba(139,92,246,0.3)] transition-all group cursor-pointer">
                    <div className="flex items-start gap-3 mb-4">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[rgba(139,92,246,0.2)] to-[rgba(255,101,36,0.1)] flex items-center justify-center text-lg font-bold text-[#a78bfa] flex-shrink-0">
                        {f.avatar_url ? (
                          <Image src={f.avatar_url} alt={f.full_name} width={48} height={48} className="w-full h-full rounded-2xl object-cover" />
                        ) : (
                          f.full_name[0]
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-semibold text-[#f1f5f9] group-hover:text-[#a78bfa] transition-colors truncate">{f.full_name}</p>
                          {f.verified && <Shield size={11} className="text-[#3B82F6] flex-shrink-0" />}
                        </div>
                        <p className="text-xs text-[#64748b] truncate mt-0.5">{f.headline ?? "Freelancer"}</p>
                        {f.location && (
                          <p className="text-xs text-[#374151] flex items-center gap-1 mt-0.5">
                            <MapPin size={9} /> {f.location}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Skills */}
                    {f.skills && f.skills.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-4">
                        {f.skills.slice(0, 3).map((s) => (
                          <span key={s} className="px-2 py-0.5 bg-[rgba(139,92,246,0.08)] border border-[rgba(139,92,246,0.15)] text-[#a78bfa] text-[10px] rounded-full">
                            {s}
                          </span>
                        ))}
                        {f.skills.length > 3 && (
                          <span className="px-2 py-0.5 bg-white/5 text-[#374151] text-[10px] rounded-full">+{f.skills.length - 3}</span>
                        )}
                      </div>
                    )}

                    {/* Stats row */}
                    <div className="flex items-center justify-between pt-3 border-t border-white/7">
                      <div className="flex items-center gap-3 text-xs text-[#64748b]">
                        {f.rating && (
                          <span className="flex items-center gap-1">
                            <Star size={10} className="text-[#F59E0B] fill-[#F59E0B]" />
                            {f.rating.toFixed(1)}
                            {f.reviews_count && <span className="text-[#374151]">({f.reviews_count})</span>}
                          </span>
                        )}
                        {f.completed_jobs !== null && (
                          <span className="flex items-center gap-1">
                            <CheckCircle2 size={10} className="text-[#10b981]" /> {f.completed_jobs} jobs
                          </span>
                        )}
                        {f.availability && (
                          <span className={`flex items-center gap-1 ${f.availability === "available" ? "text-[#10b981]" : "text-[#374151]"}`}>
                            <Clock size={10} /> {f.availability}
                          </span>
                        )}
                      </div>
                      {f.hourly_rate && (
                        <span className="text-sm font-bold text-[#FF8B5E]">
                          {formatCurrency(f.hourly_rate)}/hr
                        </span>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            )}

            {/* Service packages */}
            {packages.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-[#f1f5f9] mb-3 flex items-center gap-2">
                  <Zap size={14} className="text-[#FF8B5E]" /> Service Packages
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {packages.map((p) => (
                    <div key={p.id} className="p-4 bg-[#0d0f1a] border border-white/7 hover:border-[rgba(139,92,246,0.3)] rounded-xl transition-all cursor-pointer">
                      <p className="text-xs text-[#64748b] mb-1">{p.category ?? "Service"}</p>
                      <p className="text-sm font-medium text-[#f1f5f9] leading-tight mb-2">{p.title}</p>
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-bold text-[#FF8B5E]">{formatCurrency(p.price)}</p>
                        {p.delivery_days && (
                          <span className="text-xs text-[#64748b]">{p.delivery_days}d delivery</span>
                        )}
                      </div>
                      {p.rating && (
                        <div className="flex items-center gap-1 mt-1.5">
                          <Star size={9} className="text-[#F59E0B] fill-[#F59E0B]" />
                          <span className="text-xs text-[#94a3b8]">{p.rating.toFixed(1)}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Post a Job Tab ── */}
        {tab === "post" && (
          <div className="max-w-2xl">
            <Card className="p-6 space-y-5">
              <div>
                <h3 className="text-base font-semibold text-[#f1f5f9] mb-1">Post a Freelance Job</h3>
                <p className="text-sm text-[#64748b]">Describe what you need and receive proposals from qualified freelancers.</p>
              </div>

              {postSuccess && (
                <div className="flex items-center gap-2 p-3 bg-[rgba(16,185,129,0.1)] border border-[rgba(16,185,129,0.2)] rounded-lg">
                  <CheckCircle2 size={14} className="text-[#10b981]" />
                  <span className="text-sm text-[#10b981]">Job posted successfully! Freelancers will reach out soon.</span>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[#64748b] uppercase tracking-widest mb-1.5">Job Title *</label>
                  <Input
                    placeholder="e.g. Logo design for my bakery business"
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#64748b] uppercase tracking-widest mb-1.5">Description</label>
                  <textarea
                    placeholder="Describe the project, requirements, and expected deliverables..."
                    value={jobDesc}
                    onChange={(e) => setJobDesc(e.target.value)}
                    rows={4}
                    className="w-full bg-[#0d0f1a] border border-white/7 rounded-lg px-3 py-2.5 text-sm text-[#f1f5f9] placeholder:text-[#374151] focus:outline-none focus:border-[rgba(139,92,246,0.4)] resize-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#64748b] uppercase tracking-widest mb-1.5">Budget (GHS)</label>
                    <Input
                      type="number"
                      placeholder="e.g. 500"
                      value={jobBudget}
                      onChange={(e) => setJobBudget(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#64748b] uppercase tracking-widest mb-1.5">Deadline</label>
                    <Input
                      type="date"
                      value={jobDeadline}
                      onChange={(e) => setJobDeadline(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <Button onClick={postJob} disabled={posting || !jobTitle.trim()} className="w-full">
                {posting ? "Posting..." : "Post Job & Find Freelancers"}
                <ArrowRight size={14} />
              </Button>
            </Card>
          </div>
        )}

        {/* ── My Services Tab ── */}
        {tab === "my_services" && (
          <div className="max-w-2xl">
            <Card className="p-6 space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-semibold text-[#f1f5f9]">Your Freelancer Profile</h3>
                  <p className="text-sm text-[#64748b] mt-0.5">Showcase your skills and attract clients on KENUXA.</p>
                </div>
                <Link href="/dashboard/talent">
                  <Button size="sm" variant="secondary">Edit Full Profile</Button>
                </Link>
              </div>

              <div className="bg-[rgba(139,92,246,0.06)] border border-[rgba(139,92,246,0.15)] rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[rgba(139,92,246,0.3)] to-[rgba(255,101,36,0.2)] flex items-center justify-center text-lg font-bold text-[#a78bfa]">
                    {profile?.full_name?.[0] ?? "?"}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#f1f5f9]">{profile?.full_name ?? "Your Name"}</p>
                    <p className="text-xs text-[#64748b]">Complete your talent profile to get hired</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  {[
                    { label: "Profile Views",   value: "—" },
                    { label: "Proposals Sent",  value: "—" },
                    { label: "Jobs Completed",  value: "—" },
                  ].map((s) => (
                    <div key={s.label} className="bg-[#07080f] rounded-lg p-2">
                      <p className="text-base font-bold text-[#f1f5f9]">{s.value}</p>
                      <p className="text-[10px] text-[#64748b]">{s.label}</p>
                    </div>
                  ))}
                </div>
              </div>

              <Link href="/dashboard/talent">
                <Button className="w-full"><Pen size={13} /> Build Your Talent Profile</Button>
              </Link>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
