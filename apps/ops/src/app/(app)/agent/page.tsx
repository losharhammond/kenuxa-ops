'use client'

/**
 * KENUXA OPS — Desktop Agent Page (Phase 6)
 *
 * Download KENUXA Desktop Agent + auto-pairing status.
 *
 * The Desktop Agent (Electron) enables:
 *  - Local OS control (open apps, switch windows, navigate files)
 *  - Real browser tab control (open URLs, fill forms, click buttons)
 *  - Local Playwright bridge (headful browser automation visible on screen)
 *  - Voice bridge (wake word without browser tab open)
 *  - Always-on persistent connection
 *
 * Auto-pairing: user opens Electron app → logs in with CORE credentials →
 *   agent auto-registers device → OPS shows "Connected" instantly.
 *   No QR codes. No manual tokens.
 */

import { useCallback, useEffect, useState } from 'react'
import { motion, AnimatePresence }           from 'framer-motion'
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Clock,
  Download,
  Globe,
  HardDrive,
  Laptop,
  Loader2,
  Monitor,
  MonitorSpeaker,
  RefreshCw,
  Shield,
  Terminal,
  Trash2,
  Wifi,
  WifiOff,
  Zap,
} from 'lucide-react'
import type { OpsDevice, DeviceStatus } from '@/types/ops'

// ── Platform download config ──────────────────────────────────────────────────

const AGENT_VERSION = '1.0.0'

const DOWNLOAD_PLATFORMS = [
  {
    id:       'windows',
    label:    'Windows',
    icon:     Monitor,
    ext:      '.exe',
    size:     '~90 MB',
    version:  AGENT_VERSION,
    url:      '/api/download/windows',
    note:     'Windows 10/11 · x64',
    color:    'text-sky-400',
    bg:       'bg-sky-500/10 border-sky-500/20',
    badge:    'Recommended',
  },
  {
    id:       'macos',
    label:    'macOS',
    icon:     Laptop,
    ext:      '.dmg',
    size:     '~95 MB',
    version:  AGENT_VERSION,
    url:      '/api/download/macos',
    note:     'macOS 13+ · Apple Silicon + Intel',
    color:    'text-violet-400',
    bg:       'bg-violet-500/10 border-violet-500/20',
    badge:    null,
  },
  {
    id:       'linux',
    label:    'Linux',
    icon:     Terminal,
    ext:      '.AppImage',
    size:     '~92 MB',
    version:  AGENT_VERSION,
    url:      '/api/download/linux',
    note:     'Ubuntu 20.04+ · x64',
    color:    'text-emerald-400',
    bg:       'bg-emerald-500/10 border-emerald-500/20',
    badge:    null,
  },
] as const

// ── Capability icons ───────────────────────────────────────────────────────────

const CAPABILITY_DISPLAY: Record<string, { label: string; icon: typeof Globe; color: string }> = {
  browser:    { label: 'Browser Control', icon: Globe,           color: 'text-sky-400'     },
  filesystem: { label: 'File System',     icon: HardDrive,       color: 'text-amber-400'   },
  notify:     { label: 'Notifications',   icon: Zap,             color: 'text-violet-400'  },
  voice:      { label: 'Voice Bridge',    icon: MonitorSpeaker,  color: 'text-emerald-400' },
  playwright: { label: 'Playwright',      icon: Activity,        color: 'text-orange-400'  },
}

// ── Status helpers ────────────────────────────────────────────────────────────

function statusColor(status: DeviceStatus | undefined): string {
  switch (status) {
    case 'active':    return 'text-emerald-400'
    case 'offline':   return 'text-zinc-500'
    case 'degraded':  return 'text-amber-400'
    case 'unsynced':  return 'text-orange-400'
    default:          return 'text-zinc-600'
  }
}

function statusDot(status: DeviceStatus | undefined): string {
  switch (status) {
    case 'active':    return 'bg-emerald-400'
    case 'offline':   return 'bg-zinc-600'
    case 'degraded':  return 'bg-amber-400'
    case 'unsynced':  return 'bg-orange-400'
    default:          return 'bg-zinc-700'
  }
}

function platformIcon(platform: string) {
  switch (platform) {
    case 'windows': return <Monitor   size={16} className="text-sky-400"    />
    case 'macos':   return <Laptop    size={16} className="text-violet-400" />
    case 'linux':   return <Terminal  size={16} className="text-emerald-400"/>
    default:        return <HardDrive size={16} className="text-zinc-400"   />
  }
}

// ── Device card ───────────────────────────────────────────────────────────────

function DeviceCard({
  device,
  onUnpair,
  unpairing,
}: {
  device:    OpsDevice
  onUnpair:  (id: string) => void
  unpairing: string | null
}) {
  const isActive = device.status === 'active'
  const lastSeen = new Date(device.lastSeenAt)
  const idleSec  = Math.floor((Date.now() - lastSeen.getTime()) / 1000)
  const idleStr  = idleSec < 60
    ? `${idleSec}s ago`
    : idleSec < 3600
      ? `${Math.floor(idleSec / 60)}m ago`
      : lastSeen.toLocaleTimeString()

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl border p-4 ${
        isActive
          ? 'border-emerald-500/25 bg-emerald-950/10'
          : 'border-zinc-800 bg-zinc-900/30'
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Platform icon */}
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center border shrink-0 ${
          isActive ? 'bg-emerald-950/30 border-emerald-500/20' : 'bg-zinc-800 border-zinc-700'
        }`}>
          {platformIcon(device.platform)}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm text-white truncate">{device.name}</span>
            <div className="flex items-center gap-1.5 ml-auto shrink-0">
              {isActive && (
                <motion.span
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className={`w-2 h-2 rounded-full ${statusDot(device.status)}`}
                />
              )}
              <span className={`text-xs font-medium ${statusColor(device.status)}`}>
                {device.status}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 mt-1 text-xs text-zinc-500">
            <span className="capitalize">{device.platform}</span>
            <span>v{device.version}</span>
            <span className="flex items-center gap-1 ml-auto">
              <Clock size={10} />
              {idleStr}
            </span>
          </div>

          {/* Capabilities */}
          {device.capabilities.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {device.capabilities.map(cap => {
                const cfg = CAPABILITY_DISPLAY[cap]
                if (!cfg) return null
                const CapIcon = cfg.icon
                return (
                  <span
                    key={cap}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px]
                      bg-zinc-800/80 border border-zinc-700/60 ${cfg.color}`}
                  >
                    <CapIcon size={9} />
                    {cfg.label}
                  </span>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="mt-3 pt-3 border-t border-zinc-800/60 flex items-center gap-2">
        <span className="text-[10px] text-zinc-600">
          Paired {new Date(device.pairedAt).toLocaleDateString()}
        </span>
        <button
          onClick={() => onUnpair(device.id)}
          disabled={unpairing === device.id}
          className="ml-auto flex items-center gap-1.5 text-xs text-zinc-600 hover:text-red-400 transition-colors disabled:opacity-50"
        >
          {unpairing === device.id
            ? <Loader2 size={11} className="animate-spin" />
            : <Trash2 size={11} />
          }
          Unpair
        </button>
      </div>
    </motion.div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AgentPage() {
  const [devices,   setDevices]   = useState<OpsDevice[]>([])
  const [loading,   setLoading]   = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [unpairing, setUnpairing] = useState<string | null>(null)
  const [error,     setError]     = useState<string | null>(null)

  const fetchDevices = useCallback(async () => {
    setRefreshing(true)
    try {
      const res  = await fetch('/api/devices')
      const data = await res.json() as { devices?: OpsDevice[]; error?: string }
      if (data.error) throw new Error(data.error)
      setDevices(data.devices ?? [])
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchDevices()
    const interval = setInterval(fetchDevices, 15_000)
    return () => clearInterval(interval)
  }, [fetchDevices])

  const handleUnpair = async (deviceId: string) => {
    setUnpairing(deviceId)
    try {
      await fetch(`/api/devices/${deviceId}`, { method: 'DELETE' })
      setDevices(prev => prev.filter(d => d.id !== deviceId))
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setUnpairing(null)
    }
  }

  const activeCount  = devices.filter(d => d.status === 'active').length
  const offlineCount = devices.filter(d => d.status !== 'active').length

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-6 space-y-10 max-w-4xl mx-auto">

      {/* ── Hero ── */}
      <div className="text-center space-y-4 py-4">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs mb-2">
          <MonitorSpeaker size={12} />
          Phase 6 — Real Computer Operator
        </div>
        <h1 className="text-3xl font-bold text-white">KENUXA Desktop Agent</h1>
        <p className="text-zinc-400 max-w-xl mx-auto text-sm leading-relaxed">
          One-click installer. Auto-pairs on login. Gives KENUXA OPS real control of your desktop —
          open apps, browse the web, manage files, and run automations you can see.
        </p>
      </div>

      {/* ── Download cards ── */}
      <section>
        <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-4">
          Download
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {DOWNLOAD_PLATFORMS.map(platform => {
            const PlatformIcon = platform.icon
            return (
              <motion.div
                key={platform.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={`relative rounded-2xl border p-5 flex flex-col gap-4 ${platform.bg}`}
              >
                {platform.badge && (
                  <span className="absolute -top-2.5 left-4 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-600 text-white">
                    {platform.badge}
                  </span>
                )}
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl bg-zinc-900/60 flex items-center justify-center border border-zinc-700/50`}>
                    <PlatformIcon size={20} className={platform.color} />
                  </div>
                  <div>
                    <p className="font-semibold text-white">{platform.label}</p>
                    <p className="text-xs text-zinc-500">{platform.note}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-xs text-zinc-500">
                  <span>v{platform.version}</span>
                  <span>{platform.size}</span>
                  <span className="ml-auto font-mono">{platform.ext}</span>
                </div>

                <a
                  href={platform.url}
                  className={`flex items-center justify-center gap-2 w-full py-2.5 rounded-xl
                    bg-zinc-900/80 border border-zinc-700/50 text-sm font-medium
                    hover:bg-zinc-800 transition-colors ${platform.color}`}
                >
                  <Download size={14} />
                  Download {platform.label}
                </a>
              </motion.div>
            )
          })}
        </div>
      </section>

      {/* ── How auto-pairing works ── */}
      <section>
        <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-4">
          Auto-Pairing — How It Works
        </h2>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
          <div className="space-y-4">
            {[
              {
                step: '1',
                icon: Download,
                color: 'text-indigo-400',
                bg:   'bg-indigo-500/10 border-indigo-500/20',
                title: 'Install & Open',
                desc:  'Download and run the KENUXA Desktop Agent installer. One .exe / .dmg / .AppImage — no dependencies.',
              },
              {
                step: '2',
                icon: Shield,
                color: 'text-violet-400',
                bg:   'bg-violet-500/10 border-violet-500/20',
                title: 'CORE Login',
                desc:  'Sign in with your KENUXA CORE credentials inside the app. Same account you use here.',
              },
              {
                step: '3',
                icon: Zap,
                color: 'text-emerald-400',
                bg:   'bg-emerald-500/10 border-emerald-500/20',
                title: 'Instant Pairing',
                desc:  'Agent auto-generates a device fingerprint, registers with OPS, and appears in your Connected Devices list below.',
              },
              {
                step: '4',
                icon: Wifi,
                color: 'text-sky-400',
                bg:   'bg-sky-500/10 border-sky-500/20',
                title: 'Always Connected',
                desc:  'Agent runs in the background, reconnects on restart, and receives commands instantly via secure WebSocket.',
              },
            ].map(item => {
              const StepIcon = item.icon
              return (
                <div key={item.step} className="flex items-start gap-4">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center border shrink-0 ${item.bg}`}>
                    <StepIcon size={16} className={item.color} />
                  </div>
                  <div className="flex-1 pt-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-zinc-600">STEP {item.step}</span>
                      <span className="font-semibold text-sm text-white">{item.title}</span>
                    </div>
                    <p className="text-sm text-zinc-400 mt-0.5 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── Connected devices ── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">
              Connected Devices
            </h2>
            {!loading && (
              <div className="flex items-center gap-2">
                {activeCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 border border-emerald-500/20 text-emerald-400">
                    {activeCount} online
                  </span>
                )}
                {offlineCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-zinc-800 border border-zinc-700 text-zinc-500">
                    {offlineCount} offline
                  </span>
                )}
              </div>
            )}
          </div>

          <button
            onClick={() => fetchDevices()}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-400 disabled:opacity-50 transition-colors"
          >
            <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm mb-4"
            >
              <AlertCircle size={14} />
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={24} className="animate-spin text-zinc-600" />
          </div>
        ) : devices.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-800 p-10 text-center">
            <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto mb-4">
              <WifiOff size={20} className="text-zinc-600" />
            </div>
            <p className="text-zinc-400 font-medium text-sm">No devices paired</p>
            <p className="text-zinc-600 text-xs mt-1">
              Download and install KENUXA Desktop Agent above to get started
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <AnimatePresence>
              {devices.map(device => (
                <DeviceCard
                  key={device.id}
                  device={device}
                  onUnpair={handleUnpair}
                  unpairing={unpairing}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </section>

      {/* ── Capabilities overview ── */}
      <section>
        <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-4">
          What the Desktop Agent Can Do
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            {
              icon: Globe,
              color: 'text-sky-400',
              bg:   'bg-sky-500/10 border-sky-500/20',
              title: 'Real Browser Control',
              items: [
                'Open URLs in your actual Chrome/Firefox/Edge',
                'Fill forms, click buttons, scroll pages',
                'Run visible browser automation (not headless)',
                'Return screenshots and page state',
              ],
            },
            {
              icon: HardDrive,
              color: 'text-amber-400',
              bg:   'bg-amber-500/10 border-amber-500/20',
              title: 'File System Operations',
              items: [
                'Open any file with its default application',
                'Search files and folders by name/content',
                'Navigate directories on command',
                'Create, move, and organize files',
              ],
            },
            {
              icon: MonitorSpeaker,
              color: 'text-violet-400',
              bg:   'bg-violet-500/10 border-violet-500/20',
              title: 'Desktop Automation',
              items: [
                'Launch and switch between applications',
                'Type text into any focused window',
                'Send keyboard shortcuts and hotkeys',
                'Desktop notifications with action buttons',
              ],
            },
            {
              icon: Activity,
              color: 'text-emerald-400',
              bg:   'bg-emerald-500/10 border-emerald-500/20',
              title: 'Always-On Connection',
              items: [
                'Starts with Windows/macOS login',
                'Reconnects automatically after restart',
                'Heartbeat every 30s keeps status current',
                'Secure WebSocket + shared secret auth',
              ],
            },
          ].map(section => {
            const SectionIcon = section.icon
            return (
              <div
                key={section.title}
                className={`rounded-2xl border p-4 ${section.bg}`}
              >
                <div className="flex items-center gap-2 mb-3">
                  <SectionIcon size={16} className={section.color} />
                  <span className={`font-semibold text-sm ${section.color}`}>{section.title}</span>
                </div>
                <ul className="space-y-1.5">
                  {section.items.map(item => (
                    <li key={item} className="flex items-start gap-2 text-xs text-zinc-400">
                      <ChevronRight size={10} className="text-zinc-600 shrink-0 mt-0.5" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
        </div>
      </section>

    </div>
  )
}
