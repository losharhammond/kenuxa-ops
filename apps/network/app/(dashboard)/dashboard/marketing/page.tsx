"use client";

import type { ReactNode } from "react";
import { useEffect, useState, useCallback } from "react";
import { Header } from "@/components/layout/header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/ui/stat-card";
import { formatDate } from "@/lib/utils";
import { Megaphone, MessageSquare, Smartphone, Mail, Facebook, Instagram, Eye, MousePointerClick, Calendar, Send, Copy, Upload, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/hooks/use-auth";
import { useRoleGuard } from "@/lib/hooks/use-role-guard";

interface Campaign {
  id: string;
  name: string;
  type: string;
  status: string;
  sent: number;
  opened: number;
  clicked: number;
  scheduled_at: string | null;
  created_at: string;
}

const TYPE_ICON: Record<string, ReactNode> = {
  whatsapp:  <MessageSquare size={13} />,
  sms:       <Smartphone size={13} />,
  email:     <Mail size={13} />,
  facebook:  <Facebook size={13} />,
  instagram: <Instagram size={13} />,
};

const statusColor: Record<string, "green" | "blue" | "amber" | "default"> = {
  active:    "green",
  completed: "blue",
  scheduled: "amber",
  draft:     "default",
};

const AI_TEMPLATES = [
  { label: "Facebook Post",   prompt: "Create a Facebook post promoting our latest products" },
  { label: "WhatsApp Blast",  prompt: "Write a WhatsApp campaign for our weekly deals" },
  { label: "SMS Campaign",    prompt: "Create a short SMS campaign for a Friday sale" },
  { label: "Instagram Caption",prompt:"Write an Instagram caption for a new product launch" },
];

export default function MarketingPage() {
  useRoleGuard("marketing.view");
  const supabase = createClient();
  const { profile } = useAuth();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [statsLoading, setStatsLoading] = useState(true);
  const [totalReach, setTotalReach] = useState(0);
  const [totalSent, setTotalSent] = useState(0);
  const [generating, setGenerating] = useState<string | null>(null);
  const [generatedContent, setGeneratedContent] = useState("");

  const load = useCallback(async () => {
    if (!profile?.business_id) return;
    setStatsLoading(true);
    const { data } = await supabase
      .from("marketing_campaigns")
      .select("id, name, type, status, sent, opened, clicked, scheduled_at, created_at")
      .eq("business_id", profile.business_id)
      .order("created_at", { ascending: false })
      .limit(20);
    const rows = (data as Campaign[]) ?? [];
    setCampaigns(rows);
    setTotalReach(rows.reduce((s, c) => s + (c.opened ?? 0), 0));
    setTotalSent(rows.reduce((s, c) => s + (c.sent ?? 0), 0));
    setStatsLoading(false);
  }, [profile?.business_id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

  const generateCampaign = async (prompt: string, label: string) => {
    setGenerating(label);
    setGeneratedContent("");
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [{ role: "user", content: prompt + " for a Ghanaian business. Make it engaging and culturally relevant." }] }),
      });
      const data = await res.json();
      setGeneratedContent(data.reply || "Generated content appears here.");
    } catch {
      setGeneratedContent("Failed to generate. Check your API key in .env.local.");
    } finally {
      setGenerating(null);
    }
  };

  return (
    <div className="animate-fade-in">
      <Header title="Marketing" subtitle="Campaigns, content & analytics" actions={<Button size="sm">+ New Campaign</Button>} />

      <div className="p-6 space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Total Reach"   value={statsLoading ? 0 : totalReach} format="number" color="orange" icon={<Megaphone size={16} />} />
          <StatCard title="Messages Sent" value={statsLoading ? 0 : totalSent}  format="number" color="blue"   icon={<Send size={16} />} />
          <StatCard title="Active Campaigns" value={statsLoading ? 0 : campaigns.filter(c => c.status === "active").length} format="number" color="green" icon={<Eye size={16} />} />
          <StatCard title="Total Campaigns"  value={statsLoading ? 0 : campaigns.length} format="number" color="amber" icon={<MousePointerClick size={16} />} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* AI Content Generator */}
          <Card>
            <div className="p-5 border-b border-white/7">
              <h3 className="text-sm font-semibold text-[#f1f5f9]">AI Campaign Generator</h3>
              <p className="text-xs text-[#64748b] mt-1">Generate marketing content in seconds</p>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-2">
                {AI_TEMPLATES.map((t) => (
                  <button
                    key={t.label}
                    onClick={() => generateCampaign(t.prompt, t.label)}
                    disabled={generating !== null}
                    className="p-3 bg-[#07080f] border border-white/7 hover:border-[rgba(255,101,36,0.4)] rounded-lg text-left transition-colors disabled:opacity-50"
                  >
                    <p className="text-sm font-medium text-[#f1f5f9]">{t.label}</p>
                  </button>
                ))}
              </div>
              {(generating || generatedContent) && (
                <div className="bg-[#07080f] border border-white/7 rounded-lg p-4 min-h-[120px]">
                  {generating ? (
                    <div className="flex items-center gap-2 text-[#64748b] text-sm">
                      <Loader2 size={14} className="animate-spin" />
                      Generating {generating}...
                    </div>
                  ) : (
                    <>
                      <p className="text-sm text-[#cbd5e1] whitespace-pre-wrap leading-relaxed">{generatedContent}</p>
                      <div className="flex gap-2 mt-3">
                        <Button size="sm" variant="secondary"><Copy size={13} /> Copy</Button>
                        <Button size="sm"><Upload size={13} /> Use in Campaign</Button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </Card>

          {/* Campaigns list */}
          <Card>
            <div className="p-5 border-b border-white/7 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[#f1f5f9]">Campaigns</h3>
              <select className="bg-[#0d0f1a] border border-white/7 rounded text-xs px-2 py-1">
                <option>All Channels</option>
                <option>WhatsApp</option>
                <option>SMS</option>
                <option>Email</option>
              </select>
            </div>
            <div className="divide-y divide-white/5">
              {statsLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="p-4 h-16 animate-pulse bg-white/2" />
                ))
              ) : campaigns.length === 0 ? (
                <div className="p-8 text-center text-sm text-[#64748b]">No campaigns yet. Create your first campaign.</div>
              ) : campaigns.map((c) => (
                <div key={c.id} className="p-4 hover:bg-white/2 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[#64748b]">{TYPE_ICON[c.type]}</span>
                      <p className="text-sm font-medium text-[#f1f5f9]">{c.name}</p>
                    </div>
                    <Badge variant={statusColor[c.status] ?? "default"} className="capitalize">{c.status}</Badge>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-[#64748b]">
                    <span className="flex items-center gap-1"><Calendar size={11} /> {formatDate(c.scheduled_at ?? c.created_at)}</span>
                    {c.sent > 0 && <span className="flex items-center gap-1"><Send size={11} /> {c.sent.toLocaleString()}</span>}
                    {c.opened > 0 && <span className="flex items-center gap-1"><Eye size={11} /> {c.opened.toLocaleString()}</span>}
                    {c.clicked > 0 && <span className="flex items-center gap-1"><MousePointerClick size={11} /> {c.clicked}</span>}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
