"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/hooks/use-auth";
import {
  Stethoscope, Plus, Search, Calendar, Users, CreditCard,
  Brain, X, Check, Phone,
  AlertTriangle, Activity, Heart, Video,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Patient {
  id: string;
  business_id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  date_of_birth: string | null;
  gender: string | null;
  blood_group: string | null;
  allergies: string | null;
  emergency_contact: string | null;
  notes: string | null;
  created_at: string;
}

interface Appointment {
  id: string;
  business_id: string;
  patient_id: string | null;
  patient_name: string;
  patient_phone: string | null;
  doctor_name: string;
  appointment_type: string;
  date: string;
  time: string;
  duration_minutes: number;
  status: string;
  notes: string | null;
  fee: number;
  is_paid: boolean;
  created_at: string;
}

type Tab = "appointments" | "patients" | "billing" | "analytics";

const APPOINTMENT_STATUS: Record<string, { label: string; color: string }> = {
  scheduled:  { label: "Scheduled",   color: "text-blue-400 bg-blue-400/10 border-blue-400/20" },
  confirmed:  { label: "Confirmed",   color: "text-green-400 bg-green-400/10 border-green-400/20" },
  in_progress:{ label: "In Progress", color: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20" },
  completed:  { label: "Completed",   color: "text-white/40 bg-white/5 border-white/10" },
  cancelled:  { label: "Cancelled",   color: "text-red-400 bg-red-400/10 border-red-400/20" },
  no_show:    { label: "No Show",     color: "text-orange-400 bg-orange-400/10 border-orange-400/20" },
};

const APPOINTMENT_TYPES = [
  "General Consultation", "Follow-up", "Specialist Consultation",
  "Dental", "Eye Examination", "Lab Test", "Vaccination",
  "Physiotherapy", "Telemedicine", "Emergency",
];

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const DOCTORS = ["Dr. Asante", "Dr. Mensah", "Dr. Owusu", "Dr. Boateng", "Dr. Agyemang"];


// ─── AppointmentModal ─────────────────────────────────────────────────────────
function AppointmentModal({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (d: Partial<Appointment>) => void;
}) {
  const todayStr = new Date().toISOString().split("T")[0]!;
  const [form, setForm] = useState<Partial<Appointment>>({
    patient_name: "", patient_phone: "", doctor_name: DOCTORS[0]!,
    appointment_type: "General Consultation",
    date: todayStr, time: "09:00", duration_minutes: 30,
    status: "scheduled", fee: 120, is_paid: false, notes: "",
  });
  const set = (k: keyof Appointment, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#0d0f1a] border border-white/10 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-white/8">
          <h2 className="text-white font-semibold">Book Appointment</h2>
          <button onClick={onClose} className="text-white/40 hover:text-white/80"><X size={18} /></button>
        </div>
        <div className="p-5 grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="text-xs text-white/50 mb-1 block">Patient Name *</label>
            <input value={form.patient_name ?? ""} onChange={(e) => set("patient_name", e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#FF6524]/50" />
          </div>
          <div>
            <label className="text-xs text-white/50 mb-1 block">Phone</label>
            <input value={form.patient_phone ?? ""} onChange={(e) => set("patient_phone", e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#FF6524]/50" />
          </div>
          <div>
            <label className="text-xs text-white/50 mb-1 block">Doctor</label>
            <select value={form.doctor_name ?? DOCTORS[0]} onChange={(e) => set("doctor_name", e.target.value)}
              className="w-full bg-[#0d0f1a] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#FF6524]/50">
              {DOCTORS.map((d) => <option key={d}>{d}</option>)}
            </select>
          </div>
          <div className="col-span-2">
            <label className="text-xs text-white/50 mb-1 block">Appointment Type</label>
            <select value={form.appointment_type ?? "General Consultation"} onChange={(e) => set("appointment_type", e.target.value)}
              className="w-full bg-[#0d0f1a] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#FF6524]/50">
              {APPOINTMENT_TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-white/50 mb-1 block">Date</label>
            <input type="date" value={form.date ?? ""} onChange={(e) => set("date", e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#FF6524]/50" />
          </div>
          <div>
            <label className="text-xs text-white/50 mb-1 block">Time</label>
            <input type="time" value={form.time ?? "09:00"} onChange={(e) => set("time", e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#FF6524]/50" />
          </div>
          <div>
            <label className="text-xs text-white/50 mb-1 block">Duration (min)</label>
            <input type="number" min={15} step={15} value={form.duration_minutes ?? 30} onChange={(e) => set("duration_minutes", +e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#FF6524]/50" />
          </div>
          <div>
            <label className="text-xs text-white/50 mb-1 block">Consultation Fee (GHS)</label>
            <input type="number" min={0} value={form.fee ?? 120} onChange={(e) => set("fee", +e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#FF6524]/50" />
          </div>
          <div className="col-span-2">
            <label className="text-xs text-white/50 mb-1 block">Notes</label>
            <textarea value={form.notes ?? ""} onChange={(e) => set("notes", e.target.value)} rows={2}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#FF6524]/50 resize-none" />
          </div>
          <div className="col-span-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.is_paid ?? false} onChange={(e) => set("is_paid", e.target.checked)} className="w-4 h-4 accent-[#FF6524]" />
              <span className="text-sm text-white/70">Mark as Paid</span>
            </label>
          </div>
        </div>
        <div className="flex gap-3 p-5 border-t border-white/8">
          <button onClick={onClose} className="flex-1 py-2 rounded-lg border border-white/10 text-white/60 text-sm">Cancel</button>
          <button onClick={() => onSave(form)} className="flex-1 py-2 rounded-lg bg-[#FF6524] text-white text-sm font-medium hover:bg-[#e55a1f]">Book Appointment</button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function HealthcarePage() {
  const supabase = createClient();
  const { profile } = useAuth();

  const [tab, setTab] = useState<Tab>("appointments");
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [searchPatient, setSearchPatient] = useState("");
  const [dateFilter, setDateFilter] = useState<"today" | "week" | "all">("today");

  const businessId = profile?.business_id;
  const todayStr = new Date().toISOString().split("T")[0]!;

  const load = useCallback(async () => {
    if (!businessId) return;
    setLoading(true);

    const [apptRes, patRes] = await Promise.all([
      supabase.from("clinic_appointments").select("*").eq("business_id", businessId).order("date").order("time"),
      supabase.from("clinic_patients").select("*").eq("business_id", businessId).order("full_name"),
    ]);

    const appts = (apptRes.data ?? []) as Appointment[];
    const pats  = (patRes.data  ?? []) as Patient[];

    setAppointments(appts);
    setPatients(pats);
    setLoading(false);
  }, [businessId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

  const handleSave = async (data: Partial<Appointment>) => {
    if (!businessId || !data.patient_name) return;
    await supabase.from("clinic_appointments").insert({ ...data, business_id: businessId });
    setShowModal(false);
    load();
  };

  const updateStatus = async (id: string, status: string) => {
    await supabase.from("clinic_appointments").update({ status }).eq("id", id);
    load();
  };

  const markPaid = async (id: string) => {
    await supabase.from("clinic_appointments").update({ is_paid: true }).eq("id", id);
    load();
  };

  // Derived
  const filteredAppts = appointments.filter((a) => {
    if (dateFilter === "today") return a.date === todayStr;
    if (dateFilter === "week") {
      const d = new Date(a.date).getTime();
      const now = Date.now();
      return d >= now - 86400000 && d <= now + 7 * 86400000;
    }
    return true;
  });

  const todayAppts   = appointments.filter((a) => a.date === todayStr);
  const pendingPay   = appointments.filter((a) => !a.is_paid && a.status === "completed");
  const totalRevenue = appointments.filter((a) => a.is_paid).reduce((s, a) => s + a.fee, 0);
  const filteredPats = patients.filter((p) => !searchPatient || p.full_name.toLowerCase().includes(searchPatient.toLowerCase()) || (p.phone ?? "").includes(searchPatient));

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: "appointments", label: "Appointments",    count: todayAppts.length },
    { key: "patients",     label: "Patients",        count: patients.length },
    { key: "billing",      label: "Billing",         count: pendingPay.length },
    { key: "analytics",    label: "Analytics & AI" },
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
            <Stethoscope className="text-[#FF6524]" size={24} />
            Healthcare OS
          </h1>
          <p className="text-white/40 text-sm mt-0.5">Appointments, patients, billing & telemedicine</p>
        </div>
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-[#FF6524] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#e55a1f]">
          <Plus size={16} /> Book Appointment
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Today",          value: todayAppts.length,   sub: "appointments",  color: "text-blue-400" },
          { label: "Total Patients", value: patients.length,     sub: "registered",    color: "text-green-400" },
          { label: "Unpaid Bills",   value: pendingPay.length,   sub: "pending",       color: "text-yellow-400" },
          { label: "Revenue",        value: `GHS ${totalRevenue.toLocaleString()}`, sub: "collected", color: "text-[#FF6524]" },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-white/3 border border-white/8 rounded-xl p-4">
            <p className="text-xs text-white/40 mb-1">{kpi.label}</p>
            <p className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</p>
            <p className="text-xs text-white/30 mt-0.5">{kpi.sub}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white/3 border border-white/8 rounded-xl p-1 w-fit">
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

      {/* ── APPOINTMENTS ─────────────────────────────────────────────────────────── */}
      {tab === "appointments" && (
        <div className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            {(["today", "week", "all"] as const).map((f) => (
              <button key={f} onClick={() => setDateFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${dateFilter === f ? "bg-[#FF6524] text-white" : "bg-white/5 text-white/50 hover:text-white"}`}>
                {f === "today" ? "Today" : f === "week" ? "This Week" : "All"}
              </button>
            ))}
          </div>

          {filteredAppts.length === 0 ? (
            <div className="text-center py-16 text-white/30 border border-white/8 rounded-xl">
              <Calendar size={40} className="mx-auto mb-3 opacity-20" />
              <p>No appointments {dateFilter === "today" ? "today" : "this week"}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredAppts.map((a) => {
                const cfg = APPOINTMENT_STATUS[a.status] ?? APPOINTMENT_STATUS["scheduled"]!;
                const isTelemedicine = a.appointment_type === "Telemedicine";
                return (
                  <div key={a.id} className="bg-white/3 border border-white/8 rounded-xl p-4 hover:border-white/15 transition-all">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#FF6524]/10 flex items-center justify-center flex-shrink-0">
                          {isTelemedicine ? <Video size={18} className="text-[#FF6524]" /> : <Stethoscope size={18} className="text-[#FF6524]" />}
                        </div>
                        <div>
                          <p className="text-white font-medium text-sm">{a.patient_name}</p>
                          <p className="text-xs text-white/40">{a.doctor_name} · {a.appointment_type}</p>
                          <p className="text-xs text-white/30 mt-0.5">{a.date} at {a.time} · {a.duration_minutes} min</p>
                        </div>
                      </div>
                      <div className="text-right flex flex-col items-end gap-1.5">
                        <span className={`text-[10px] border px-1.5 py-0.5 rounded-full ${cfg.color}`}>{cfg.label}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${a.is_paid ? "text-green-400 bg-green-400/10" : "text-yellow-400 bg-yellow-400/10"}`}>
                          {a.is_paid ? "Paid" : `GHS ${a.fee}`}
                        </span>
                      </div>
                    </div>
                    {a.notes && <p className="text-xs text-white/30 mt-2 italic">"{a.notes}"</p>}
                    {a.patient_phone && (
                      <div className="flex items-center gap-1 mt-2 text-xs text-white/30">
                        <Phone size={11} /> {a.patient_phone}
                      </div>
                    )}
                    {/* Actions */}
                    <div className="flex gap-2 mt-3">
                      {a.status === "scheduled" && (
                        <button onClick={() => updateStatus(a.id, "in_progress")}
                          className="text-[10px] px-2 py-1 rounded-md bg-yellow-400/10 text-yellow-400 hover:bg-yellow-400/20">Start</button>
                      )}
                      {a.status === "in_progress" && (
                        <button onClick={() => updateStatus(a.id, "completed")}
                          className="text-[10px] px-2 py-1 rounded-md bg-green-400/10 text-green-400 hover:bg-green-400/20">Complete</button>
                      )}
                      {a.status === "scheduled" && (
                        <button onClick={() => updateStatus(a.id, "cancelled")}
                          className="text-[10px] px-2 py-1 rounded-md bg-red-400/10 text-red-400 hover:bg-red-400/20">Cancel</button>
                      )}
                      {!a.is_paid && a.status === "completed" && (
                        <button onClick={() => markPaid(a.id)}
                          className="text-[10px] px-2 py-1 rounded-md bg-[#FF6524]/10 text-[#FF8B5E] hover:bg-[#FF6524]/20">Mark Paid</button>
                      )}
                      {isTelemedicine && a.status !== "completed" && (
                        <button className="text-[10px] px-2 py-1 rounded-md bg-blue-400/10 text-blue-400 hover:bg-blue-400/20 flex items-center gap-1">
                          <Video size={10} /> Start Video
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── PATIENTS ──────────────────────────────────────────────────────────────── */}
      {tab === "patients" && (
        <div className="space-y-4">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
            <input placeholder="Search patients..." value={searchPatient} onChange={(e) => setSearchPatient(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-white text-sm focus:outline-none focus:border-[#FF6524]/50" />
          </div>

          <div className="space-y-3">
            {filteredPats.map((p) => {
              const age = p.date_of_birth
                ? new Date().getFullYear() - new Date(p.date_of_birth).getFullYear()
                : null;
              return (
                <div key={p.id} className="bg-white/3 border border-white/8 rounded-xl p-4 hover:border-white/15 transition-all">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#FF6524]/10 flex items-center justify-center text-[#FF6524] font-bold text-sm">
                        {p.full_name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-white font-medium text-sm">{p.full_name}</p>
                        <p className="text-xs text-white/40">
                          {p.gender} {age !== null ? `· ${age} yrs` : ""} {p.blood_group ? `· ${p.blood_group}` : ""}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-white/30">
                      {p.phone && <><Phone size={11} /> {p.phone}</>}
                    </div>
                  </div>
                  {p.allergies && (
                    <div className="mt-2 flex items-center gap-1.5 text-xs text-red-400">
                      <AlertTriangle size={11} /> Allergies: {p.allergies}
                    </div>
                  )}
                  {p.notes && <p className="text-xs text-white/30 mt-1 italic">"{p.notes}"</p>}
                </div>
              );
            })}
            {filteredPats.length === 0 && (
              <div className="text-center py-12 text-white/30 border border-white/8 rounded-xl">
                <Users size={32} className="mx-auto mb-2 opacity-20" />
                <p>No patients found</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── BILLING ───────────────────────────────────────────────────────────────── */}
      {tab === "billing" && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white/3 border border-white/8 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-green-400">GHS {totalRevenue.toLocaleString()}</p>
              <p className="text-xs text-white/40 mt-1">Total Collected</p>
            </div>
            <div className="bg-white/3 border border-white/8 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-yellow-400">GHS {pendingPay.reduce((s, a) => s + a.fee, 0)}</p>
              <p className="text-xs text-white/40 mt-1">Pending Collection</p>
            </div>
            <div className="bg-white/3 border border-white/8 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-white">{appointments.filter((a) => a.is_paid).length}</p>
              <p className="text-xs text-white/40 mt-1">Paid Consultations</p>
            </div>
          </div>

          <h3 className="text-sm font-semibold text-white/60">Pending Payments</h3>
          {pendingPay.length === 0 ? (
            <div className="text-center py-10 text-white/30 border border-white/8 rounded-xl">
              <Check size={32} className="mx-auto mb-2 opacity-20" />
              <p>All bills are settled</p>
            </div>
          ) : (
            <div className="space-y-2">
              {pendingPay.map((a) => (
                <div key={a.id} className="flex items-center justify-between bg-yellow-400/5 border border-yellow-400/20 rounded-xl px-4 py-3">
                  <div>
                    <p className="text-white text-sm font-medium">{a.patient_name}</p>
                    <p className="text-xs text-white/40">{a.appointment_type} · {a.date}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-yellow-400 font-medium">GHS {a.fee}</span>
                    <button onClick={() => markPaid(a.id)}
                      className="text-xs bg-green-400/10 text-green-400 px-3 py-1.5 rounded-lg hover:bg-green-400/20 flex items-center gap-1">
                      <CreditCard size={12} /> Collect
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Revenue by type */}
          <div className="bg-white/3 border border-white/8 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-white mb-4">Revenue by Appointment Type</h3>
            <div className="space-y-3">
              {APPOINTMENT_TYPES.filter((t) => appointments.some((a) => a.appointment_type === t && a.is_paid)).map((type) => {
                const rev = appointments.filter((a) => a.appointment_type === type && a.is_paid).reduce((s, a) => s + a.fee, 0);
                const pct = totalRevenue > 0 ? Math.round((rev / totalRevenue) * 100) : 0;
                return (
                  <div key={type} className="flex items-center gap-3">
                    <span className="text-xs text-white/50 w-40 truncate">{type}</span>
                    <div className="flex-1 bg-white/5 rounded-full h-1.5">
                      <div className="h-1.5 rounded-full bg-[#FF6524]" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs text-white/40 w-20 text-right">GHS {rev}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── ANALYTICS ──────────────────────────────────────────────────────────────── */}
      {tab === "analytics" && (
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-red-500/10 to-[#FF6524]/10 border border-red-500/20 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Brain size={18} className="text-[#FF6524]" />
              <h3 className="text-white font-semibold text-sm">AI Clinical Intelligence</h3>
              <span className="text-[10px] bg-[#FF6524]/20 text-[#FF8B5E] px-2 py-0.5 rounded-full ml-auto">KENUXA AI</span>
            </div>
            <div className="space-y-2 text-sm text-white/70">
              <p className="bg-white/3 rounded-lg px-3 py-2">📅 {todayAppts.length} appointment{todayAppts.length !== 1 ? "s" : ""} scheduled today. Peak hours: 09:00–11:00. Consider adding a second consultation slot.</p>
              <p className="bg-white/3 rounded-lg px-3 py-2">💰 GHS {pendingPay.reduce((s, a) => s + a.fee, 0)} in unpaid consultations. Implement advance payment or deposit policy to reduce collection risk.</p>
              <p className="bg-white/3 rounded-lg px-3 py-2">🩺 {patients.filter((p) => p.allergies).length} patients have documented allergies. Ensure prescription workflows cross-check against this data.</p>
              <p className="bg-white/3 rounded-lg px-3 py-2">📹 Telemedicine appointments generate same revenue with 40% lower overhead. Consider expanding virtual consultations.</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/3 border border-white/8 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2"><Activity size={14} className="text-red-400" /> Patient Demographics</h3>
              {(["Male", "Female"] as const).map((g) => {
                const count = patients.filter((p) => p.gender === g).length;
                const pct = patients.length > 0 ? Math.round((count / patients.length) * 100) : 0;
                return (
                  <div key={g} className="flex items-center gap-3 mb-2">
                    <span className="text-xs text-white/50 w-12">{g}</span>
                    <div className="flex-1 bg-white/5 rounded-full h-1.5">
                      <div className="h-1.5 rounded-full bg-[#FF6524]" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs text-white/40">{count}</span>
                  </div>
                );
              })}
            </div>
            <div className="bg-white/3 border border-white/8 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2"><Heart size={14} className="text-red-400" /> Blood Group Registry</h3>
              <div className="grid grid-cols-4 gap-1.5">
                {BLOOD_GROUPS.map((bg) => {
                  const count = patients.filter((p) => p.blood_group === bg).length;
                  return (
                    <div key={bg} className={`text-center p-1.5 rounded-lg ${count > 0 ? "bg-red-400/10 border border-red-400/20" : "bg-white/3"}`}>
                      <p className={`text-xs font-bold ${count > 0 ? "text-red-400" : "text-white/20"}`}>{bg}</p>
                      <p className="text-xs text-white/40">{count}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {showModal && <AppointmentModal onClose={() => setShowModal(false)} onSave={handleSave} />}
    </div>
  );
}
