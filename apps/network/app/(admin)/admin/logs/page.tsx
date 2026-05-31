"use client";

import { useEffect, useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Search, Download, Activity, Shield, UserCog, Database } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type LogCategory = "all" | "auth" | "security" | "admin" | "system";

interface AuditLog {
  id: string;
  category: string;
  action: string;
  actor: string | null;
  target: string | null;
  ip_address: string | null;
  created_at: string;
  severity: string;
  metadata: Record<string, unknown> | null;
}

const CATEGORY_CONFIG: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  auth:     { icon: Activity, color: "text-[#3B82F6]",  bg: "bg-[rgba(59,130,246,0.1)]"  },
  security: { icon: Shield,   color: "text-[#f87171]",  bg: "bg-[rgba(239,68,68,0.1)]"   },
  admin:    { icon: UserCog,  color: "text-[#F59E0B]",  bg: "bg-[rgba(245,158,11,0.1)]"  },
  system:   { icon: Database, color: "text-[#64748b]",  bg: "bg-white/5"                 },
};

const SEVERITY_COLOR: Record<string, string> = {
  info:    "text-[#64748b]",
  warning: "text-[#F59E0B]",
  error:   "text-[#f87171]",
};

export default function AdminLogsPage() {
  const supabase = createClient();
  const [category, setCategory] = useState<LogCategory>("all");
  const [search, setSearch] = useState("");
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    let q = supabase
      .from("audit_logs")
      .select("id, category, action, actor, target, ip_address, created_at, severity, metadata")
      .order("created_at", { ascending: false })
      .limit(100);

    if (category !== "all") q = q.eq("category", category);
    if (search) q = q.or(`action.ilike.%${search}%,actor.ilike.%${search}%`);

    const { data } = await q;
    setLogs((data as AuditLog[]) ?? []);
    setLoading(false);
  }, [category, search]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

  return (
    <div className="animate-fade-in">
      <div className="h-16 border-b border-white/7 flex items-center justify-between px-8">
        <div>
          <h1 className="text-base font-bold text-[#f1f5f9]">Audit Logs</h1>
          <p className="text-xs text-[#64748b]">Security events, admin actions, system activity</p>
        </div>
        <Button size="sm" variant="secondary">
          <Download size={13} />
          Export Logs
        </Button>
      </div>

      <div className="p-8 space-y-6">
        {/* Filters */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-[#111624] border border-white/10 rounded-lg px-3 h-9 flex-1 max-w-xs">
            <Search size={14} className="text-[#64748b]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search actions, actors..."
              className="bg-transparent outline-none flex-1 text-sm text-[#f1f5f9] placeholder:text-[#374151]"
            />
          </div>
          <div className="flex items-center gap-1 bg-[#111624] border border-white/10 rounded-lg p-1">
            {(["all", "auth", "security", "admin", "system"] as LogCategory[]).map((t) => (
              <button
                key={t}
                onClick={() => setCategory(t)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-colors ${
                  category === t ? "bg-[rgba(245,158,11,0.15)] text-[#F59E0B]" : "text-[#64748b] hover:text-[#f1f5f9]"
                }`}
              >
                {t === "all" ? "All Events" : t}
              </button>
            ))}
          </div>
        </div>

        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/7 bg-white/2">
                  <th className="px-5 py-3 text-left text-xs font-semibold text-[#64748b] uppercase tracking-wider">Event</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-[#64748b] uppercase tracking-wider">Actor</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-[#64748b] uppercase tracking-wider">Target</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-[#64748b] uppercase tracking-wider">IP</th>
                  <th className="px-5 py-3 text-center text-xs font-semibold text-[#64748b] uppercase tracking-wider">Severity</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-[#64748b] uppercase tracking-wider">Time</th>
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
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-16 text-center">
                      <Activity size={32} className="mx-auto text-[#374151] mb-3" />
                      <p className="text-sm text-[#64748b]">No audit logs found</p>
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => {
                    const cfg = CATEGORY_CONFIG[log.category] ?? CATEGORY_CONFIG.system!;
                    const CategoryIcon = cfg.icon;
                    return (
                      <tr key={log.id} className="hover:bg-white/2 transition-colors">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className={`w-7 h-7 rounded-lg ${cfg.bg} flex items-center justify-center flex-shrink-0`}>
                              <CategoryIcon size={13} className={cfg.color} />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-[#f1f5f9]">{log.action}</p>
                              <p className="text-xs text-[#64748b] capitalize">{log.category}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-xs text-[#64748b]">{log.actor ?? "system"}</td>
                        <td className="px-5 py-3.5 text-xs text-[#64748b]">{log.target ?? "—"}</td>
                        <td className="px-5 py-3.5 text-xs text-[#64748b] font-mono">{log.ip_address ?? "—"}</td>
                        <td className="px-5 py-3.5 text-center">
                          <span className={`text-xs font-semibold capitalize ${SEVERITY_COLOR[log.severity] ?? "text-[#64748b]"}`}>
                            {log.severity}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-xs text-[#64748b]">
                          {new Date(log.created_at).toLocaleString("en-GH", { dateStyle: "short", timeStyle: "short" })}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
