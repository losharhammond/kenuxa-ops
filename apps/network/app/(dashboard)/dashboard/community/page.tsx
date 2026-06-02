"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import { Header } from "@/components/layout/header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/hooks/use-auth";
import {
  MessageSquare, Heart, Share2, Bookmark, MoreHorizontal,
  Image as ImageIcon, Send, TrendingUp,
  Briefcase, Megaphone, Trophy, Zap, Building2, Globe,
  Loader2,
} from "lucide-react";
import { ImageUpload } from "@/components/ui/image-upload";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Post {
  id: string;
  author_id: string;
  author_name: string;
  author_avatar: string | null;
  author_role: string | null;
  author_business: string | null;
  content: string;
  post_type: string;
  likes_count: number;
  comments_count: number;
  shares_count: number;
  image_url: string | null;
  created_at: string;
  liked_by_me: boolean;
}

interface Comment {
  id: string;
  author_name: string;
  content: string;
  created_at: string;
}

type FeedFilter = "all" | "businesses" | "jobs" | "achievements" | "promotions";

const POST_TYPE_STYLES: Record<string, { color: string; bg: string; label: string; icon: React.ElementType }> = {
  update:      { color: "#64748b", bg: "rgba(100,116,139,0.08)", label: "Update",      icon: MessageSquare },
  job:         { color: "#10b981", bg: "rgba(16,185,129,0.08)",  label: "Job Post",    icon: Briefcase     },
  promotion:   { color: "#F59E0B", bg: "rgba(245,158,11,0.08)",  label: "Promotion",   icon: Megaphone     },
  achievement: { color: "#a78bfa", bg: "rgba(139,92,246,0.08)",  label: "Achievement", icon: Trophy        },
  insight:     { color: "#FF8B5E", bg: "rgba(255,101,36,0.08)",  label: "Insight",     icon: Zap           },
};

// ─── Post Card ────────────────────────────────────────────────────────────────

function PostCard({ post, onLike, currentUserName }: { post: Post; onLike: (id: string) => void; currentUserName: string }) {
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [loadingComments, setLoadingComments] = useState(false);
  const supabase = createClient();
  const typeStyle = POST_TYPE_STYLES[post.post_type] ?? POST_TYPE_STYLES["update"]!;
  const TypeIcon = typeStyle.icon;

  const loadComments = async () => {
    if (showComments) { setShowComments(false); return; }
    setShowComments(true);
    setLoadingComments(true);
    const { data } = await supabase
      .from("post_comments")
      .select("id, author_name, content, created_at")
      .eq("post_id", post.id)
      .order("created_at")
      .limit(10);
    setComments((data as Comment[]) ?? []);
    setLoadingComments(false);
  };

  const submitComment = async () => {
    if (!commentText.trim()) return;
    await supabase.from("post_comments").insert({ post_id: post.id, content: commentText, author_name: currentUserName });
    setComments((prev) => [...prev, { id: Date.now().toString(), author_name: currentUserName, content: commentText, created_at: new Date().toISOString() }]);
    setCommentText("");
  };

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-5">
        {/* Author */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[rgba(255,101,36,0.2)] to-[rgba(139,92,246,0.15)] flex items-center justify-center text-sm font-bold text-[#FF8B5E] flex-shrink-0">
              {post.author_avatar ? (
                <Image src={post.author_avatar} alt="" width={40} height={40} className="w-full h-full rounded-xl object-cover" />
              ) : (
                post.author_name[0]
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-[#f1f5f9]">{post.author_name}</p>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide" style={{ background: typeStyle.bg, color: typeStyle.color }}>
                  <TypeIcon size={8} className="inline mr-0.5" />
                  {typeStyle.label}
                </span>
              </div>
              <p className="text-xs text-[#64748b]">
                {post.author_business && <><Building2 size={9} className="inline mr-1" />{post.author_business} · </>}
                {formatDate(post.created_at)}
              </p>
            </div>
          </div>
          <button className="text-[#374151] hover:text-[#64748b] transition-colors">
            <MoreHorizontal size={16} />
          </button>
        </div>

        {/* Content */}
        <p className="text-sm text-[#cbd5e1] leading-relaxed whitespace-pre-wrap">{post.content}</p>

        {post.image_url && (
          <div className="mt-3 rounded-xl overflow-hidden border border-white/7">
            <Image src={post.image_url} alt="" width={800} height={256} className="w-full max-h-64 object-cover" />
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-4 mt-4 pt-3 border-t border-white/7">
          <button
            onClick={() => onLike(post.id)}
            className={`flex items-center gap-1.5 text-xs transition-colors ${post.liked_by_me ? "text-[#f87171]" : "text-[#64748b] hover:text-[#f87171]"}`}
          >
            <Heart size={14} className={post.liked_by_me ? "fill-[#f87171]" : ""} />
            {post.likes_count > 0 && post.likes_count}
          </button>
          <button
            onClick={loadComments}
            className="flex items-center gap-1.5 text-xs text-[#64748b] hover:text-[#f1f5f9] transition-colors"
          >
            <MessageSquare size={14} />
            {post.comments_count > 0 && post.comments_count}
          </button>
          <button className="flex items-center gap-1.5 text-xs text-[#64748b] hover:text-[#f1f5f9] transition-colors">
            <Share2 size={14} />
            {post.shares_count > 0 && post.shares_count}
          </button>
          <button className="ml-auto text-[#64748b] hover:text-[#f1f5f9] transition-colors">
            <Bookmark size={14} />
          </button>
        </div>

        {/* Comments */}
        {showComments && (
          <div className="mt-3 pt-3 border-t border-white/7 space-y-3">
            {loadingComments ? (
              <div className="flex justify-center py-2"><Loader2 size={14} className="animate-spin text-[#64748b]" /></div>
            ) : comments.length === 0 ? (
              <p className="text-xs text-[#374151] text-center py-2">No comments yet. Be the first.</p>
            ) : (
              comments.map((c) => (
                <div key={c.id} className="flex gap-2">
                  <div className="w-6 h-6 rounded-lg bg-white/5 flex items-center justify-center text-[10px] font-bold text-[#64748b] flex-shrink-0">
                    {c.author_name[0]}
                  </div>
                  <div className="flex-1 bg-[#07080f] rounded-lg px-3 py-2">
                    <p className="text-xs font-medium text-[#94a3b8]">{c.author_name}</p>
                    <p className="text-xs text-[#64748b]">{c.content}</p>
                  </div>
                </div>
              ))
            )}
            <div className="flex gap-2">
              <input
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") submitComment(); }}
                placeholder="Write a comment..."
                className="flex-1 bg-[#07080f] border border-white/7 rounded-lg px-3 py-2 text-xs text-[#f1f5f9] placeholder:text-[#374151] focus:outline-none focus:border-[rgba(255,101,36,0.3)]"
              />
              <button onClick={submitComment} className="w-7 h-7 rounded-lg bg-[rgba(255,101,36,0.12)] text-[#FF8B5E] hover:bg-[rgba(255,101,36,0.2)] flex items-center justify-center transition-colors flex-shrink-0">
                <Send size={12} />
              </button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Compose box ──────────────────────────────────────────────────────────────

function ComposeBox({ onPost }: { onPost: (content: string, type: string, imageUrl?: string | null) => Promise<void> }) {
  const { profile, user } = useAuth();
  const [content, setContent] = useState("");
  const [postType, setPostType] = useState("update");
  const [posting, setPosting] = useState(false);
  const [showImageUpload, setShowImageUpload] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  const submit = async () => {
    if (!content.trim()) return;
    setPosting(true);
    await onPost(content, postType, imageUrl);
    setContent("");
    setImageUrl(null);
    setShowImageUpload(false);
    setPosting(false);
  };

  return (
    <Card className="p-4">
      <div className="flex gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[rgba(255,101,36,0.2)] to-[rgba(139,92,246,0.15)] flex items-center justify-center text-sm font-bold text-[#FF8B5E] flex-shrink-0">
          {profile?.full_name?.[0] ?? "?"}
        </div>
        <div className="flex-1">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Share an update, promote a product, post a job opportunity..."
            rows={3}
            className="w-full bg-[#07080f] border border-white/7 rounded-xl px-4 py-3 text-sm text-[#f1f5f9] placeholder:text-[#374151] focus:outline-none focus:border-[rgba(255,101,36,0.3)] resize-none"
          />
          {showImageUpload && (
            <div className="mt-3">
              <ImageUpload
                value={imageUrl}
                onChange={setImageUrl}
                bucket="community"
                path={`posts/${user?.id}/${Date.now()}`}
                shape="square"
                size="md"
                placeholder="Upload post image"
              />
            </div>
          )}
          <div className="flex items-center justify-between mt-3">
            <div className="flex gap-1.5 flex-wrap items-center">
              <button
                onClick={() => setShowImageUpload((v) => !v)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold border transition-all ${
                  showImageUpload ? "border-[#3b82f6] text-[#3b82f6] bg-[rgba(59,130,246,0.1)]" : "border-white/7 text-[#374151] hover:border-white/15"
                }`}
              >
                <ImageIcon size={9} /> Photo
              </button>
              {Object.entries(POST_TYPE_STYLES).map(([key, style]) => {
                const Icon = style.icon;
                return (
                  <button
                    key={key}
                    onClick={() => setPostType(key)}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold transition-all border ${
                      postType === key
                        ? "border-current"
                        : "border-white/7 text-[#374151] hover:border-white/15"
                    }`}
                    style={postType === key ? { color: style.color, background: style.bg, borderColor: `${style.color}50` } : {}}
                  >
                    <Icon size={9} />
                    {style.label}
                  </button>
                );
              })}
            </div>
            <Button size="sm" onClick={submit} disabled={posting || !content.trim()}>
              {posting ? <Loader2 size={13} className="animate-spin" /> : <><Send size={13} /> Post</>}
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CommunityPage() {
  const { profile } = useAuth();
  const supabase = createClient();

  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FeedFilter>("all");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const q = supabase
        .from("community_posts")
        .select("id, author_id, author_name, author_avatar, author_role, author_business, content, post_type, likes_count, comments_count, shares_count, image_url, created_at")
        .order("created_at", { ascending: false })
        .limit(20);

      if (filter !== "all") {
        q.eq("post_type", filter === "businesses" ? "update" : filter === "jobs" ? "job" : filter === "achievements" ? "achievement" : "promotion");
      }

      const { data } = await q;
      const rows = ((data ?? []) as Omit<Post, "liked_by_me">[]).map((p) => ({ ...p, liked_by_me: false }));
      setPosts(rows);
    } finally {
      setLoading(false);
    }
  }, [filter]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

  const handlePost = async (content: string, type: string, imageUrl?: string | null) => {
    if (!profile?.id) return;
    const newPost = {
      author_id: profile.id,
      author_name: profile?.full_name ?? "Anonymous",
      author_avatar: null,
      author_role: null,
      author_business: null,
      content,
      post_type: type,
      likes_count: 0,
      comments_count: 0,
      shares_count: 0,
      image_url: imageUrl ?? null,
    };
    const { data } = await supabase.from("community_posts").insert(newPost).select().single();
    if (data) {
      setPosts((prev) => [{ ...(data as Omit<Post, "liked_by_me">), liked_by_me: false }, ...prev]);
    }
  };

  const handleLike = async (postId: string) => {
    if (!profile?.id) return;
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? { ...p, liked_by_me: !p.liked_by_me, likes_count: p.liked_by_me ? p.likes_count - 1 : p.likes_count + 1 }
          : p
      )
    );
    await supabase.rpc("toggle_post_like", { p_post_id: postId, p_user_id: profile.id });
  };

  const FILTERS: { key: FeedFilter; label: string; icon: React.ElementType }[] = [
    { key: "all",          label: "All",          icon: Globe       },
    { key: "businesses",   label: "Businesses",   icon: Building2   },
    { key: "jobs",         label: "Jobs",         icon: Briefcase   },
    { key: "achievements", label: "Achievements", icon: Trophy      },
    { key: "promotions",   label: "Promotions",   icon: Megaphone   },
  ];

  return (
    <div className="animate-fade-in">
      <Header
        title="Community"
        subtitle="The business social network — connect, share, grow"
        actions={<Badge variant="green" className="text-xs">LIVE FEED</Badge>}
      />

      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Feed */}
          <div className="lg:col-span-2 space-y-4">
            {/* Compose */}
            <ComposeBox onPost={handlePost} />

            {/* Filters */}
            <div className="flex gap-1 p-1 bg-[#0d0f1a] border border-white/7 rounded-xl w-fit overflow-x-auto">
              {FILTERS.map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setFilter(key)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${filter === key ? "bg-[rgba(255,101,36,0.12)] text-[#FF8B5E]" : "text-[#64748b] hover:text-[#f1f5f9]"}`}
                >
                  <Icon size={12} />
                  {label}
                </button>
              ))}
            </div>

            {/* Posts */}
            {loading ? (
              <div className="space-y-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-40 bg-[#111624] border border-white/7 rounded-2xl animate-pulse" />
                ))}
              </div>
            ) : posts.length === 0 ? (
              <div className="bg-[#0d0f1a] border border-white/7 rounded-2xl p-14 text-center">
                <MessageSquare size={36} className="mx-auto mb-3 text-[#374151]" />
                <p className="text-[#f1f5f9] font-semibold mb-1">No posts yet</p>
                <p className="text-sm text-[#64748b]">Be the first to post something. Share an update, job, promotion, or achievement.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {posts.map((post) => (
                  <PostCard key={post.id} post={post} onLike={handleLike} currentUserName={profile?.full_name ?? "Anonymous"} />
                ))}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Who to follow / Trending businesses */}
            <Card className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp size={13} className="text-[#FF8B5E]" />
                <h3 className="text-sm font-semibold text-[#f1f5f9]">Active Businesses</h3>
              </div>
              <div className="space-y-3">
                {loading ? (
                  Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-10 bg-white/3 rounded-lg animate-pulse" />)
                ) : (
                  Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[rgba(255,101,36,0.1)] flex items-center justify-center text-xs text-[#FF8B5E] font-bold flex-shrink-0">
                        B
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-[#f1f5f9] truncate">Business {i + 1}</p>
                        <p className="text-[10px] text-[#64748b]">Retail · Accra</p>
                      </div>
                      <button className="text-xs text-[#FF8B5E] hover:underline flex-shrink-0">Follow</button>
                    </div>
                  ))
                )}
              </div>
            </Card>

            {/* Post types guide */}
            <Card className="p-5">
              <h3 className="text-sm font-semibold text-[#f1f5f9] mb-3">What to Post</h3>
              <div className="space-y-2">
                {Object.entries(POST_TYPE_STYLES).map(([key, style]) => {
                  const Icon = style.icon;
                  return (
                    <div key={key} className="flex items-center gap-2 text-xs">
                      <Icon size={12} style={{ color: style.color }} />
                      <span className="text-[#94a3b8]">{style.label}</span>
                      <span className="text-[#374151] ml-auto capitalize">{key === "update" ? "Share news" : key === "job" ? "Hire talent" : key === "promotion" ? "Run deals" : key === "achievement" ? "Celebrate wins" : "Share data"}</span>
                    </div>
                  );
                })}
              </div>
            </Card>

            {/* Community stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[#0d0f1a] border border-white/7 rounded-xl p-3 text-center">
                <p className="text-lg font-black text-[#f1f5f9]">{loading ? "—" : posts.length}</p>
                <p className="text-xs text-[#64748b]">Posts Today</p>
              </div>
              <div className="bg-[#0d0f1a] border border-white/7 rounded-xl p-3 text-center">
                <p className="text-lg font-black text-[#f1f5f9]">—</p>
                <p className="text-xs text-[#64748b]">Active Members</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
