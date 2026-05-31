"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Search, UserPlus, Shield, Ban, CheckCircle2, XCircle, Mail, Phone } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { ROLE_LABELS, ROLE_COLORS, type Role } from "@/lib/rbac";

interface AdminUser {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  role: Role;
  avatar_url: string | null;
  is_verified: boolean;
  created_at: string;
}

const ROLE_TABS = ["all", "business_owner", "cashier", "customer", "supplier", "delivery_rider"] as const;

export default function AdminUsersPage() {
  const [tab, setTab] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<Role>("business_owner");
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      setLoading(true);
      let q = supabase
        .from("user_profiles")
        .select("id, full_name, email, phone, role, avatar_url, is_verified, created_at")
        .order("created_at", { ascending: false })
        .limit(100);

      if (tab !== "all") q = q.eq("role", tab);
      if (search) q = q.ilike("full_name", `%${search}%`);

      const { data } = await q;
      setUsers((data as AdminUser[]) ?? []);
      setLoading(false);
    }
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, search]);

  async function suspendUser(id: string) {
    await supabase.from("user_profiles").update({ is_active: false }).eq("id", id);
    setUsers((prev) => prev.filter((u) => u.id !== id));
  }

  async function sendInvite() {
    await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
    });
    setInviteOpen(false);
    setInviteEmail("");
  }

  return (
    <div className="animate-fade-in">
      <div className="h-16 border-b border-white/7 flex items-center justify-between px-8">
        <div>
          <h1 className="text-base font-bold text-[#f1f5f9]">User Management</h1>
          <p className="text-xs text-[#64748b]">Manage all platform users and their permissions</p>
        </div>
        <Button size="sm" onClick={() => setInviteOpen(true)}>
          <UserPlus size={13} />
          Invite User
        </Button>
      </div>

      <div className="p-8 space-y-6">
        {/* Invite modal */}
        {inviteOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-[#0d0f1a] border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl">
              <h3 className="text-base font-bold text-[#f1f5f9] mb-4">Invite New User</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-[#64748b] mb-1.5">Email Address</label>
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="user@example.com"
                    className="w-full bg-[#111624] border border-white/10 rounded-lg px-3 h-9 text-sm text-[#f1f5f9] placeholder:text-[#374151] outline-none focus:border-[rgba(245,158,11,0.4)] transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#64748b] mb-1.5">Role</label>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as Role)}
                    className="w-full bg-[#111624] border border-white/10 rounded-lg px-3 h-9 text-sm text-[#f1f5f9] outline-none focus:border-[rgba(245,158,11,0.4)] transition-colors"
                  >
                    {(Object.keys(ROLE_LABELS) as Role[]).map((r) => (
                      <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-3 pt-2">
                  <Button variant="secondary" className="flex-1" onClick={() => setInviteOpen(false)}>Cancel</Button>
                  <Button className="flex-1" onClick={sendInvite} disabled={!inviteEmail}>Send Invite</Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 bg-[#111624] border border-white/10 rounded-lg px-3 h-9 flex-1 max-w-xs">
            <Search size={14} className="text-[#64748b] flex-shrink-0" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search users..."
              className="bg-transparent border-none outline-none flex-1 text-sm text-[#f1f5f9] placeholder:text-[#374151]"
            />
          </div>
          <div className="flex items-center gap-1 bg-[#111624] border border-white/10 rounded-lg p-1 overflow-x-auto">
            {ROLE_TABS.map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
                  tab === t
                    ? "bg-[rgba(245,158,11,0.15)] text-[#F59E0B]"
                    : "text-[#64748b] hover:text-[#f1f5f9]"
                }`}
              >
                {t === "all" ? "All Users" : ROLE_LABELS[t as Role] ?? t}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/7 bg-white/2">
                  <th className="px-5 py-3 text-left text-xs font-semibold text-[#64748b] uppercase tracking-wider">User</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-[#64748b] uppercase tracking-wider">Contact</th>
                  <th className="px-5 py-3 text-center text-xs font-semibold text-[#64748b] uppercase tracking-wider">Role</th>
                  <th className="px-5 py-3 text-center text-xs font-semibold text-[#64748b] uppercase tracking-wider">Verified</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-[#64748b] uppercase tracking-wider">Joined</th>
                  <th className="px-5 py-3 text-center text-xs font-semibold text-[#64748b] uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {loading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 6 }).map((_, j) => (
                        <td key={j} className="px-5 py-3.5">
                          <div className="h-4 bg-white/5 rounded animate-pulse" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-16 text-center text-sm text-[#64748b]">No users found</td>
                  </tr>
                ) : (
                  users.map((u) => (
                    <tr key={u.id} className="hover:bg-white/2 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-[rgba(255,101,36,0.1)] flex items-center justify-center text-xs font-bold text-[#FF8B5E] flex-shrink-0">
                            {(u.full_name ?? u.email ?? "?")[0]?.toUpperCase() ?? "?"}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-[#f1f5f9]">{u.full_name ?? "Unnamed"}</p>
                            <p className="text-xs text-[#64748b]">{u.id.slice(0, 8)}...</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="space-y-0.5">
                          {u.email && (
                            <div className="flex items-center gap-1.5 text-xs text-[#64748b]">
                              <Mail size={11} />{u.email}
                            </div>
                          )}
                          {u.phone && (
                            <div className="flex items-center gap-1.5 text-xs text-[#64748b]">
                              <Phone size={11} />{u.phone}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <span
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold"
                          style={{
                            background: `${ROLE_COLORS[u.role]}18`,
                            color: ROLE_COLORS[u.role],
                          }}
                        >
                          <Shield size={10} />
                          {ROLE_LABELS[u.role] ?? u.role}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        {u.is_verified
                          ? <CheckCircle2 size={16} className="mx-auto text-[#34d399]" />
                          : <XCircle size={16} className="mx-auto text-[#374151]" />}
                      </td>
                      <td className="px-5 py-3.5 text-xs text-[#64748b]">
                        {new Date(u.created_at).toLocaleDateString("en-GH", { year: "numeric", month: "short", day: "numeric" })}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-center gap-1">
                          <Button size="sm" variant="secondary" className="h-7 px-2 text-xs">Edit</Button>
                          <Button size="sm" variant="danger" className="h-7 px-2 text-xs" onClick={() => suspendUser(u.id)}>
                            <Ban size={11} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}


