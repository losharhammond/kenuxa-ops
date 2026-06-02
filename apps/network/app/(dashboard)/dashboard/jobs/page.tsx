"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Header } from "@/components/layout/header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/utils";
import Image from "next/image";
import {
  Search, MapPin, Briefcase, Users, Wifi, PlusCircle, X,
  Bookmark, BookmarkCheck, Send, Sparkles,
  FileText, CheckCircle2, AlertCircle, Loader2,
  DollarSign, Calendar, TrendingUp,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/hooks/use-auth";
import { ImageUpload } from "@/components/ui/image-upload";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Job {
  id: string;
  title: string;
  company_name: string | null;
  business_name: string | null;
  job_type: string;
  location: string | null;
  salary_min: number | null;
  salary_max: number | null;
  skills: string[] | null;
  description: string | null;
  requirements: string | null;
  application_count: number;
  posted_at: string;
  deadline: string | null;
  is_remote: boolean;
  status: string;
  company_logo_url: string | null;
}

interface Application {
  id: string;
  job_id: string;
  job_title: string | null;
  company_name: string | null;
  status: string;
  applied_at: string;
  cover_letter: string | null;
}

interface PostForm {
  title: string;
  company_name: string;
  job_type: string;
  location: string;
  salary_min: string;
  salary_max: string;
  description: string;
  requirements: string;
  skills: string;
  deadline: string;
  is_remote: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TYPE_COLOR: Record<string, "orange" | "blue" | "green" | "amber"> = {
  full_time: "blue", part_time: "green", contract: "amber",
  gig: "orange", internship: "green",
};
const TYPE_LABEL: Record<string, string> = {
  full_time: "Full-Time", part_time: "Part-Time", contract: "Contract",
  gig: "Gig", internship: "Internship",
};
const APP_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending:    { label: "Under Review", color: "text-amber-400 bg-amber-400/10" },
  shortlisted:{ label: "Shortlisted",  color: "text-blue-400 bg-blue-400/10" },
  interview:  { label: "Interview",    color: "text-purple-400 bg-purple-400/10" },
  accepted:   { label: "Accepted 🎉",  color: "text-emerald-400 bg-emerald-400/10" },
  rejected:   { label: "Not Selected", color: "text-slate-400 bg-slate-400/10" },
};
const DEFAULT_POST: PostForm = {
  title: "", company_name: "", job_type: "full_time", location: "Accra",
  salary_min: "", salary_max: "", description: "", requirements: "",
  skills: "", deadline: "", is_remote: false,
};
const GHANA_CITIES = ["Accra", "Kumasi", "Takoradi", "Tamale", "Cape Coast", "Tema", "Sunyani", "Ho", "Koforidua", "Remote"];
const AI_TIPS = [
  "Tailor your cover letter to each job's specific requirements.",
  "Highlight measurable achievements: 'Increased sales by 40%' beats 'Managed sales team'.",
  "Include keywords from the job description — many companies use ATS screening.",
  "Follow up professionally 5–7 days after submitting your application.",
  "Research the company before applying — showing knowledge sets you apart.",
];

type Tab = "browse" | "applications" | "saved" | "post";

// ─── Job Detail Drawer ────────────────────────────────────────────────────────

function JobDetailDrawer({
  job,
  saved,
  hasApplied,
  onClose,
  onSave,
  onApply,
}: {
  job: Job;
  saved: boolean;
  hasApplied: boolean;
  onClose: () => void;
  onSave: () => void;
  onApply: () => void;
}) {
  const employer = job.company_name ?? job.business_name ?? "Company";

  return (
    <div className="fixed inset-0 z-50 flex" onClick={onClose}>
      <div className="flex-1 bg-black/50" />
      <div
        className="w-full max-w-xl bg-[#0d0f1a] border-l border-white/10 overflow-y-auto flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-white/7 flex items-start justify-between gap-4 flex-shrink-0">
          <div className="flex gap-4 items-start">
            <div className="w-14 h-14 rounded-2xl bg-[rgba(255,101,36,0.12)] overflow-hidden flex items-center justify-center flex-shrink-0">
              {job.company_logo_url ? (
                <Image src={job.company_logo_url} alt={employer} width={56} height={56} className="w-full h-full object-cover" />
              ) : (
                <span className="text-[#FF8B5E] font-bold text-xl">{employer[0]}</span>
              )}
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#f1f5f9] leading-tight">{job.title}</h2>
              <p className="text-sm text-[#64748b] mt-0.5">{employer}</p>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <Badge variant={TYPE_COLOR[job.job_type] ?? "default"}>{TYPE_LABEL[job.job_type] ?? job.job_type}</Badge>
                {job.is_remote && <Badge variant="green"><Wifi size={10} className="mr-1" />Remote</Badge>}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="text-[#64748b] hover:text-[#f1f5f9] p-1 flex-shrink-0">
            <X size={20} />
          </button>
        </div>

        {/* Meta */}
        <div className="px-6 py-4 grid grid-cols-2 gap-3 border-b border-white/7">
          {[
            { icon: MapPin,    label: job.location ?? "Ghana" },
            { icon: DollarSign, label: job.salary_min && job.salary_max ? `${formatCurrency(job.salary_min)} – ${formatCurrency(job.salary_max)}/mo` : "Negotiable" },
            { icon: Users,     label: `${job.application_count} applicants` },
            { icon: Calendar,  label: job.deadline ? `Closes ${formatDate(job.deadline)}` : "Open-ended" },
          ].map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-2 text-sm text-[#64748b]">
              <Icon size={13} className="text-[#374151] flex-shrink-0" />
              <span className="truncate">{label}</span>
            </div>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 p-6 space-y-5 overflow-y-auto">
          {job.description && (
            <div>
              <h3 className="text-xs font-semibold text-[#374151] uppercase tracking-widest mb-2">About this role</h3>
              <p className="text-sm text-[#94a3b8] whitespace-pre-wrap leading-relaxed">{job.description}</p>
            </div>
          )}
          {job.requirements && (
            <div>
              <h3 className="text-xs font-semibold text-[#374151] uppercase tracking-widest mb-2">Requirements</h3>
              <p className="text-sm text-[#94a3b8] whitespace-pre-wrap leading-relaxed">{job.requirements}</p>
            </div>
          )}
          {job.skills && job.skills.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-[#374151] uppercase tracking-widest mb-2">Skills</h3>
              <div className="flex flex-wrap gap-2">
                {job.skills.map((s) => (
                  <span key={s} className="text-xs bg-white/5 text-[#94a3b8] px-3 py-1 rounded-full border border-white/7">{s}</span>
                ))}
              </div>
            </div>
          )}
          {/* AI tip */}
          <div className="bg-[rgba(255,101,36,0.06)] border border-[rgba(255,101,36,0.15)] rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles size={14} className="text-[#FF8B5E]" />
              <span className="text-xs font-semibold text-[#FF8B5E]">AI Career Tip</span>
            </div>
            <p className="text-xs text-[#94a3b8]">{AI_TIPS[Math.floor(Math.random() * AI_TIPS.length)]}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="p-6 border-t border-white/7 flex gap-3 flex-shrink-0">
          <button
            onClick={onSave}
            className={`flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-medium transition-colors ${
              saved
                ? "bg-[rgba(255,101,36,0.1)] border-[rgba(255,101,36,0.3)] text-[#FF8B5E]"
                : "bg-white/5 border-white/10 text-[#64748b] hover:text-[#f1f5f9] hover:border-white/20"
            }`}
          >
            {saved ? <BookmarkCheck size={15} /> : <Bookmark size={15} />}
            {saved ? "Saved" : "Save"}
          </button>
          <button
            disabled={hasApplied}
            onClick={onApply}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-[#FF6524] hover:bg-[#FF7A3D] disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition-colors"
          >
            {hasApplied ? <><CheckCircle2 size={15} /> Applied</> : <><Send size={15} /> Apply Now</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Apply Modal ──────────────────────────────────────────────────────────────

function ApplyModal({
  job,
  userId,
  applicantName,
  onClose,
  onSubmitted,
}: {
  job: Job;
  userId: string;
  applicantName: string;
  onClose: () => void;
  onSubmitted: () => void;
}) {
  const supabase = createClient();
  const resumeRef = useRef<HTMLInputElement>(null);
  const [coverLetter, setCoverLetter] = useState("");
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    setSubmitting(true);
    setError("");

    let resume_url: string | null = null;
    if (resumeFile) {
      const ext = resumeFile.name.split(".").pop();
      const path = `resumes/${userId}/${job.id}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("profiles")
        .upload(path, resumeFile, { upsert: true });
      if (!upErr) {
        const { data } = supabase.storage.from("profiles").getPublicUrl(path);
        resume_url = data.publicUrl;
      }
    }

    const { error: dbErr } = await supabase.from("job_applications").insert({
      job_id: job.id,
      applicant_id: userId,
      applicant_name: applicantName,
      job_title: job.title,
      company_name: job.company_name ?? job.business_name,
      cover_letter: coverLetter || null,
      resume_url,
      status: "pending",
      applied_at: new Date().toISOString(),
    });

    if (dbErr) {
      setError(dbErr.message);
      setSubmitting(false);
      return;
    }

    // Increment application count
    await supabase
      .from("job_listings")
      .update({ application_count: (job.application_count ?? 0) + 1 })
      .eq("id", job.id);

    onSubmitted();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div
        className="bg-[#131621] border border-white/10 rounded-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-[#f1f5f9] font-bold text-lg mb-1">Apply for {job.title}</h2>
        <p className="text-xs text-[#64748b] mb-5">
          at <span className="text-[#94a3b8]">{job.company_name ?? job.business_name ?? "Company"}</span>
        </p>

        <div className="space-y-4">
          <div>
            <label className="text-xs text-[#64748b] mb-1.5 block">Cover Letter</label>
            <textarea
              placeholder={`Dear Hiring Manager,\n\nI am writing to express my interest in the ${job.title} position…`}
              value={coverLetter}
              onChange={(e) => setCoverLetter(e.target.value)}
              rows={6}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-[#f1f5f9] text-sm placeholder-[#374151] outline-none focus:border-[#FF6524]/50 resize-none"
            />
            {coverLetter.length > 0 && (
              <p className="text-[10px] text-[#374151] mt-1 text-right">{coverLetter.length} characters</p>
            )}
          </div>

          <div>
            <label className="text-xs text-[#64748b] mb-1.5 block">Resume / CV (optional)</label>
            <input
              ref={resumeRef}
              type="file"
              accept=".pdf,.doc,.docx"
              className="hidden"
              onChange={(e) => setResumeFile(e.target.files?.[0] ?? null)}
            />
            {resumeFile ? (
              <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl px-4 py-3">
                <FileText size={16} className="text-[#FF8B5E] flex-shrink-0" />
                <span className="text-sm text-[#f1f5f9] flex-1 truncate">{resumeFile.name}</span>
                <button onClick={() => setResumeFile(null)} className="text-[#64748b] hover:text-[#f87171]">
                  <X size={14} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => resumeRef.current?.click()}
                className="w-full flex items-center justify-center gap-2 bg-white/5 border border-dashed border-white/10 hover:border-[rgba(255,101,36,0.4)] rounded-xl px-4 py-4 text-sm text-[#64748b] hover:text-[#94a3b8] transition-colors"
              >
                <FileText size={16} />
                Upload PDF or Word document
              </button>
            )}
          </div>

          {/* AI tip */}
          <div className="bg-[rgba(255,101,36,0.04)] border border-[rgba(255,101,36,0.12)] rounded-xl p-3 flex gap-2">
            <Sparkles size={13} className="text-[#FF8B5E] flex-shrink-0 mt-0.5" />
            <p className="text-xs text-[#94a3b8]">
              <span className="text-[#FF8B5E] font-medium">AI Tip: </span>
              Personalise your cover letter with specific details about {job.company_name ?? "the company"} and how your skills match this role.
            </p>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-xs text-red-400 mt-3 bg-red-400/5 border border-red-400/20 rounded-lg p-3">
            <AlertCircle size={13} /> {error}
          </div>
        )}

        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 py-3 bg-white/5 hover:bg-white/8 text-[#94a3b8] text-sm rounded-xl transition-colors">
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={submitting}
            className="flex-1 py-3 bg-[#FF6524] hover:bg-[#FF7A3D] disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            {submitting ? <><Loader2 size={14} className="animate-spin" /> Submitting…</> : <><Send size={14} /> Submit Application</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Job Card ─────────────────────────────────────────────────────────────────

function JobCard({
  job,
  saved,
  hasApplied,
  onSelect,
  onSave,
}: {
  job: Job;
  saved: boolean;
  hasApplied: boolean;
  onSelect: () => void;
  onSave: (e: React.MouseEvent) => void;
}) {
  const employer = job.company_name ?? job.business_name ?? "Company";
  const daysAgo = Math.floor((Date.now() - new Date(job.posted_at).getTime()) / 86400000);

  return (
    <Card
      className="p-5 hover:border-white/20 hover:bg-[#161b2e] transition-all cursor-pointer group relative"
      onClick={onSelect}
    >
      <div className="flex items-start gap-4">
        {/* Logo */}
        <div className="w-11 h-11 rounded-xl bg-[rgba(255,101,36,0.1)] overflow-hidden flex items-center justify-center flex-shrink-0">
          {job.company_logo_url ? (
            <Image src={job.company_logo_url} alt={employer} width={44} height={44} className="w-full h-full object-cover" />
          ) : (
            <span className="text-[#FF8B5E] font-bold text-base">{employer[0]}</span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap mb-0.5">
                <h3 className="text-sm font-semibold text-[#f1f5f9]">{job.title}</h3>
                {hasApplied && (
                  <span className="text-[9px] px-1.5 py-0.5 bg-emerald-400/10 text-emerald-400 rounded-full font-bold">APPLIED</span>
                )}
              </div>
              <p className="text-xs text-[#64748b] mb-2">
                {employer}
                {job.location && ` · ${job.location}`}
              </p>
            </div>
            <button
              onClick={onSave}
              className={`flex-shrink-0 p-1.5 rounded-lg transition-colors ${saved ? "text-[#FF8B5E]" : "text-[#374151] hover:text-[#64748b]"}`}
            >
              {saved ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
            </button>
          </div>

          <div className="flex items-center gap-2 flex-wrap mb-3">
            <Badge variant={TYPE_COLOR[job.job_type] ?? "default"} className="text-[10px]">
              {TYPE_LABEL[job.job_type] ?? job.job_type}
            </Badge>
            {job.is_remote && (
              <Badge variant="green" className="text-[10px]">
                <Wifi size={9} className="mr-1" />Remote
              </Badge>
            )}
          </div>

          {job.skills && job.skills.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {job.skills.slice(0, 4).map((s) => (
                <span key={s} className="text-[10px] bg-white/4 text-[#64748b] px-2 py-0.5 rounded-full border border-white/7">{s}</span>
              ))}
              {job.skills.length > 4 && (
                <span className="text-[10px] text-[#374151]">+{job.skills.length - 4} more</span>
              )}
            </div>
          )}

          <div className="flex items-center gap-4 text-xs text-[#64748b]">
            {job.salary_min && job.salary_max && (
              <span className="text-[#10b981] font-medium">
                {formatCurrency(job.salary_min)} – {formatCurrency(job.salary_max)}/mo
              </span>
            )}
            <span className="flex items-center gap-1"><Users size={10} /> {job.application_count}</span>
            <span className="ml-auto">
              {daysAgo === 0 ? "Today" : daysAgo === 1 ? "Yesterday" : `${daysAgo}d ago`}
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
}

// ─── Post Job Form ────────────────────────────────────────────────────────────

function PostJobForm({ profile, onPosted }: { profile: ReturnType<typeof useAuth>["profile"]; onPosted: () => void }) {
  const supabase = createClient();
  const [form, setForm] = useState<PostForm>(DEFAULT_POST);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const set = (k: keyof PostForm, v: string | boolean) => setForm((f) => ({ ...f, [k]: v }));

  const post = async () => {
    if (!form.title || !form.description) { setError("Title and description are required."); return; }
    setPosting(true); setError("");
    const skillsArr = form.skills ? form.skills.split(",").map((s) => s.trim()).filter(Boolean) : [];
    const { error: err } = await supabase.from("job_listings").insert({
      title: form.title.trim(),
      company_name: form.company_name || (profile as { business_name?: string } | null)?.business_name || null,
      business_id: (profile as { business_id?: string } | null)?.business_id ?? null,
      job_type: form.job_type,
      location: form.is_remote ? "Remote" : form.location,
      salary_min: form.salary_min ? parseFloat(form.salary_min) : null,
      salary_max: form.salary_max ? parseFloat(form.salary_max) : null,
      description: form.description.trim(),
      requirements: form.requirements.trim() || null,
      skills: skillsArr.length ? skillsArr : null,
      deadline: form.deadline || null,
      is_remote: form.is_remote,
      status: "active",
      application_count: 0,
      posted_at: new Date().toISOString(),
      company_logo_url: logoUrl,
    });
    if (err) { setError(err.message); setPosting(false); return; }
    setSuccess(true);
    setTimeout(() => { onPosted(); setSuccess(false); setForm(DEFAULT_POST); }, 2000);
    setPosting(false);
  };

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="w-16 h-16 rounded-full bg-emerald-400/10 flex items-center justify-center">
          <CheckCircle2 size={32} className="text-emerald-400" />
        </div>
        <p className="text-[#f1f5f9] font-semibold text-lg">Job Posted Successfully!</p>
        <p className="text-sm text-[#64748b]">Your listing is now live on the KENUXA network.</p>
      </div>
    );
  }

  const fieldCls = "w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-[#f1f5f9] text-sm placeholder-[#374151] outline-none focus:border-[#FF6524]/50";

  return (
    <div className="max-w-2xl space-y-5">
      <div className="bg-[rgba(255,101,36,0.06)] border border-[rgba(255,101,36,0.15)] rounded-xl p-4 flex gap-3">
        <TrendingUp size={16} className="text-[#FF8B5E] flex-shrink-0 mt-0.5" />
        <p className="text-xs text-[#94a3b8]">
          Jobs posted on KENUXA reach Ghana&apos;s largest professional network. Listings go live instantly and are discoverable by job seekers across the country.
        </p>
      </div>

      {/* Company Logo Upload */}
      <div>
        <label className="text-xs text-[#64748b] mb-2 block">Company Logo</label>
        <ImageUpload
          value={logoUrl}
          onChange={setLogoUrl}
          bucket="job-logos"
          path="company-logos"
          shape="square"
          size="md"
          placeholder="Upload logo"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <label className="text-xs text-[#64748b] mb-1.5 block">Job Title *</label>
          <input value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g. Senior Accountant" className={fieldCls} />
        </div>
        <div>
          <label className="text-xs text-[#64748b] mb-1.5 block">Company Name</label>
          <input value={form.company_name} onChange={(e) => set("company_name", e.target.value)} placeholder="Your company" className={fieldCls} />
        </div>
        <div>
          <label className="text-xs text-[#64748b] mb-1.5 block">Job Type</label>
          <select value={form.job_type} onChange={(e) => set("job_type", e.target.value)} className={fieldCls}>
            {Object.entries(TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-[#64748b] mb-1.5 block">Location</label>
          <select value={form.location} onChange={(e) => set("location", e.target.value)} disabled={form.is_remote} className={fieldCls}>
            {GHANA_CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="flex items-end pb-1">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <div
              className={`w-10 h-5 rounded-full transition-colors relative ${form.is_remote ? "bg-[#FF6524]" : "bg-white/10"}`}
              onClick={() => set("is_remote", !form.is_remote)}
            >
              <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${form.is_remote ? "translate-x-5" : "translate-x-0.5"}`} />
            </div>
            <span className="text-sm text-[#94a3b8]">Remote position</span>
          </label>
        </div>
        <div>
          <label className="text-xs text-[#64748b] mb-1.5 block">Min Salary (GHS/month)</label>
          <input type="number" value={form.salary_min} onChange={(e) => set("salary_min", e.target.value)} placeholder="2,000" className={fieldCls} />
        </div>
        <div>
          <label className="text-xs text-[#64748b] mb-1.5 block">Max Salary (GHS/month)</label>
          <input type="number" value={form.salary_max} onChange={(e) => set("salary_max", e.target.value)} placeholder="5,000" className={fieldCls} />
        </div>
        <div className="md:col-span-2">
          <label className="text-xs text-[#64748b] mb-1.5 block">Job Description *</label>
          <textarea value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="Describe the role, responsibilities, and what success looks like…" rows={5} className={`${fieldCls} resize-none`} />
        </div>
        <div className="md:col-span-2">
          <label className="text-xs text-[#64748b] mb-1.5 block">Requirements</label>
          <textarea value={form.requirements} onChange={(e) => set("requirements", e.target.value)} placeholder="Minimum qualifications, experience level, certifications…" rows={3} className={`${fieldCls} resize-none`} />
        </div>
        <div className="md:col-span-2">
          <label className="text-xs text-[#64748b] mb-1.5 block">Required Skills <span className="text-[#374151]">(comma-separated)</span></label>
          <input value={form.skills} onChange={(e) => set("skills", e.target.value)} placeholder="e.g. Excel, QuickBooks, Financial Reporting" className={fieldCls} />
        </div>
        <div>
          <label className="text-xs text-[#64748b] mb-1.5 block">Application Deadline</label>
          <input type="date" value={form.deadline} onChange={(e) => set("deadline", e.target.value)} className={fieldCls} />
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-xs text-red-400 bg-red-400/5 border border-red-400/20 rounded-xl p-3">
          <AlertCircle size={13} /> {error}
        </div>
      )}

      <button
        onClick={post}
        disabled={posting}
        className="flex items-center justify-center gap-2 px-6 py-3 bg-[#FF6524] hover:bg-[#FF7A3D] disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors"
      >
        {posting ? <><Loader2 size={14} className="animate-spin" /> Posting…</> : <><Send size={14} /> Post Job</>}
      </button>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function JobsPage() {
  const { profile, role } = useAuth();
  const supabase = createClient();

  const [tab, setTab] = useState<Tab>("browse");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [total, setTotal] = useState(0);
  const [applications, setApplications] = useState<Application[]>([]);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [appliedIds, setAppliedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [location, setLocation] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [applyTarget, setApplyTarget] = useState<Job | null>(null);

  const canPost = ["business_owner", "branch_manager", "recruiter"].includes(role ?? "");
  const userId = (profile as { id?: string } | null)?.id ?? null;

  // Load saved IDs from localStorage
  useEffect(() => {
    const raw = localStorage.getItem("kenuxa_saved_jobs");
    if (raw) {
      try { setSavedIds(new Set(JSON.parse(raw) as string[])); } catch { /* ignore */ }
    }
  }, []);

  const loadJobs = useCallback(async () => {
    setLoading(true);
    try {
      let q = supabase
        .from("job_listings")
        .select("id, title, company_name, business_name, job_type, location, salary_min, salary_max, skills, description, requirements, application_count, posted_at, deadline, is_remote, status, company_logo_url", { count: "exact" })
        .eq("status", "active")
        .order("posted_at", { ascending: false })
        .limit(30);

      if (search.trim()) q = q.ilike("title", `%${search.trim()}%`);
      if (location !== "all") q = q.ilike("location", `%${location}%`);
      if (typeFilter === "remote") q = q.eq("is_remote", true);
      else if (typeFilter !== "all") q = q.eq("job_type", typeFilter);

      const { data, count } = await q;
      setJobs((data as Job[]) ?? []);
      setTotal(count ?? 0);
    } finally {
      setLoading(false);
    }
  }, [search, location, typeFilter, supabase]);

  const loadApplications = useCallback(async () => {
    if (!userId) return;
    const { data } = await supabase
      .from("job_applications")
      .select("id, job_id, job_title, company_name, status, applied_at, cover_letter")
      .eq("applicant_id", userId)
      .order("applied_at", { ascending: false });
    const apps = (data as Application[]) ?? [];
    setApplications(apps);
    setAppliedIds(new Set(apps.map((a) => a.job_id)));
  }, [userId, supabase]);

  useEffect(() => {
    const t = setTimeout(loadJobs, 200);
    return () => clearTimeout(t);
  }, [loadJobs]);

  useEffect(() => { loadApplications(); }, [loadApplications]);

  function toggleSave(jobId: string, e: React.MouseEvent) {
    e.stopPropagation();
    setSavedIds((prev) => {
      const next = new Set(prev);
      if (next.has(jobId)) next.delete(jobId); else next.add(jobId);
      localStorage.setItem("kenuxa_saved_jobs", JSON.stringify([...next]));
      return next;
    });
  }

  const savedJobs = jobs.filter((j) => savedIds.has(j.id));

  const TYPE_FILTERS: { key: string; label: string }[] = [
    { key: "all",       label: "All Types" },
    { key: "full_time", label: "Full-Time" },
    { key: "part_time", label: "Part-Time" },
    { key: "contract",  label: "Contract" },
    { key: "gig",       label: "Gig" },
    { key: "internship",label: "Internship" },
    { key: "remote",    label: "Remote" },
  ];

  const tabDefs: { key: Tab; label: string; count?: number | undefined }[] = [
    { key: "browse",       label: "Browse Jobs",    ...(total > 0 ? { count: total } : {}) },
    { key: "applications", label: "My Applications",...(applications.length ? { count: applications.length } : {}) },
    { key: "saved",        label: "Saved",          ...(savedIds.size ? { count: savedIds.size } : {}) },
    ...(canPost ? [{ key: "post" as Tab, label: "Post a Job" }] : []),
  ];

  return (
    <div className="animate-fade-in">
      <Header
        title="Jobs & Careers"
        subtitle="Ghana's opportunity network — find work, hire talent"
        actions={
          canPost ? (
            <Button size="sm" onClick={() => setTab("post")}>
              <PlusCircle size={13} /> Post a Job
            </Button>
          ) : undefined
        }
      />

      <div className="p-6 space-y-6">
        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: Briefcase,   label: "Open Positions",   value: total,               color: "text-[#FF8B5E]" },
            { icon: Send,        label: "My Applications",  value: applications.length, color: "text-blue-400" },
            { icon: BookmarkCheck,label: "Saved Jobs",      value: savedIds.size,       color: "text-amber-400" },
            { icon: CheckCircle2,label: "Interviews",       value: applications.filter((a) => a.status === "interview").length, color: "text-emerald-400" },
          ].map(({ icon: Icon, label, value, color }) => (
            <div key={label} className="bg-[#131621] border border-white/7 rounded-2xl p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center flex-shrink-0">
                <Icon size={16} className={color} />
              </div>
              <div>
                <p className="text-xl font-bold text-[#f1f5f9]">{value}</p>
                <p className="text-xs text-[#64748b]">{label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-white/3 rounded-xl w-fit overflow-x-auto">
          {tabDefs.map(({ key, label, count }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                tab === key ? "bg-[#FF6524] text-white" : "text-[#64748b] hover:text-[#f1f5f9]"
              }`}
            >
              {label}
              {count !== undefined && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${tab === key ? "bg-white/20 text-white" : "bg-white/8 text-[#64748b]"}`}>
                  {count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Browse Tab */}
        {tab === "browse" && (
          <>
            <div className="flex gap-3 flex-wrap">
              <div className="flex-1 min-w-52 flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-4 h-11">
                <Search size={14} className="text-[#374151] flex-shrink-0" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="bg-transparent border-none outline-none flex-1 text-sm placeholder-[#374151] text-[#f1f5f9]"
                  placeholder="Search jobs, skills, companies…"
                  style={{ padding: 0 }}
                />
                {search && <button onClick={() => setSearch("")}><X size={13} className="text-[#64748b]" /></button>}
              </div>
              <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-4 h-11">
                <MapPin size={13} className="text-[#374151]" />
                <select
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="bg-transparent border-none outline-none text-sm text-[#94a3b8]"
                  style={{ padding: 0 }}
                >
                  <option value="all">All Ghana</option>
                  {GHANA_CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            {/* Type filters */}
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
              {TYPE_FILTERS.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setTypeFilter(key)}
                  className={`px-4 py-2 rounded-full text-xs font-medium whitespace-nowrap border transition-colors ${
                    typeFilter === key
                      ? "bg-[rgba(255,101,36,0.15)] border-[rgba(255,101,36,0.3)] text-[#FF8B5E]"
                      : "bg-white/4 border-white/7 text-[#64748b] hover:text-[#f1f5f9]"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {!loading && (
              <p className="text-xs text-[#64748b]">
                <span className="text-[#f1f5f9] font-medium">{total}</span> open position{total !== 1 ? "s" : ""}
                {search && <> matching &ldquo;{search}&rdquo;</>}
              </p>
            )}

            <div className="space-y-3">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-28 bg-[#131621] border border-white/7 rounded-2xl animate-pulse" />
                ))
              ) : jobs.length === 0 ? (
                <div className="text-center py-16 bg-[#131621] border border-white/7 rounded-2xl">
                  <Briefcase size={36} className="mx-auto text-[#374151] mb-3" />
                  <p className="text-[#94a3b8] font-medium mb-1">No jobs found</p>
                  <p className="text-xs text-[#64748b]">Try different search terms or filters</p>
                </div>
              ) : (
                jobs.map((job) => (
                  <JobCard
                    key={job.id}
                    job={job}
                    saved={savedIds.has(job.id)}
                    hasApplied={appliedIds.has(job.id)}
                    onSelect={() => setSelectedJob(job)}
                    onSave={(e) => toggleSave(job.id, e)}
                  />
                ))
              )}
            </div>
          </>
        )}

        {/* Applications Tab */}
        {tab === "applications" && (
          <div className="space-y-4">
            {/* AI career insight */}
            {applications.length > 0 && (
              <div className="bg-[rgba(255,101,36,0.06)] border border-[rgba(255,101,36,0.15)] rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles size={15} className="text-[#FF8B5E]" />
                  <span className="text-sm font-semibold text-[#FF8B5E]">AI Career Copilot</span>
                </div>
                <p className="text-sm text-[#94a3b8] mb-3">
                  You have <strong className="text-[#f1f5f9]">{applications.length}</strong> active application{applications.length !== 1 ? "s" : ""}.
                  {applications.filter((a) => a.status === "pending").length > 0 &&
                    ` ${applications.filter((a) => a.status === "pending").length} are under review.`}
                  {applications.filter((a) => a.status === "interview").length > 0 &&
                    ` 🎉 ${applications.filter((a) => a.status === "interview").length} reached interview stage!`}
                </p>
                <p className="text-xs text-[#64748b] italic">
                  Tip: {AI_TIPS[applications.length % AI_TIPS.length]}
                </p>
              </div>
            )}

            {applications.length === 0 ? (
              <div className="text-center py-16 bg-[#131621] border border-white/7 rounded-2xl">
                <Send size={36} className="mx-auto text-[#374151] mb-3" />
                <p className="text-[#94a3b8] font-medium mb-1">No applications yet</p>
                <p className="text-xs text-[#64748b] mb-4">Start applying to jobs to track your progress here</p>
                <button
                  onClick={() => setTab("browse")}
                  className="px-4 py-2 bg-[rgba(255,101,36,0.15)] text-[#FF8B5E] text-sm rounded-xl hover:bg-[rgba(255,101,36,0.25)] transition-colors"
                >
                  Browse Jobs
                </button>
              </div>
            ) : (
              applications.map((app) => {
                const cfg = APP_STATUS_CONFIG[app.status] ?? APP_STATUS_CONFIG["pending"]!;
                return (
                  <div key={app.id} className="bg-[#131621] border border-white/7 rounded-2xl p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex gap-3 items-start min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-[rgba(255,101,36,0.1)] flex items-center justify-center flex-shrink-0">
                          <Briefcase size={16} className="text-[#FF8B5E]" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-[#f1f5f9] truncate">{app.job_title ?? "Position"}</p>
                          <p className="text-xs text-[#64748b]">
                            {app.company_name ?? "Company"} · Applied {formatDate(app.applied_at)}
                          </p>
                        </div>
                      </div>
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium flex-shrink-0 ${cfg.color}`}>
                        {cfg.label}
                      </span>
                    </div>
                    {app.cover_letter && (
                      <details className="mt-3">
                        <summary className="text-xs text-[#64748b] cursor-pointer hover:text-[#94a3b8] flex items-center gap-1">
                          <FileText size={11} /> View cover letter
                        </summary>
                        <p className="text-xs text-[#94a3b8] mt-2 leading-relaxed line-clamp-4">{app.cover_letter}</p>
                      </details>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Saved Tab */}
        {tab === "saved" && (
          <div className="space-y-3">
            {savedIds.size === 0 ? (
              <div className="text-center py-16 bg-[#131621] border border-white/7 rounded-2xl">
                <Bookmark size={36} className="mx-auto text-[#374151] mb-3" />
                <p className="text-[#94a3b8] font-medium mb-1">No saved jobs</p>
                <p className="text-xs text-[#64748b] mb-4">Bookmark jobs to revisit them later</p>
                <button onClick={() => setTab("browse")} className="px-4 py-2 bg-[rgba(255,101,36,0.15)] text-[#FF8B5E] text-sm rounded-xl hover:bg-[rgba(255,101,36,0.25)] transition-colors">
                  Browse Jobs
                </button>
              </div>
            ) : savedJobs.length === 0 ? (
              <p className="text-sm text-[#64748b] py-8 text-center">Your saved jobs aren&apos;t in the current search results. Clear filters to see them.</p>
            ) : (
              savedJobs.map((job) => (
                <JobCard
                  key={job.id}
                  job={job}
                  saved={true}
                  hasApplied={appliedIds.has(job.id)}
                  onSelect={() => setSelectedJob(job)}
                  onSave={(e) => toggleSave(job.id, e)}
                />
              ))
            )}
          </div>
        )}

        {/* Post Tab */}
        {tab === "post" && canPost && (
          <PostJobForm profile={profile} onPosted={() => { setTab("browse"); loadJobs(); }} />
        )}
      </div>

      {/* Job Detail Drawer */}
      {selectedJob && (
        <JobDetailDrawer
          job={selectedJob}
          saved={savedIds.has(selectedJob.id)}
          hasApplied={appliedIds.has(selectedJob.id)}
          onClose={() => setSelectedJob(null)}
          onSave={() => {
            const e = { stopPropagation: () => {} } as React.MouseEvent;
            toggleSave(selectedJob.id, e);
          }}
          onApply={() => {
            setApplyTarget(selectedJob);
            setSelectedJob(null);
          }}
        />
      )}

      {/* Apply Modal */}
      {applyTarget && userId && (
        <ApplyModal
          job={applyTarget}
          userId={userId}
          applicantName={profile?.full_name ?? "Applicant"}
          onClose={() => setApplyTarget(null)}
          onSubmitted={() => {
            setApplyTarget(null);
            loadApplications();
          }}
        />
      )}
    </div>
  );
}
