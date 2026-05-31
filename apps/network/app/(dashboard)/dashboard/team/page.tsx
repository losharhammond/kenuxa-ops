"use client";

import { useEffect, useState, useCallback } from "react";
import { Header } from "@/components/layout/header";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/hooks/use-auth";
import {
  Users, UserPlus, MoreVertical, CheckCircle, Clock,
  X, Loader2, Mail, CreditCard, BarChart3, MessageSquare,
  Shield, Copy,
} from "lucide-react";

interface TeamMember {
  id: string;
  user_id: string;
  role: string;
  branch_id: string | null;
  status: string;
  invited_at: string;
  accepted_at: string | null;
  user_profiles?: { full_name: string | null; email: string | null } | null;
}

const ASSIGNABLE_ROLES = [
  { value: "branch_manager", label: "Branch Manager", icon: BarChart3,    color: "#8b5cf6", desc: "Manages a single branch — inventory, sales, staff, analytics." },
  { value: "cashier",        label: "Cashier",         icon: CreditCard,  color: "#10b981", desc: "POS access, sales processing, receipts, discounts." },
  { value: "employee",       label: "Employee",        icon: Users,       color: "#64748b", desc: "Module-based permissions — inventory, CRM, marketing, etc." },
  { value: "recruiter",      label: "Recruiter",       icon: MessageSquare,color: "#ec4899", desc: "Post jobs, manage applicants, schedule interviews." },
];

const ROLE_COLORS: Record<string, string> = {
  branch_manager: "#8b5cf6",
  cashier:        "#10b981",
  employee:       "#64748b",
  recruiter:      "#ec4899",
};

export default function TeamPage() {
  const supabase = createClient();
  const { user, profile } = useAuth();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("cashier");
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState("");
  const [inviteSuccess, setInviteSuccess] = useState("");
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    // Get owner's business
    const { data: prof } = await supabase
      .from("user_profiles")
      .select("business_id")
      .eq("id", user.id)
      .single();

    const bizId = (prof as { business_id?: string } | null)?.business_id ?? null;
    setBusinessId(bizId);

    if (!bizId) { setLoading(false); return; }

    const { data } = await supabase
      .from("business_members")
      .select("id, user_id, role, branch_id, status, invited_at, accepted_at, user_profiles(full_name, email)")
      .eq("business_id", bizId)
      .order("invited_at", { ascending: false });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setMembers(((data ?? []) as unknown as TeamMember[]));
    setLoading(false);
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessId || !inviteEmail) return;
    setInviting(true);
    setInviteError("");
    setInviteSuccess("");

    // Find user by email
    const { data: targetProfile } = await supabase
      .from("user_profiles")
      .select("id, full_name")
      .eq("email", inviteEmail)
      .single();

    if (!targetProfile) {
      setInviteError("No KENUXA account found with that email. They must register first.");
      setInviting(false);
      return;
    }

    const { error } = await supabase.from("business_members").upsert({
      business_id: businessId,
      user_id: targetProfile.id,
      role: inviteRole,
      invited_by: user!.id,
      status: "invited",
    }, { onConflict: "business_id,user_id,role", ignoreDuplicates: true });

    if (error) {
      setInviteError(error.message);
    } else {
      // Also add the role to user_roles so they can switch to it
      await supabase.from("user_roles").upsert({
        user_id: targetProfile.id,
        role: inviteRole,
        activated_by: "business",
        metadata: { business_id: businessId, invited_by: user!.id },
      }, { onConflict: "user_id,role", ignoreDuplicates: true });

      setInviteSuccess(`${targetProfile.full_name ?? inviteEmail} has been added as ${inviteRole.replace("_", " ")}.`);
      setInviteEmail("");
      await load();
    }
    setInviting(false);
  };

  const handleRemove = async (memberId: string) => {
    await supabase.from("business_members").update({ status: "removed" }).eq("id", memberId);
    setActiveMenu(null);
    await load();
  };

  const inputCls = "w-full bg-[#0d0f1a] border border-white/10 rounded-xl px-3.5 h-11 text-sm text-[#f1f5f9] outline-none focus:border-[#FF6524] transition-colors placeholder-[#374151]";

  return (
    <>
      <Header
        title="Team Management"
        subtitle="Assign roles to staff members"
        actions={
          businessId ? (
            <button onClick={() => setShowInvite(true)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gradient-to-r from-[#FF6524] to-[#F59E0B] text-white text-xs font-semibold hover:opacity-90 transition-opacity">
              <UserPlus size={13} /> Add Member
            </button>
          ) : undefined
        }
      />
      <div className="p-6 space-y-6">
        {!businessId && !loading ? (
          <div className="flex flex-col items-center py-16 text-center">
            <Shield size={40} className="text-[#374151] mb-3" />
            <p className="text-sm font-medium text-[#64748b] mb-1">Business Required</p>
            <p className="text-xs text-[#374151]">Team management is only available for Business Owners.</p>
          </div>
        ) : (
          <>
            {/* Role descriptions */}
            <div>
              <p className="text-xs font-semibold text-[#374151] uppercase tracking-widest mb-3">Assignable Roles</p>
              <div className="grid grid-cols-2 gap-3">
                {ASSIGNABLE_ROLES.map(({ value, label, icon: Icon, color, desc }) => (
                  <div key={value} className="flex items-start gap-3 p-3 rounded-xl bg-[#111624] border border-white/7">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${color}18` }}>
                      <Icon size={14} style={{ color }} />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-[#f1f5f9]">{label}</p>
                      <p className="text-[10px] text-[#374151] leading-relaxed mt-0.5">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Team list */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold text-[#374151] uppercase tracking-widest">
                  Members ({members.filter((m) => m.status !== "removed").length})
                </p>
              </div>

              {loading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-16 bg-[#111624] rounded-xl animate-pulse" />)}
                </div>
              ) : members.filter((m) => m.status !== "removed").length === 0 ? (
                <div className="text-center py-10 border-2 border-dashed border-white/7 rounded-2xl">
                  <Users size={32} className="text-[#374151] mx-auto mb-2" />
                  <p className="text-sm text-[#64748b]">No team members yet</p>
                  <button onClick={() => setShowInvite(true)} className="mt-3 text-xs text-[#FF8B5E] hover:text-[#FF6524] transition-colors">
                    + Add your first team member
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {members.filter((m) => m.status !== "removed").map((m) => {
                    const roleColor = ROLE_COLORS[m.role] ?? "#64748b";
                    const name = m.user_profiles?.full_name ?? m.user_profiles?.email ?? "Unknown";
                    const email = m.user_profiles?.email ?? "";
                    return (
                      <div key={m.id} className="flex items-center gap-3 p-4 rounded-xl bg-[#111624] border border-white/7 relative">
                        {/* Avatar */}
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                          style={{ background: `${roleColor}25` }}>
                          <span style={{ color: roleColor }}>{name[0]?.toUpperCase()}</span>
                        </div>
                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-[#f1f5f9] truncate">{name}</p>
                          <p className="text-xs text-[#374151] truncate">{email}</p>
                        </div>
                        {/* Role badge */}
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize flex-shrink-0"
                          style={{ background: `${roleColor}18`, color: roleColor }}>
                          {m.role.replace("_", " ")}
                        </span>
                        {/* Status */}
                        <span className={`flex items-center gap-1 text-[10px] flex-shrink-0 ${m.status === "active" ? "text-[#10b981]" : "text-[#64748b]"}`}>
                          {m.status === "active" ? <CheckCircle size={10} /> : <Clock size={10} />}
                          {m.status}
                        </span>
                        {/* Menu */}
                        <div className="relative">
                          <button onClick={() => setActiveMenu(activeMenu === m.id ? null : m.id)}
                            className="p-1.5 rounded-lg hover:bg-white/5 text-[#374151] hover:text-[#64748b] transition-all">
                            <MoreVertical size={14} />
                          </button>
                          {activeMenu === m.id && (
                            <div className="absolute right-0 top-8 w-36 bg-[#111624] border border-white/10 rounded-xl shadow-xl z-20 overflow-hidden">
                              <button onClick={() => { navigator.clipboard.writeText(email); setActiveMenu(null); }}
                                className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-[#64748b] hover:bg-white/5 hover:text-[#f1f5f9] transition-colors">
                                <Copy size={12} /> Copy email
                              </button>
                              <button onClick={() => handleRemove(m.id)}
                                className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-[#f87171] hover:bg-[rgba(239,68,68,0.08)] transition-colors">
                                <X size={12} /> Remove
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Invite Modal */}
      {showInvite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#111624] border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-base font-bold text-[#f1f5f9]">Add Team Member</h3>
                <p className="text-xs text-[#64748b] mt-0.5">They must have a KENUXA account</p>
              </div>
              <button onClick={() => { setShowInvite(false); setInviteError(""); setInviteSuccess(""); }}
                className="p-1.5 rounded-lg hover:bg-white/5 text-[#374151] hover:text-[#64748b] transition-all">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleInvite} className="space-y-4">
              <div>
                <label className="text-xs text-[#64748b] mb-1.5 block">Email Address *</label>
                <div className="relative">
                  <Mail size={14} className="absolute left-3.5 top-3.5 text-[#374151]" />
                  <input type="email" className={`${inputCls} pl-9`} placeholder="staff@example.com" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} required />
                </div>
              </div>
              <div>
                <label className="text-xs text-[#64748b] mb-2 block">Role to Assign *</label>
                <div className="grid grid-cols-2 gap-2">
                  {ASSIGNABLE_ROLES.map(({ value, label, color }) => (
                    <button key={value} type="button" onClick={() => setInviteRole(value)}
                      className={`px-3 py-2.5 rounded-xl border text-xs font-medium text-left transition-all ${
                        inviteRole === value ? "text-[#f1f5f9]" : "border-white/7 text-[#64748b] hover:border-white/20"
                      }`}
                      style={inviteRole === value ? { borderColor: color, background: `${color}15`, color } : {}}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {inviteError && <p className="text-xs text-[#f87171] bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.2)] rounded-lg px-3 py-2">{inviteError}</p>}
              {inviteSuccess && <p className="text-xs text-[#10b981] bg-[rgba(16,185,129,0.1)] border border-[rgba(16,185,129,0.2)] rounded-lg px-3 py-2">{inviteSuccess}</p>}

              <button type="submit" disabled={inviting || !inviteEmail}
                className="w-full h-11 bg-gradient-to-r from-[#FF6524] to-[#F59E0B] rounded-xl text-white font-semibold text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50">
                {inviting ? <><Loader2 size={14} className="animate-spin" /> Adding...</> : <><UserPlus size={14} /> Add Member</>}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
