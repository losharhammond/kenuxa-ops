"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/hooks/use-auth";
import {
  Briefcase, Plus, Search, Clock, Users,
  X, Brain,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Client {
  id: string;
  business_id: string;
  name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  industry: string | null;
  status: string;
  total_billed: number;
  notes: string | null;
  created_at: string;
}

interface Project {
  id: string;
  business_id: string;
  client_id: string | null;
  client_name: string;
  title: string;
  description: string | null;
  type: string;
  status: string;
  start_date: string;
  due_date: string | null;
  budget: number;
  billed: number;
  hours_logged: number;
  hourly_rate: number;
  created_at: string;
}

interface TimeEntry {
  id: string;
  business_id: string;
  project_id: string;
  project_title: string;
  client_name: string;
  description: string;
  hours: number;
  date: string;
  created_at: string;
}

type Tab = "projects" | "clients" | "time" | "analytics";

const PROJECT_STATUS: Record<string, { label: string; color: string }> = {
  proposal:    { label: "Proposal",     color: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20" },
  active:      { label: "Active",       color: "text-blue-400 bg-blue-400/10 border-blue-400/20" },
  on_hold:     { label: "On Hold",      color: "text-orange-400 bg-orange-400/10 border-orange-400/20" },
  review:      { label: "In Review",    color: "text-purple-400 bg-purple-400/10 border-purple-400/20" },
  completed:   { label: "Completed",    color: "text-green-400 bg-green-400/10 border-green-400/20" },
  cancelled:   { label: "Cancelled",    color: "text-red-400 bg-red-400/10 border-red-400/20" },
};

const PROJECT_TYPES = [
  "Legal Advisory", "Tax Consulting", "Audit & Assurance", "Business Consulting",
  "Brand & Marketing", "IT Consulting", "Financial Planning", "HR Consulting",
  "Design Project", "Web Development", "Training & Workshop", "Other",
];

const CLIENT_STATUS: Record<string, { label: string; color: string }> = {
  active:   { label: "Active",   color: "text-green-400" },
  prospect: { label: "Prospect", color: "text-yellow-400" },
  inactive: { label: "Inactive", color: "text-white/40" },
};


// ─── ProjectModal ──────────────────────────────────────────────────────────────
function ProjectModal({
  clients,
  onClose,
  onSave,
}: {
  clients: Client[];
  onClose: () => void;
  onSave: (d: Partial<Project>) => void;
}) {
  const todayStr = new Date().toISOString().split("T")[0]!;
  const [form, setForm] = useState<Partial<Project>>({
    client_name: clients[0]?.name ?? "",
    title: "", type: "Business Consulting", status: "proposal",
    start_date: todayStr, due_date: "",
    budget: 0, billed: 0, hours_logged: 0, hourly_rate: 150, description: "",
  });
  const set = (k: keyof Project, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#0d0f1a] border border-white/10 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-white/8">
          <h2 className="text-white font-semibold">New Project / Engagement</h2>
          <button onClick={onClose} className="text-white/40 hover:text-white/80"><X size={18} /></button>
        </div>
        <div className="p-5 grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="text-xs text-white/50 mb-1 block">Project Title *</label>
            <input value={form.title ?? ""} onChange={(e) => set("title", e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#FF6524]/50" />
          </div>
          <div>
            <label className="text-xs text-white/50 mb-1 block">Client</label>
            <select value={form.client_name} onChange={(e) => set("client_name", e.target.value)}
              className="w-full bg-[#0d0f1a] border border-white/10 rounded-lg px-3 py-2 text-white text-sm">
              {clients.map((c) => <option key={c.id} value={c.company ?? c.name}>{c.company ?? c.name}</option>)}
              <option value="New Client">New Client</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-white/50 mb-1 block">Type</label>
            <select value={form.type ?? "Business Consulting"} onChange={(e) => set("type", e.target.value)}
              className="w-full bg-[#0d0f1a] border border-white/10 rounded-lg px-3 py-2 text-white text-sm">
              {PROJECT_TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-white/50 mb-1 block">Start Date</label>
            <input type="date" value={form.start_date ?? ""} onChange={(e) => set("start_date", e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#FF6524]/50" />
          </div>
          <div>
            <label className="text-xs text-white/50 mb-1 block">Due Date</label>
            <input type="date" value={form.due_date ?? ""} onChange={(e) => set("due_date", e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#FF6524]/50" />
          </div>
          <div>
            <label className="text-xs text-white/50 mb-1 block">Budget (GHS)</label>
            <input type="number" min={0} value={form.budget ?? 0} onChange={(e) => set("budget", +e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#FF6524]/50" />
          </div>
          <div>
            <label className="text-xs text-white/50 mb-1 block">Hourly Rate (GHS)</label>
            <input type="number" min={0} value={form.hourly_rate ?? 150} onChange={(e) => set("hourly_rate", +e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#FF6524]/50" />
          </div>
          <div className="col-span-2">
            <label className="text-xs text-white/50 mb-1 block">Description</label>
            <textarea value={form.description ?? ""} onChange={(e) => set("description", e.target.value)} rows={2}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#FF6524]/50 resize-none" />
          </div>
        </div>
        <div className="flex gap-3 p-5 border-t border-white/8">
          <button onClick={onClose} className="flex-1 py-2 rounded-lg border border-white/10 text-white/60 text-sm">Cancel</button>
          <button onClick={() => onSave(form)} className="flex-1 py-2 rounded-lg bg-[#FF6524] text-white text-sm font-medium hover:bg-[#e55a1f]">Create Project</button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function ProfessionalPage() {
  const supabase = createClient();
  const { profile } = useAuth();

  const [tab, setTab] = useState<Tab>("projects");
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showProjModal, setShowProjModal] = useState(false);
  const [search, setSearch] = useState("");

  // Time tracker state
  const [timeForm, setTimeForm] = useState({ project_id: "", description: "", hours: 1, date: new Date().toISOString().split("T")[0]! });
  const [logginTime, setLoggingTime] = useState(false);

  const businessId = profile?.business_id;

  const load = useCallback(async () => {
    if (!businessId) return;
    setLoading(true);

    const [projRes, cliRes, timeRes] = await Promise.all([
      supabase.from("professional_projects").select("*").eq("business_id", businessId).order("created_at", { ascending: false }),
      supabase.from("professional_clients").select("*").eq("business_id", businessId).order("name"),
      supabase.from("professional_time_entries").select("*").eq("business_id", businessId).order("date", { ascending: false }).limit(50),
    ]);

    const projData = (projRes.data ?? []) as Project[];
    const cliData  = (cliRes.data  ?? []) as Client[];
    const timeData = (timeRes.data ?? []) as TimeEntry[];

    setProjects(projData);
    setClients(cliData);
    setTimeEntries(timeData);
    if (projData.length > 0 && !timeForm.project_id) {
      setTimeForm((f) => ({ ...f, project_id: projData[0]!.id }));
    }
    setLoading(false);
  }, [businessId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

  const handleSaveProject = async (data: Partial<Project>) => {
    if (!businessId || !data.title) return;
    await supabase.from("professional_projects").insert({ ...data, business_id: businessId });
    setShowProjModal(false);
    load();
  };

  const updateProjectStatus = async (id: string, status: string) => {
    await supabase.from("professional_projects").update({ status }).eq("id", id);
    load();
  };

  const handleLogTime = async () => {
    if (!businessId || !timeForm.project_id) return;
    setLoggingTime(true);
    const proj = projects.find((p) => p.id === timeForm.project_id);
    await supabase.from("professional_time_entries").insert({
      business_id: businessId,
      project_id: timeForm.project_id,
      project_title: proj?.title ?? "",
      client_name: proj?.client_name ?? "",
      description: timeForm.description,
      hours: timeForm.hours,
      date: timeForm.date,
    });
    // Update project hours
    if (proj) {
      await supabase.from("professional_projects")
        .update({ hours_logged: proj.hours_logged + timeForm.hours })
        .eq("id", proj.id);
    }
    setTimeForm((f) => ({ ...f, description: "", hours: 1 }));
    setLoggingTime(false);
    load();
  };

  // Derived
  const activeProjects   = projects.filter((p) => p.status === "active");
  const totalRevenue     = projects.reduce((s, p) => s + p.billed, 0);
  const unbilled         = projects.filter((p) => p.status === "completed" && p.billed < p.budget);
  const totalHours       = projects.reduce((s, p) => s + p.hours_logged, 0);
  const overdue          = projects.filter((p) => p.due_date && new Date(p.due_date) < new Date() && !["completed", "cancelled"].includes(p.status));

  const filteredProjects = projects.filter((p) => {
    const q = search.toLowerCase();
    return !q || p.title.toLowerCase().includes(q) || p.client_name.toLowerCase().includes(q);
  });

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: "projects", label: "Projects",       count: activeProjects.length },
    { key: "clients",  label: "Clients",        count: clients.length },
    { key: "time",     label: "Time Tracker" },
    { key: "analytics",label: "Analytics & AI" },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-[#FF6524] border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Briefcase className="text-[#FF6524]" size={24} />
            Professional Services OS
          </h1>
          <p className="text-white/40 text-sm mt-0.5">Client management, projects, time tracking & billing</p>
        </div>
        <button onClick={() => setShowProjModal(true)}
          className="flex items-center gap-2 bg-[#FF6524] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#e55a1f]">
          <Plus size={16} /> New Project
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Active Projects", value: activeProjects.length, color: "text-blue-400" },
          { label: "Overdue",         value: overdue.length,        color: "text-red-400" },
          { label: "Hours Logged",    value: `${totalHours}h`,      color: "text-yellow-400" },
          { label: "Total Billed",    value: `GHS ${totalRevenue.toLocaleString()}`, color: "text-[#FF6524]" },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-white/3 border border-white/8 rounded-xl p-4">
            <p className="text-xs text-white/40 mb-1">{kpi.label}</p>
            <p className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white/3 border border-white/8 rounded-xl p-1 w-fit flex-wrap">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${
              tab === t.key ? "bg-[#FF6524] text-white" : "text-white/50 hover:text-white"
            }`}>
            {t.label}
            {t.count !== undefined && t.count > 0 && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${tab === t.key ? "bg-white/20" : "bg-white/10 text-white/60"}`}>{t.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── PROJECTS ──────────────────────────────────────────────────────────────── */}
      {tab === "projects" && (
        <div className="space-y-4">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
            <input placeholder="Search projects..." value={search} onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-white text-sm focus:outline-none focus:border-[#FF6524]/50" />
          </div>

          <div className="space-y-3">
            {filteredProjects.map((p) => {
              const cfg = PROJECT_STATUS[p.status] ?? PROJECT_STATUS["proposal"]!;
              const progress = p.budget > 0 ? Math.round((p.billed / p.budget) * 100) : 0;
              const isOverdue = p.due_date && new Date(p.due_date) < new Date() && !["completed", "cancelled"].includes(p.status);
              const daysLeft = p.due_date ? Math.ceil((new Date(p.due_date).getTime() - Date.now()) / 86400000) : null;

              return (
                <div key={p.id} className={`bg-white/3 border rounded-xl p-4 hover:border-white/15 transition-all ${isOverdue ? "border-red-400/20" : "border-white/8"}`}>
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-white font-medium">{p.title}</p>
                        <span className={`text-[10px] border px-1.5 py-0.5 rounded-full ${cfg.color}`}>{cfg.label}</span>
                        {isOverdue && <span className="text-[10px] text-red-400 bg-red-400/10 border border-red-400/20 px-1.5 py-0.5 rounded-full">Overdue</span>}
                      </div>
                      <p className="text-xs text-white/40 mt-0.5">{p.client_name} · {p.type}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {p.status === "proposal" && (
                        <button onClick={() => updateProjectStatus(p.id, "active")}
                          className="text-[10px] bg-blue-400/10 text-blue-400 px-2 py-1 rounded-md hover:bg-blue-400/20">Accept</button>
                      )}
                      {p.status === "active" && (
                        <button onClick={() => updateProjectStatus(p.id, "review")}
                          className="text-[10px] bg-purple-400/10 text-purple-400 px-2 py-1 rounded-md hover:bg-purple-400/20">Submit</button>
                      )}
                      {p.status === "review" && (
                        <button onClick={() => updateProjectStatus(p.id, "completed")}
                          className="text-[10px] bg-green-400/10 text-green-400 px-2 py-1 rounded-md hover:bg-green-400/20">Complete</button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 mt-3 text-center text-sm">
                    <div>
                      <p className="text-xs text-white/40">Budget</p>
                      <p className="text-white font-medium">GHS {p.budget.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-xs text-white/40">Billed</p>
                      <p className="text-[#FF6524] font-medium">GHS {p.billed.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-xs text-white/40">Hours</p>
                      <p className="text-white font-medium">{p.hours_logged}h</p>
                    </div>
                  </div>

                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-white/40 mb-1">
                      <span>Billing Progress</span>
                      <span>{progress}%</span>
                    </div>
                    <div className="w-full bg-white/5 rounded-full h-1.5">
                      <div className="h-1.5 rounded-full bg-[#FF6524] transition-all" style={{ width: `${Math.min(100, progress)}%` }} />
                    </div>
                  </div>

                  {daysLeft !== null && (
                    <p className={`text-xs mt-2 ${daysLeft < 0 ? "text-red-400" : daysLeft <= 7 ? "text-yellow-400" : "text-white/30"}`}>
                      {daysLeft < 0 ? `${Math.abs(daysLeft)} days overdue` : daysLeft === 0 ? "Due today" : `${daysLeft} days remaining`}
                    </p>
                  )}
                  {p.description && <p className="text-xs text-white/30 mt-1 italic">"{p.description}"</p>}
                </div>
              );
            })}
            {filteredProjects.length === 0 && (
              <div className="text-center py-16 text-white/30 border border-white/8 rounded-xl">
                <Briefcase size={40} className="mx-auto mb-3 opacity-20" />
                <p>No projects yet</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── CLIENTS ───────────────────────────────────────────────────────────────── */}
      {tab === "clients" && (
        <div className="space-y-3">
          {clients.map((c) => {
            const cfg = CLIENT_STATUS[c.status] ?? CLIENT_STATUS["active"]!;
            const clientProjects = projects.filter((p) => p.client_name === (c.company ?? c.name));
            return (
              <div key={c.id} className="bg-white/3 border border-white/8 rounded-xl p-4 hover:border-white/15 transition-all">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#FF6524]/10 flex items-center justify-center text-[#FF6524] font-bold">
                      {c.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-white font-medium text-sm">{c.name}</p>
                      {c.company && <p className="text-xs text-white/40">{c.company}</p>}
                      <p className="text-xs text-white/30">{c.industry} {c.phone ? `· ${c.phone}` : ""}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-xs ${cfg.color}`}>{cfg.label}</p>
                    <p className="text-sm text-white font-medium mt-1">GHS {c.total_billed.toLocaleString()}</p>
                    <p className="text-xs text-white/30">billed total</p>
                  </div>
                </div>
                {clientProjects.length > 0 && (
                  <div className="mt-2 flex gap-1.5 flex-wrap">
                    {clientProjects.slice(0, 3).map((p) => (
                      <span key={p.id} className="text-[10px] bg-white/5 text-white/40 px-2 py-0.5 rounded-full">{p.title}</span>
                    ))}
                    {clientProjects.length > 3 && <span className="text-[10px] text-white/30">+{clientProjects.length - 3} more</span>}
                  </div>
                )}
                {c.notes && <p className="text-xs text-white/30 mt-1 italic">"{c.notes}"</p>}
              </div>
            );
          })}
          {clients.length === 0 && (
            <div className="text-center py-16 text-white/30 border border-white/8 rounded-xl">
              <Users size={40} className="mx-auto mb-3 opacity-20" />
              <p>No clients yet</p>
            </div>
          )}
        </div>
      )}

      {/* ── TIME TRACKER ──────────────────────────────────────────────────────────── */}
      {tab === "time" && (
        <div className="space-y-6">
          {/* Log time form */}
          <div className="bg-white/3 border border-white/8 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <Clock size={15} className="text-[#FF6524]" /> Log Time
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="text-xs text-white/50 mb-1 block">Project</label>
                <select value={timeForm.project_id} onChange={(e) => setTimeForm((f) => ({ ...f, project_id: e.target.value }))}
                  className="w-full bg-[#0d0f1a] border border-white/10 rounded-lg px-3 py-2 text-white text-sm">
                  {projects.filter((p) => p.status === "active").map((p) => (
                    <option key={p.id} value={p.id}>{p.title} — {p.client_name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-white/50 mb-1 block">Hours</label>
                <input type="number" min={0.5} step={0.5} value={timeForm.hours} onChange={(e) => setTimeForm((f) => ({ ...f, hours: +e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#FF6524]/50" />
              </div>
              <div>
                <label className="text-xs text-white/50 mb-1 block">Date</label>
                <input type="date" value={timeForm.date} onChange={(e) => setTimeForm((f) => ({ ...f, date: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#FF6524]/50" />
              </div>
              <div className="col-span-2">
                <label className="text-xs text-white/50 mb-1 block">Description</label>
                <input value={timeForm.description} onChange={(e) => setTimeForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="What did you work on?"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#FF6524]/50" />
              </div>
            </div>
            <button onClick={handleLogTime} disabled={logginTime || !timeForm.project_id}
              className="mt-4 w-full py-2.5 rounded-lg bg-[#FF6524] text-white text-sm font-medium hover:bg-[#e55a1f] disabled:opacity-50">
              {logginTime ? "Logging..." : "Log Time Entry"}
            </button>
          </div>

          {/* Time log */}
          <div>
            <h3 className="text-sm font-semibold text-white/60 mb-3">Recent Time Entries</h3>
            {timeEntries.length === 0 ? (
              <div className="text-center py-10 text-white/30 border border-white/8 rounded-xl">
                <Clock size={32} className="mx-auto mb-2 opacity-20" />
                <p>No time entries yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {timeEntries.map((t) => (
                  <div key={t.id} className="flex items-center justify-between bg-white/3 border border-white/8 rounded-xl px-4 py-3 text-sm">
                    <div>
                      <p className="text-white">{t.project_title}</p>
                      <p className="text-xs text-white/40">{t.description || "—"} · {t.date}</p>
                    </div>
                    <span className="text-[#FF6524] font-medium">{t.hours}h</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── ANALYTICS ──────────────────────────────────────────────────────────────── */}
      {tab === "analytics" && (
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-blue-500/10 to-[#FF6524]/10 border border-blue-500/20 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Brain size={18} className="text-[#FF6524]" />
              <h3 className="text-white font-semibold text-sm">AI Practice Intelligence</h3>
              <span className="text-[10px] bg-[#FF6524]/20 text-[#FF8B5E] px-2 py-0.5 rounded-full ml-auto">KENUXA AI</span>
            </div>
            <div className="space-y-2 text-sm text-white/70">
              {overdue.length > 0 && (
                <p className="bg-white/3 rounded-lg px-3 py-2">⚠️ {overdue.length} project{overdue.length > 1 ? "s" : ""} overdue: {overdue.map((p) => p.title).join(", ")}. Address immediately to protect client relationships.</p>
              )}
              <p className="bg-white/3 rounded-lg px-3 py-2">💰 {unbilled.length} completed project{unbilled.length !== 1 ? "s" : ""} with unbilled balance. Invoice now to improve cash flow.</p>
              <p className="bg-white/3 rounded-lg px-3 py-2">⏱️ Average billing rate: GHS {totalHours > 0 ? Math.round(totalRevenue / totalHours) : 0}/hour across {totalHours} logged hours. Industry benchmark for Ghana: GHS 120–200/hr.</p>
              <p className="bg-white/3 rounded-lg px-3 py-2">📈 Top client by revenue: {clients.sort((a, b) => b.total_billed - a.total_billed)[0]?.name ?? "N/A"}. Consider upselling retainer agreements for predictable income.</p>
            </div>
          </div>

          <div className="bg-white/3 border border-white/8 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-white mb-4">Project Pipeline</h3>
            <div className="flex gap-2 overflow-x-auto">
              {Object.entries(PROJECT_STATUS).map(([k, v]) => {
                const count = projects.filter((p) => p.status === k).length;
                const value = projects.filter((p) => p.status === k).reduce((s, p) => s + p.budget, 0);
                return (
                  <div key={k} className="flex-shrink-0 bg-white/3 border border-white/8 rounded-xl p-3 text-center min-w-[100px]">
                    <p className={`text-xs font-medium ${v.color.split(" ")[0]}`}>{v.label}</p>
                    <p className="text-xl font-bold text-white mt-1">{count}</p>
                    {value > 0 && <p className="text-[10px] text-white/30 mt-0.5">GHS {value.toLocaleString()}</p>}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-white/3 border border-white/8 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-white mb-4">Revenue by Project Type</h3>
            {PROJECT_TYPES.filter((t) => projects.some((p) => p.type === t && p.billed > 0)).map((type) => {
              const rev = projects.filter((p) => p.type === type).reduce((s, p) => s + p.billed, 0);
              const pct = totalRevenue > 0 ? Math.round((rev / totalRevenue) * 100) : 0;
              return (
                <div key={type} className="flex items-center gap-3 mb-2">
                  <span className="text-xs text-white/50 w-36 truncate">{type}</span>
                  <div className="flex-1 bg-white/5 rounded-full h-1.5">
                    <div className="h-1.5 rounded-full bg-[#FF6524]" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-xs text-white/40 w-20 text-right">GHS {rev.toLocaleString()}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {showProjModal && (
        <ProjectModal clients={clients} onClose={() => setShowProjModal(false)} onSave={handleSaveProject} />
      )}
    </div>
  );
}
