"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/hooks/use-auth";
import {
  Search, Plus, Star, MapPin, Clock, ChevronRight, Briefcase,
  Code2, Palette, Wrench, Megaphone, GraduationCap, Heart,
  Camera, Music, Truck, Stethoscope, X, CheckCircle,
} from "lucide-react";

const SKILL_CATEGORIES = [
  { id: "all", label: "All Skills", icon: Star },
  { id: "technology", label: "Technology", icon: Code2 },
  { id: "design", label: "Design & Creative", icon: Palette },
  { id: "trades", label: "Trades & Labour", icon: Wrench },
  { id: "marketing", label: "Marketing", icon: Megaphone },
  { id: "education", label: "Education", icon: GraduationCap },
  { id: "healthcare", label: "Healthcare", icon: Stethoscope },
  { id: "media", label: "Media & Arts", icon: Camera },
  { id: "transport", label: "Transport", icon: Truck },
  { id: "music", label: "Music", icon: Music },
  { id: "other", label: "Other", icon: Heart },
];

const SKILL_LEVELS = ["Beginner", "Intermediate", "Expert"];
const AVAILABILITY = ["Full-time", "Part-time", "Freelance", "Contract"];

interface SkillProfile {
  id: string;
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  title: string;
  category: string;
  skills: string[];
  level: string;
  availability: string;
  hourly_rate: number | null;
  location: string | null;
  bio: string | null;
  verified: boolean;
  rating: number;
  reviews_count: number;
  jobs_completed: number;
  created_at: string;
}


export default function SkillsMarketplacePage() {
  const { profile } = useAuth();
  const supabase = createClient();

  const [profiles, setProfiles] = useState<SkillProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedLevel, setSelectedLevel] = useState("");
  const [selectedAvailability, setSelectedAvailability] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);

  // Form state
  const [form, setForm] = useState({
    title: "", category: "technology", skills: "",
    level: "Intermediate", availability: "Freelance",
    hourly_rate: "", location: "", bio: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
    const { data } = await supabase
      .from("skill_profiles")
      .select("*")
      .order("rating", { ascending: false });

    setProfiles((data as SkillProfile[]) ?? []);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => { load(); }, [load]);

  const filtered = profiles.filter((p) => {
    const q = search.toLowerCase();
    const matchSearch = !q || p.display_name.toLowerCase().includes(q) ||
      p.title.toLowerCase().includes(q) ||
      p.skills.some((s) => s.toLowerCase().includes(q));
    const matchCat = selectedCategory === "all" || p.category === selectedCategory;
    const matchLevel = !selectedLevel || p.level === selectedLevel;
    const matchAvail = !selectedAvailability || p.availability === selectedAvailability;
    return matchSearch && matchCat && matchLevel && matchAvail;
  });

  const handleSave = async () => {
    if (!form.title || !form.bio) return;
    setSaving(true);
    const skillsArr = form.skills.split(",").map((s) => s.trim()).filter(Boolean);
    const payload = {
      user_id: profile?.id ?? "anon",
      display_name: profile?.full_name ?? "Anonymous",
      avatar_url: null,
      title: form.title,
      category: form.category,
      skills: skillsArr,
      level: form.level,
      availability: form.availability,
      hourly_rate: form.hourly_rate ? parseFloat(form.hourly_rate) : null,
      location: form.location || null,
      bio: form.bio,
      verified: false,
      rating: 0,
      reviews_count: 0,
      jobs_completed: 0,
    };
    const { data, error } = await supabase.from("skill_profiles").insert(payload).select().single();
    if (!error && data) {
      setSavedId(data.id);
      setShowAddModal(false);
      setForm({ title: "", category: "technology", skills: "", level: "Intermediate", availability: "Freelance", hourly_rate: "", location: "", bio: "" });
      load();
    }
    setSaving(false);
  };

  const initials = (name: string) => name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen bg-[#070B14] text-white">
      {/* Header */}
      <div className="border-b border-white/7 bg-[#0d0f1a]">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-2xl font-bold text-white">Skills Marketplace</h1>
              <p className="text-sm text-[#64748b] mt-1">
                Discover verified talent · List your skills · Get hired on the KENUXA network
              </p>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#FF6524] hover:bg-[#e55a1f] text-white text-sm font-semibold rounded-xl transition-colors"
            >
              <Plus size={16} />
              List My Skills
            </button>
          </div>

          {/* Search */}
          <div className="mt-5 flex gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[240px]">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748b]" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search skills, roles, or names…"
                className="w-full pl-9 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-[#64748b] focus:outline-none focus:border-[#FF6524]/50"
              />
            </div>
            <select
              value={selectedLevel}
              onChange={(e) => setSelectedLevel(e.target.value)}
              className="px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-[#94a3b8] focus:outline-none focus:border-[#FF6524]/50"
            >
              <option value="">All Levels</option>
              {SKILL_LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
            <select
              value={selectedAvailability}
              onChange={(e) => setSelectedAvailability(e.target.value)}
              className="px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-[#94a3b8] focus:outline-none focus:border-[#FF6524]/50"
            >
              <option value="">All Availability</option>
              {AVAILABILITY.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6 flex gap-6">
        {/* Category sidebar */}
        <aside className="w-48 flex-shrink-0">
          <div className="bg-[#0d0f1a] border border-white/7 rounded-2xl p-3 space-y-0.5 sticky top-6">
            {SKILL_CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const active = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all text-left ${
                    active
                      ? "bg-[rgba(255,101,36,0.12)] text-[#FF8B5E] font-medium"
                      : "text-[#64748b] hover:text-white hover:bg-white/5"
                  }`}
                >
                  <Icon size={14} />
                  <span className="truncate">{cat.label}</span>
                </button>
              );
            })}
          </div>
        </aside>

        {/* Results */}
        <main className="flex-1 min-w-0">
          {savedId && (
            <div className="flex items-center gap-2 mb-4 px-4 py-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-sm">
              <CheckCircle size={15} />
              Your skill profile is live! Businesses can now discover you.
              <button onClick={() => setSavedId(null)} className="ml-auto"><X size={14} /></button>
            </div>
          )}

          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-[#64748b]">
              {loading ? "Loading…" : `${filtered.length} skill profiles`}
            </p>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-[#0d0f1a] border border-white/7 rounded-2xl p-5 animate-pulse">
                  <div className="flex gap-3 mb-3">
                    <div className="w-12 h-12 rounded-xl bg-white/5" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 bg-white/5 rounded w-3/4" />
                      <div className="h-2.5 bg-white/5 rounded w-1/2" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="h-2 bg-white/5 rounded w-full" />
                    <div className="h-2 bg-white/5 rounded w-5/6" />
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20 text-[#64748b]">
              <Briefcase size={36} className="mx-auto mb-3 opacity-30" />
              <p className="font-medium text-white mb-1">No profiles found</p>
              <p className="text-sm">Try a different search or category</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((p) => (
                <div key={p.id} className="bg-[#0d0f1a] border border-white/7 rounded-2xl p-5 hover:border-[#FF6524]/30 transition-all group">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#FF6524]/20 to-[#FF8B5E]/10 flex items-center justify-center flex-shrink-0 text-[#FF8B5E] font-bold text-sm">
                      {initials(p.display_name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="font-semibold text-white text-sm truncate">{p.display_name}</p>
                        {p.verified && <CheckCircle size={13} className="text-[#FF6524] flex-shrink-0" />}
                      </div>
                      <p className="text-xs text-[#94a3b8] truncate">{p.title}</p>
                    </div>
                  </div>

                  <p className="text-xs text-[#64748b] line-clamp-2 mb-3">{p.bio}</p>

                  <div className="flex flex-wrap gap-1 mb-3">
                    {p.skills.slice(0, 3).map((s) => (
                      <span key={s} className="text-[10px] px-2 py-0.5 bg-white/5 border border-white/7 rounded-full text-[#94a3b8]">{s}</span>
                    ))}
                    {p.skills.length > 3 && (
                      <span className="text-[10px] px-2 py-0.5 bg-white/5 border border-white/7 rounded-full text-[#64748b]">+{p.skills.length - 3}</span>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-xs text-[#64748b]">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <Star size={11} className="text-yellow-400" fill="currentColor" />
                        {p.rating > 0 ? p.rating.toFixed(1) : "New"}
                      </span>
                      {p.location && (
                        <span className="flex items-center gap-1">
                          <MapPin size={11} />
                          {p.location}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Clock size={11} />
                        {p.availability}
                      </span>
                    </div>
                    {p.hourly_rate && (
                      <span className="text-[#FF8B5E] font-semibold">₵{p.hourly_rate}/hr</span>
                    )}
                  </div>

                  <button className="mt-3 w-full flex items-center justify-center gap-1.5 py-2 bg-white/5 hover:bg-[rgba(255,101,36,0.1)] border border-white/7 hover:border-[#FF6524]/30 rounded-lg text-xs text-[#94a3b8] hover:text-[#FF8B5E] transition-all">
                    View Profile <ChevronRight size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>

      {/* Add Skill Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#0d0f1a] border border-white/10 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/7">
              <h2 className="font-semibold text-white">List Your Skills</h2>
              <button onClick={() => setShowAddModal(false)} className="text-[#64748b] hover:text-white">
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-medium text-[#64748b] mb-1.5 block">Professional Title *</label>
                <input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. Full-Stack Developer"
                  className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-[#64748b] focus:outline-none focus:border-[#FF6524]/50"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-[#64748b] mb-1.5 block">Category</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-[#94a3b8] focus:outline-none focus:border-[#FF6524]/50"
                  >
                    {SKILL_CATEGORIES.filter((c) => c.id !== "all").map((c) => (
                      <option key={c.id} value={c.id}>{c.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-[#64748b] mb-1.5 block">Level</label>
                  <select
                    value={form.level}
                    onChange={(e) => setForm({ ...form, level: e.target.value })}
                    className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-[#94a3b8] focus:outline-none focus:border-[#FF6524]/50"
                  >
                    {SKILL_LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-[#64748b] mb-1.5 block">Availability</label>
                  <select
                    value={form.availability}
                    onChange={(e) => setForm({ ...form, availability: e.target.value })}
                    className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-[#94a3b8] focus:outline-none focus:border-[#FF6524]/50"
                  >
                    {AVAILABILITY.map((a) => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-[#64748b] mb-1.5 block">Hourly Rate (₵)</label>
                  <input
                    value={form.hourly_rate}
                    onChange={(e) => setForm({ ...form, hourly_rate: e.target.value })}
                    type="number" min="0" placeholder="e.g. 30"
                    className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-[#64748b] focus:outline-none focus:border-[#FF6524]/50"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-[#64748b] mb-1.5 block">Skills (comma-separated)</label>
                <input
                  value={form.skills}
                  onChange={(e) => setForm({ ...form, skills: e.target.value })}
                  placeholder="e.g. React, Node.js, TypeScript"
                  className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-[#64748b] focus:outline-none focus:border-[#FF6524]/50"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-[#64748b] mb-1.5 block">Location</label>
                <input
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  placeholder="e.g. Accra"
                  className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-[#64748b] focus:outline-none focus:border-[#FF6524]/50"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-[#64748b] mb-1.5 block">Bio *</label>
                <textarea
                  value={form.bio}
                  onChange={(e) => setForm({ ...form, bio: e.target.value })}
                  placeholder="Describe your experience and what you offer…"
                  rows={3}
                  className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-[#64748b] focus:outline-none focus:border-[#FF6524]/50 resize-none"
                />
              </div>
              <button
                onClick={handleSave}
                disabled={saving || !form.title || !form.bio}
                className="w-full py-2.5 bg-[#FF6524] hover:bg-[#e55a1f] disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors"
              >
                {saving ? "Publishing…" : "Publish Skill Profile"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
