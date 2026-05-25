"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell, X, CheckCheck, CheckCircle2, AlertTriangle,
  Info, Zap, CreditCard, Shield, Cpu, ArrowRight,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Notification {
  id: string;
  type: "info" | "success" | "warning" | "error" | "ai" | "billing" | "security" | "event";
  title: string;
  body: string;
  time: string;
  read: boolean;
  actionUrl?: string;
  actionLabel?: string;
}

// ─── Mock data ────────────────────────────────────────────────────────────────

const MOCK: Notification[] = [
  { id: "n1", type: "success",  title: "Workflow completed",      body: "Marketing automation ran successfully in 1.2s.",       time: "2 min ago",   read: false, actionUrl: "/workflows",   actionLabel: "View run" },
  { id: "n2", type: "ai",       title: "AI quota warning",        body: "You've used 80% of your monthly AI requests.",          time: "1 hr ago",    read: false, actionUrl: "/billing",    actionLabel: "Upgrade plan" },
  { id: "n3", type: "billing",  title: "Invoice ready",           body: "Your May 2026 invoice ($29.00) is available.",          time: "3 hr ago",    read: false, actionUrl: "/billing",    actionLabel: "View invoice" },
  { id: "n4", type: "security", title: "New device login",        body: "A new device signed in from Lagos, NG.",                time: "2 days ago",  read: true,  actionUrl: "/security",   actionLabel: "Review" },
  { id: "n5", type: "info",     title: "Member joined",           body: "alex@kenuxa.io accepted your invitation.",             time: "3 days ago",  read: true },
  { id: "n6", type: "event",    title: "Event spike detected",    body: "1,200 events/min on the auth channel.",                 time: "4 days ago",  read: true,  actionUrl: "/events" },
];

const TYPE_CONFIG: Record<string, { icon: typeof Bell; color: string; bg: string }> = {
  success:  { icon: CheckCircle2,  color: "text-emerald-400", bg: "bg-emerald-500/10" },
  error:    { icon: AlertTriangle, color: "text-red-400",     bg: "bg-red-500/10"     },
  warning:  { icon: AlertTriangle, color: "text-amber-400",   bg: "bg-amber-500/10"   },
  info:     { icon: Info,          color: "text-cyan-400",    bg: "bg-cyan-500/10"    },
  ai:       { icon: Cpu,           color: "text-violet-400",  bg: "bg-violet-500/10"  },
  billing:  { icon: CreditCard,    color: "text-amber-400",   bg: "bg-amber-500/10"   },
  security: { icon: Shield,        color: "text-red-400",     bg: "bg-red-500/10"     },
  event:    { icon: Zap,           color: "text-cyan-400",    bg: "bg-cyan-500/10"    },
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface NotificationsPanelProps {
  open:    boolean;
  onClose: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function NotificationsPanel({ open, onClose }: NotificationsPanelProps) {
  const [notifications, setNotifications] = useState<Notification[]>(MOCK);

  const unreadCount = notifications.filter(n => !n.read).length;

  function markAllRead() {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }

  function dismiss(id: string) {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }

  function markRead(id: string) {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
            className="fixed inset-0 z-40"
          />

          {/* Panel */}
          <motion.div
            initial={{ opacity: 0, x: 20, scale: 0.97 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 20, scale: 0.97 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="fixed right-4 top-16 z-50 w-[380px] overflow-hidden rounded-2xl border border-white/[0.1] bg-[#0d0f1a]/95 shadow-2xl shadow-black/60 backdrop-blur-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/[0.07] px-4 py-3.5">
              <div className="flex items-center gap-2.5">
                <Bell className="h-4 w-4 text-violet-400" />
                <span className="text-[13px] font-semibold text-white">Notifications</span>
                {unreadCount > 0 && (
                  <span className="flex h-4.5 min-w-[18px] items-center justify-center rounded-full bg-violet-600 px-1 text-[9px] font-bold text-white">
                    {unreadCount}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                {unreadCount > 0 && (
                  <button onClick={markAllRead} className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] text-[#374151] hover:bg-white/[0.05] hover:text-slate-400 transition-all">
                    <CheckCheck className="h-3 w-3" /> Mark all read
                  </button>
                )}
                <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-lg text-[#374151] hover:bg-white/[0.06] hover:text-slate-300 transition-all">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* List */}
            <div className="max-h-[480px] overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.04]">
                    <Bell className="h-4.5 w-4.5 text-[#374151]" />
                  </div>
                  <p className="text-[13px] font-medium text-[#374151]">All caught up</p>
                  <p className="mt-0.5 text-[11px] text-[#374151]">No notifications right now</p>
                </div>
              ) : (
                <div className="divide-y divide-white/[0.04]">
                  {notifications.map(n => {
                    const cfg  = TYPE_CONFIG[n.type] ?? TYPE_CONFIG.info;
                    const Icon = cfg.icon;
                    return (
                      <div
                        key={n.id}
                        onClick={() => markRead(n.id)}
                        className={`relative flex gap-3 px-4 py-3.5 cursor-pointer transition-colors hover:bg-white/[0.03] ${!n.read ? "bg-violet-500/[0.03]" : ""}`}
                      >
                        {/* Unread dot */}
                        {!n.read && <div className="absolute left-2 top-1/2 -translate-y-1/2 h-1.5 w-1.5 rounded-full bg-violet-500" />}

                        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${cfg.bg}`}>
                          <Icon className={`h-3.5 w-3.5 ${cfg.color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-[12px] font-medium leading-snug ${!n.read ? "text-white" : "text-slate-400"}`}>{n.title}</p>
                          <p className="mt-0.5 text-[11px] text-[#374151] leading-relaxed line-clamp-2">{n.body}</p>
                          {n.actionUrl && (
                            <a
                              href={n.actionUrl}
                              onClick={e => e.stopPropagation()}
                              className="mt-1.5 flex items-center gap-1 text-[11px] text-violet-400 hover:text-violet-300 transition-colors"
                            >
                              {n.actionLabel ?? "View"} <ArrowRight className="h-2.5 w-2.5" />
                            </a>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-2 shrink-0">
                          <span className="text-[10px] text-[#374151] whitespace-nowrap">{n.time}</span>
                          <button
                            onClick={e => { e.stopPropagation(); dismiss(n.id); }}
                            className="text-[#374151] hover:text-slate-400 transition-colors"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-white/[0.07] px-4 py-2.5">
              <a href="/settings?tab=notifications" className="flex items-center justify-center gap-1.5 text-[11px] text-[#374151] hover:text-slate-400 transition-colors">
                Notification settings <ArrowRight className="h-2.5 w-2.5" />
              </a>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
