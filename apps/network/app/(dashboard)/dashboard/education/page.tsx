"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/hooks/use-auth";
import {
  GraduationCap, Plus, Search, Users, CreditCard,
  X, Check, Brain, AlertTriangle,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Student {
  id: string;
  business_id: string;
  student_id: string;
  full_name: string;
  class_name: string;
  gender: string | null;
  date_of_birth: string | null;
  parent_name: string | null;
  parent_phone: string | null;
  enrollment_date: string;
  status: string;
  fees_paid: number;
  fees_owing: number;
  created_at: string;
}

interface Attendance {
  id: string;
  business_id: string;
  student_id: string;
  student_name: string;
  class_name: string;
  date: string;
  status: string;
  created_at: string;
}

interface FeePayment {
  id: string;
  business_id: string;
  student_id: string;
  student_name: string;
  amount: number;
  term: string;
  payment_method: string;
  reference: string | null;
  created_at: string;
}

type Tab = "students" | "attendance" | "fees" | "analytics";

const CLASSES = ["Nursery 1", "Nursery 2", "KG 1", "KG 2", "Class 1", "Class 2", "Class 3", "Class 4", "Class 5", "Class 6", "JHS 1", "JHS 2", "JHS 3"];
const TERMS = ["Term 1 2025/26", "Term 2 2025/26", "Term 3 2025/26"];
const PAYMENT_METHODS = ["Cash", "MoMo", "Bank Transfer", "Cheque"];

const STUDENT_STATUS: Record<string, { label: string; color: string }> = {
  active:    { label: "Active",    color: "text-green-400 bg-green-400/10 border-green-400/20" },
  inactive:  { label: "Inactive",  color: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20" },
  graduated: { label: "Graduated", color: "text-blue-400 bg-blue-400/10 border-blue-400/20" },
  withdrawn: { label: "Withdrawn", color: "text-red-400 bg-red-400/10 border-red-400/20" },
};

const ATTENDANCE_STATUS: Record<string, { label: string; color: string }> = {
  present: { label: "Present", color: "text-green-400" },
  absent:  { label: "Absent",  color: "text-red-400" },
  late:    { label: "Late",    color: "text-yellow-400" },
  excused: { label: "Excused", color: "text-blue-400" },
};


// ─── StudentModal ──────────────────────────────────────────────────────────────
function StudentModal({ onClose, onSave }: { onClose: () => void; onSave: (d: Partial<Student>) => void }) {
  const todayStr = new Date().toISOString().split("T")[0]!;
  const [form, setForm] = useState<Partial<Student>>({
    student_id: `STU${Date.now().toString().slice(-4)}`,
    full_name: "", class_name: "Class 1", gender: "Male",
    parent_name: "", parent_phone: "",
    enrollment_date: todayStr, status: "active",
    fees_paid: 0, fees_owing: 0,
  });
  const set = (k: keyof Student, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#0d0f1a] border border-white/10 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-white/8">
          <h2 className="text-white font-semibold">Enroll Student</h2>
          <button onClick={onClose} className="text-white/40 hover:text-white/80"><X size={18} /></button>
        </div>
        <div className="p-5 grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="text-xs text-white/50 mb-1 block">Full Name *</label>
            <input value={form.full_name ?? ""} onChange={(e) => set("full_name", e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#FF6524]/50" />
          </div>
          <div>
            <label className="text-xs text-white/50 mb-1 block">Student ID</label>
            <input value={form.student_id ?? ""} onChange={(e) => set("student_id", e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#FF6524]/50" />
          </div>
          <div>
            <label className="text-xs text-white/50 mb-1 block">Class</label>
            <select value={form.class_name ?? "Class 1"} onChange={(e) => set("class_name", e.target.value)}
              className="w-full bg-[#0d0f1a] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#FF6524]/50">
              {CLASSES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-white/50 mb-1 block">Gender</label>
            <select value={form.gender ?? "Male"} onChange={(e) => set("gender", e.target.value)}
              className="w-full bg-[#0d0f1a] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#FF6524]/50">
              <option>Male</option><option>Female</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-white/50 mb-1 block">Date of Birth</label>
            <input type="date" value={form.date_of_birth ?? ""} onChange={(e) => set("date_of_birth", e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#FF6524]/50" />
          </div>
          <div>
            <label className="text-xs text-white/50 mb-1 block">Parent/Guardian Name</label>
            <input value={form.parent_name ?? ""} onChange={(e) => set("parent_name", e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#FF6524]/50" />
          </div>
          <div>
            <label className="text-xs text-white/50 mb-1 block">Parent Phone</label>
            <input value={form.parent_phone ?? ""} onChange={(e) => set("parent_phone", e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#FF6524]/50" />
          </div>
          <div>
            <label className="text-xs text-white/50 mb-1 block">Fees Owing (GHS)</label>
            <input type="number" min={0} value={form.fees_owing ?? 0} onChange={(e) => set("fees_owing", +e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#FF6524]/50" />
          </div>
        </div>
        <div className="flex gap-3 p-5 border-t border-white/8">
          <button onClick={onClose} className="flex-1 py-2 rounded-lg border border-white/10 text-white/60 text-sm">Cancel</button>
          <button onClick={() => onSave(form)} className="flex-1 py-2 rounded-lg bg-[#FF6524] text-white text-sm font-medium hover:bg-[#e55a1f]">Enroll Student</button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function EducationPage() {
  const supabase = createClient();
  const { profile } = useAuth();

  const [tab, setTab] = useState<Tab>("students");
  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [payments, setPayments] = useState<FeePayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showPayModal, setShowPayModal] = useState<Student | null>(null);
  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState("All");

  // Payment form state
  const [payForm, setPayForm] = useState({ amount: 0, term: TERMS[0]!, payment_method: "Cash", reference: "" });

  // Attendance state
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split("T")[0]!);
  const [attendanceClass, setAttendanceClass] = useState("Class 5");
  const [attendanceMap, setAttendanceMap] = useState<Record<string, string>>({});

  const businessId = profile?.business_id;

  const load = useCallback(async () => {
    if (!businessId) return;
    setLoading(true);

    try {
      const [stuRes, attRes, payRes] = await Promise.all([
        supabase.from("school_students").select("*").eq("business_id", businessId).order("full_name"),
        supabase.from("school_attendance").select("*").eq("business_id", businessId).order("date", { ascending: false }).limit(200),
        supabase.from("school_fee_payments").select("*").eq("business_id", businessId).order("created_at", { ascending: false }),
      ]);

      const stuData = (stuRes.data ?? []) as Student[];
      const attData = (attRes.data ?? []) as Attendance[];
      const payData = (payRes.data ?? []) as FeePayment[];

      setStudents(stuData);
      setAttendance(attData);
      setPayments(payData);

      // Init attendance map for today's class
      const todayAtt = attData.filter((a) => a.date === attendanceDate && a.class_name === attendanceClass);
      const map: Record<string, string> = {};
      todayAtt.forEach((a) => { map[a.student_id] = a.status; });
      setAttendanceMap(map);
    } finally {
      setLoading(false);
    }
  }, [businessId, attendanceDate, attendanceClass]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

  const handleEnroll = async (data: Partial<Student>) => {
    if (!businessId || !data.full_name) return;
    await supabase.from("school_students").insert({ ...data, business_id: businessId });
    setShowModal(false);
    load();
  };

  const handlePayFee = async () => {
    if (!businessId || !showPayModal) return;
    await supabase.from("school_fee_payments").insert({
      business_id: businessId,
      student_id: showPayModal.id,
      student_name: showPayModal.full_name,
      amount: payForm.amount,
      term: payForm.term,
      payment_method: payForm.payment_method,
      reference: payForm.reference || null,
    });
    // Update student fees
    await supabase.from("school_students").update({
      fees_paid: showPayModal.fees_paid + payForm.amount,
      fees_owing: Math.max(0, showPayModal.fees_owing - payForm.amount),
    }).eq("id", showPayModal.id);
    setShowPayModal(null);
    load();
  };

  const saveAttendance = async () => {
    if (!businessId) return;
    const classStudents = students.filter((s) => s.class_name === attendanceClass && s.status === "active");
    const records = classStudents.map((s) => ({
      business_id: businessId,
      student_id: s.id,
      student_name: s.full_name,
      class_name: attendanceClass,
      date: attendanceDate,
      status: attendanceMap[s.id] ?? "present",
    }));
    // Upsert not available; delete then insert
    await supabase.from("school_attendance")
      .delete()
      .eq("business_id", businessId)
      .eq("date", attendanceDate)
      .eq("class_name", attendanceClass);
    await supabase.from("school_attendance").insert(records);
    load();
  };

  // Derived
  const filteredStudents = students.filter((s) => {
    const matchSearch = !search || s.full_name.toLowerCase().includes(search.toLowerCase()) || s.student_id.includes(search);
    const matchClass = classFilter === "All" || s.class_name === classFilter;
    return matchSearch && matchClass;
  });

  const totalOwing    = students.reduce((s, st) => s + st.fees_owing, 0);
  const totalCollected = students.reduce((s, st) => s + st.fees_paid, 0);
  const debtors       = students.filter((s) => s.fees_owing > 0);
  const classStudents = students.filter((s) => s.class_name === attendanceClass && s.status === "active");

  const todayStr = new Date().toISOString().split("T")[0]!;
  const todayAttendance = attendance.filter((a) => a.date === todayStr);
  const todayPresent = todayAttendance.filter((a) => a.status === "present").length;

  const classesList = Array.from(new Set(students.map((s) => s.class_name)));

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: "students",   label: "Students",    count: students.filter((s) => s.status === "active").length },
    { key: "attendance", label: "Attendance" },
    { key: "fees",       label: "Fees",        count: debtors.length },
    { key: "analytics",  label: "Analytics & AI" },
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
            <GraduationCap className="text-[#FF6524]" size={24} />
            Education OS
          </h1>
          <p className="text-white/40 text-sm mt-0.5">Student management, attendance & school fee collection</p>
        </div>
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-[#FF6524] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#e55a1f]">
          <Plus size={16} /> Enroll Student
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Students", value: students.filter((s) => s.status === "active").length, color: "text-blue-400" },
          { label: "Present Today",  value: todayPresent,                                          color: "text-green-400" },
          { label: "Fee Defaulters", value: debtors.length,                                        color: "text-yellow-400" },
          { label: "Fees Collected", value: `GHS ${totalCollected.toLocaleString()}`,             color: "text-[#FF6524]" },
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

      {/* ── STUDENTS ──────────────────────────────────────────────────────────────── */}
      {tab === "students" && (
        <div className="space-y-4">
          <div className="flex gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[180px]">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
              <input placeholder="Search students..." value={search} onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-white text-sm focus:outline-none focus:border-[#FF6524]/50" />
            </div>
            <select value={classFilter} onChange={(e) => setClassFilter(e.target.value)}
              className="bg-[#0d0f1a] border border-white/10 rounded-lg px-3 py-2 text-white text-sm">
              <option value="All">All Classes</option>
              {classesList.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>

          <div className="bg-white/3 border border-white/8 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/8">
                  {["ID", "Student", "Class", "Parent", "Fees", "Status", ""].map((h) => (
                    <th key={h} className="text-left text-xs text-white/40 font-medium px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((s) => {
                  const cfg = STUDENT_STATUS[s.status] ?? STUDENT_STATUS["active"]!;
                  return (
                    <tr key={s.id} className="border-b border-white/5 hover:bg-white/3">
                      <td className="px-4 py-3 text-xs text-white/40">{s.student_id}</td>
                      <td className="px-4 py-3">
                        <p className="text-white font-medium">{s.full_name}</p>
                        {s.date_of_birth && <p className="text-xs text-white/30">{new Date().getFullYear() - new Date(s.date_of_birth).getFullYear()} yrs</p>}
                      </td>
                      <td className="px-4 py-3 text-white/70 text-xs">{s.class_name}</td>
                      <td className="px-4 py-3">
                        <p className="text-xs text-white/60">{s.parent_name}</p>
                        <p className="text-xs text-white/30">{s.parent_phone}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-xs text-green-400">Paid: GHS {s.fees_paid}</p>
                        {s.fees_owing > 0 && <p className="text-xs text-red-400">Owing: GHS {s.fees_owing}</p>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] border px-1.5 py-0.5 rounded-full ${cfg.color}`}>{cfg.label}</span>
                      </td>
                      <td className="px-4 py-3">
                        {s.fees_owing > 0 && (
                          <button onClick={() => { setShowPayModal(s); setPayForm({ amount: s.fees_owing, term: TERMS[0]!, payment_method: "Cash", reference: "" }); }}
                            className="text-[10px] bg-[#FF6524]/10 text-[#FF8B5E] px-2 py-1 rounded-md hover:bg-[#FF6524]/20">
                            Collect
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filteredStudents.length === 0 && (
              <div className="text-center py-10 text-white/30">
                <GraduationCap size={32} className="mx-auto mb-2 opacity-20" />
                <p>No students found</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── ATTENDANCE ────────────────────────────────────────────────────────────── */}
      {tab === "attendance" && (
        <div className="space-y-4">
          <div className="flex gap-3 flex-wrap items-end">
            <div>
              <label className="text-xs text-white/50 mb-1 block">Date</label>
              <input type="date" value={attendanceDate} onChange={(e) => setAttendanceDate(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#FF6524]/50" />
            </div>
            <div>
              <label className="text-xs text-white/50 mb-1 block">Class</label>
              <select value={attendanceClass} onChange={(e) => setAttendanceClass(e.target.value)}
                className="bg-[#0d0f1a] border border-white/10 rounded-lg px-3 py-2 text-white text-sm">
                {classesList.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <button onClick={saveAttendance} className="bg-[#FF6524] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#e55a1f]">
              Save Attendance
            </button>
          </div>

          <div className="flex gap-2 mb-2">
            {["present", "absent", "late", "excused"].map((s) => (
              <button key={s} onClick={() => {
                const map: Record<string, string> = {};
                classStudents.forEach((stu) => { map[stu.id] = s; });
                setAttendanceMap(map);
              }} className="text-[10px] px-2 py-1 rounded-md bg-white/5 text-white/50 hover:text-white capitalize">{s} All</button>
            ))}
          </div>

          <div className="space-y-2">
            {classStudents.map((s) => {
              const status = attendanceMap[s.id] ?? "present";
              return (
                <div key={s.id} className="flex items-center justify-between bg-white/3 border border-white/8 rounded-xl px-4 py-3">
                  <div>
                    <p className="text-white text-sm font-medium">{s.full_name}</p>
                    <p className="text-xs text-white/40">{s.student_id}</p>
                  </div>
                  <div className="flex gap-1.5">
                    {["present", "absent", "late", "excused"].map((st) => (
                      <button key={st} onClick={() => setAttendanceMap((m) => ({ ...m, [s.id]: st }))}
                        className={`text-[10px] px-2 py-1 rounded-md capitalize transition-all ${status === st ? (ATTENDANCE_STATUS[st]?.color ?? "text-white") + " bg-current/10 font-medium border border-current/20" : "text-white/30 bg-white/5 hover:text-white/60"}`}>
                        {st}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
            {classStudents.length === 0 && (
              <div className="text-center py-10 text-white/30 border border-white/8 rounded-xl">
                <Users size={32} className="mx-auto mb-2 opacity-20" />
                <p>No active students in {attendanceClass}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── FEES ──────────────────────────────────────────────────────────────────── */}
      {tab === "fees" && (
        <div className="space-y-6">
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white/3 border border-white/8 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-green-400">GHS {totalCollected.toLocaleString()}</p>
              <p className="text-xs text-white/40 mt-1">Total Collected</p>
            </div>
            <div className="bg-white/3 border border-white/8 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-red-400">GHS {totalOwing.toLocaleString()}</p>
              <p className="text-xs text-white/40 mt-1">Outstanding Fees</p>
            </div>
            <div className="bg-white/3 border border-white/8 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-yellow-400">{debtors.length}</p>
              <p className="text-xs text-white/40 mt-1">Fee Defaulters</p>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-white/60 mb-3 flex items-center gap-2">
              <AlertTriangle size={14} className="text-yellow-400" /> Outstanding Fees
            </h3>
            <div className="space-y-2">
              {debtors.map((s) => (
                <div key={s.id} className="flex items-center justify-between bg-red-400/5 border border-red-400/15 rounded-xl px-4 py-3">
                  <div>
                    <p className="text-white text-sm font-medium">{s.full_name}</p>
                    <p className="text-xs text-white/40">{s.class_name} · {s.parent_phone}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-red-400 font-medium">GHS {s.fees_owing}</span>
                    <button onClick={() => { setShowPayModal(s); setPayForm({ amount: s.fees_owing, term: TERMS[0]!, payment_method: "Cash", reference: "" }); }}
                      className="text-xs bg-green-400/10 text-green-400 px-3 py-1.5 rounded-lg hover:bg-green-400/20 flex items-center gap-1">
                      <CreditCard size={12} /> Collect
                    </button>
                  </div>
                </div>
              ))}
              {debtors.length === 0 && (
                <div className="text-center py-10 text-white/30 border border-white/8 rounded-xl">
                  <Check size={32} className="mx-auto mb-2 opacity-20" />
                  <p>All fees are settled!</p>
                </div>
              )}
            </div>
          </div>

          {/* Payment history */}
          {payments.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-white/60 mb-3">Recent Payments</h3>
              <div className="space-y-2">
                {payments.slice(0, 10).map((p) => (
                  <div key={p.id} className="flex items-center justify-between bg-white/3 border border-white/8 rounded-xl px-4 py-3 text-sm">
                    <div>
                      <p className="text-white">{p.student_name}</p>
                      <p className="text-xs text-white/40">{p.term} · {p.payment_method}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-green-400 font-medium">GHS {p.amount}</p>
                      <p className="text-xs text-white/30">{new Date(p.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── ANALYTICS ──────────────────────────────────────────────────────────────── */}
      {tab === "analytics" && (
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-blue-500/10 to-[#FF6524]/10 border border-blue-500/20 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Brain size={18} className="text-[#FF6524]" />
              <h3 className="text-white font-semibold text-sm">AI School Intelligence</h3>
              <span className="text-[10px] bg-[#FF6524]/20 text-[#FF8B5E] px-2 py-0.5 rounded-full ml-auto">KENUXA AI</span>
            </div>
            <div className="space-y-2 text-sm text-white/70">
              <p className="bg-white/3 rounded-lg px-3 py-2">📚 {debtors.length} student{debtors.length !== 1 ? "s" : ""} have outstanding fees totaling GHS {totalOwing.toLocaleString()}. Send fee reminders to parents via SMS.</p>
              <p className="bg-white/3 rounded-lg px-3 py-2">📊 Fee collection rate: {students.length > 0 ? Math.round((students.filter((s) => s.fees_owing === 0).length / students.length) * 100) : 0}%. Target 95%+ for operational sustainability.</p>
              <p className="bg-white/3 rounded-lg px-3 py-2">👥 Enrollment breakdown: {students.filter((s) => s.gender === "Male").length} boys, {students.filter((s) => s.gender === "Female").length} girls. GES target is 50/50 gender parity.</p>
              <p className="bg-white/3 rounded-lg px-3 py-2">🎓 Track attendance consistently — GES requires minimum 75% student attendance for BECE qualification.</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/3 border border-white/8 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-white mb-3">Students by Class</h3>
              {classesList.map((cls) => {
                const count = students.filter((s) => s.class_name === cls).length;
                const pct = students.length > 0 ? Math.round((count / students.length) * 100) : 0;
                return (
                  <div key={cls} className="flex items-center gap-3 mb-2">
                    <span className="text-xs text-white/50 w-16">{cls}</span>
                    <div className="flex-1 bg-white/5 rounded-full h-1.5">
                      <div className="h-1.5 rounded-full bg-[#FF6524]" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs text-white/40 w-4">{count}</span>
                  </div>
                );
              })}
            </div>
            <div className="bg-white/3 border border-white/8 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-white mb-3">Fee Collection Summary</h3>
              <div className="space-y-3">
                <div className="text-center py-2">
                  <div className="relative w-24 h-24 mx-auto">
                    <svg viewBox="0 0 36 36" className="rotate-[-90deg] w-24 h-24">
                      <circle cx="18" cy="18" r="15" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="3" />
                      <circle cx="18" cy="18" r="15" fill="none" stroke="#FF6524" strokeWidth="3"
                        strokeDasharray={`${(totalCollected / (totalCollected + totalOwing || 1)) * 94} 94`} />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-white font-bold text-sm">
                        {totalCollected + totalOwing > 0 ? Math.round((totalCollected / (totalCollected + totalOwing)) * 100) : 0}%
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-white/40 mt-1">Collection Rate</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Enroll Modal */}
      {showModal && <StudentModal onClose={() => setShowModal(false)} onSave={handleEnroll} />}

      {/* Payment Modal */}
      {showPayModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0d0f1a] border border-white/10 rounded-2xl w-full max-w-sm">
            <div className="flex items-center justify-between p-5 border-b border-white/8">
              <h2 className="text-white font-semibold">Collect Fee</h2>
              <button onClick={() => setShowPayModal(null)} className="text-white/40 hover:text-white/80"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-white/60 text-sm">Student: <span className="text-white font-medium">{showPayModal.full_name}</span></p>
              <div>
                <label className="text-xs text-white/50 mb-1 block">Amount (GHS)</label>
                <input type="number" min={1} value={payForm.amount} onChange={(e) => setPayForm((f) => ({ ...f, amount: +e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#FF6524]/50" />
              </div>
              <div>
                <label className="text-xs text-white/50 mb-1 block">Term</label>
                <select value={payForm.term} onChange={(e) => setPayForm((f) => ({ ...f, term: e.target.value }))}
                  className="w-full bg-[#0d0f1a] border border-white/10 rounded-lg px-3 py-2 text-white text-sm">
                  {TERMS.map((t) => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-white/50 mb-1 block">Payment Method</label>
                <select value={payForm.payment_method} onChange={(e) => setPayForm((f) => ({ ...f, payment_method: e.target.value }))}
                  className="w-full bg-[#0d0f1a] border border-white/10 rounded-lg px-3 py-2 text-white text-sm">
                  {PAYMENT_METHODS.map((m) => <option key={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-white/50 mb-1 block">Reference / Receipt #</label>
                <input value={payForm.reference} onChange={(e) => setPayForm((f) => ({ ...f, reference: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#FF6524]/50" />
              </div>
            </div>
            <div className="flex gap-3 p-5 border-t border-white/8">
              <button onClick={() => setShowPayModal(null)} className="flex-1 py-2 rounded-lg border border-white/10 text-white/60 text-sm">Cancel</button>
              <button onClick={handlePayFee} className="flex-1 py-2 rounded-lg bg-[#FF6524] text-white text-sm font-medium hover:bg-[#e55a1f]">Confirm Payment</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
