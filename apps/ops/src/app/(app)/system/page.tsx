'use client'

/**
 * KENUXA OPS — System Monitor Page (Phase 4)
 *
 * Real-time view of:
 *  - Multi-agent status (Planner, Browser, Communication, Memory, Optimization)
 *  - Service health (Supabase, CORE, Redis, Playwright Worker, Groq AI)
 *  - Queue stats (pending, processing, failed, dead)
 *  - Manual queue trigger + dead-letter purge
 *  - Outlook connection status
 */

import { useCallback, useEffect, useState } from 'react'
import { motion, AnimatePresence }           from 'framer-motion'
import {
  Activity,
  AlertCircle,
  Bot,
  Brain,
  CheckCircle2,
  Clock,
  Cpu,
  Database,
  Globe,
  HardDrive,
  HelpCircle,
  Laptop,
  Loader2,
  Mail,
  Monitor,
  MonitorSpeaker,
  Play,
  RefreshCw,
  Server,
  Terminal,
  Trash2,
  Wifi,
  WifiOff,
  Zap,
} from 'lucide-react'
import type { SystemHealth, ServiceHealth, ServiceStatus, QueueStats, AgentState, OpsDevice, DeviceStatus } from '@/types/ops'

// ── Types ──────────────────────────────────────────────────────────────────────

interface ProcessorResult {
  processed:   number
  succeeded:   number
  failed:      number
  skipped:     number
  durationMs:  number
  triggeredBy: string
}

// ── Device helpers ─────────────────────────────────────────────────────────────

function deviceStatusColor(status: DeviceStatus | undefined): string {
  switch (status) {
    case 'active':   return 'text-emerald-400'
    case 'offline':  return 'text-zinc-500'
    case 'degraded': return 'text-amber-400'
    case 'unsynced': return 'text-orange-400'
    default:         return 'text-zinc-600'
  }
}

function devicePlatformIcon(platform: string) {
  switch (platform) {
    case 'windows': return <Monitor  size={14} className="text-sky-400"     />
    case 'macos':   return <Laptop   size={14} className="text-violet-400"  />
    case 'linux':   return <Terminal size={14} className="text-emerald-400" />
    default:        return <HardDrive size={14} className="text-zinc-400"   />
  }
}

function DeviceRow({ device }: { device: OpsDevice }) {
  const isActive = device.status === 'active'
  const idleSec  = Math.floor((Date.now() - new Date(device.lastSeenAt).getTime()) / 1000)
  const idleStr  = idleSec < 60 ? `${idleSec}s` : `${Math.floor(idleSec / 60)}m`

  return (
    <div className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border ${
      isActive
        ? 'border-emerald-500/20 bg-emerald-950/10'
        : 'border-zinc-800 bg-zinc-900/20'
    }`}>
      <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-zinc-800 border border-zinc-700 shrink-0">
        {devicePlatformIcon(device.platform)}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white truncate">{device.name}</p>
        <p className="text-xs text-zinc-500 capitalize">{device.platform} · v{device.version}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-[10px] text-zinc-600 tabular-nums">{idleStr} ago</span>
        <div className="flex items-center gap-1">
          {isActive && (
            <motion.span
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="w-1.5 h-1.5 rounded-full bg-emerald-400"
            />
          )}
          <span className={`text-xs ${deviceStatusColor(device.status)}`}>{device.status}</span>
        </div>
      </div>
    </div>
  )
}

// ── Status helpers ─────────────────────────────────────────────────────────────

function statusColor(status: ServiceStatus | undefined): string {
  switch (status) {
    case 'online':   return 'text-emerald-400'
    case 'degraded': return 'text-amber-400'
    case 'offline':  return 'text-red-400'
    default:         return 'text-zinc-500'
  }
}

function statusBg(status: ServiceStatus | undefined): string {
  switch (status) {
    case 'online':   return 'bg-emerald-400/10 border-emerald-400/20'
    case 'degraded': return 'bg-amber-400/10 border-amber-400/20'
    case 'offline':  return 'bg-red-400/10 border-red-400/20'
    default:         return 'bg-zinc-800/50 border-zinc-700/50'
  }
}

function StatusIcon({ status, size = 16 }: { status?: ServiceStatus; size?: number }) {
  const cls = `${statusColor(status)} flex-shrink-0`
  if (status === 'online')   return <CheckCircle2 size={size} className={cls} />
  if (status === 'degraded') return <AlertCircle  size={size} className={cls} />
  if (status === 'offline')  return <WifiOff      size={size} className={cls} />
  return <HelpCircle size={size} className={cls} />
}

function ServiceIcon({ name }: { name: string }) {
  if (name.includes('Supabase'))   return <Database size={18} className="text-emerald-400" />
  if (name.includes('CORE'))       return <Zap      size={18} className="text-violet-400"  />
  if (name.includes('Redis'))      return <Server   size={18} className="text-red-400"     />
  if (name.includes('Playwright')) return <Globe    size={18} className="text-sky-400"     />
  if (name.includes('Groq'))       return <Cpu      size={18} className="text-orange-400"  />
  return <Activity size={18} className="text-zinc-400" />
}

// ── Agent helpers ──────────────────────────────────────────────────────────────

function agentIcon(type: string) {
  switch (type) {
    case 'planner':       return <Brain  size={16} className="text-indigo-400"  />
    case 'browser':       return <Globe  size={16} className="text-sky-400"     />
    case 'communication': return <Mail   size={16} className="text-cyan-400"    />
    case 'memory':        return <Database size={16} className="text-emerald-400" />
    case 'optimization':  return <Zap    size={16} className="text-amber-400"   />
    default:              return <Bot    size={16} className="text-zinc-400"    />
  }
}

function agentStatusColor(status: string): string {
  switch (status) {
    case 'running':   return 'text-indigo-400'
    case 'completed': return 'text-emerald-400'
    case 'failed':    return 'text-red-400'
    case 'offline':   return 'text-zinc-600'
    default:          return 'text-zinc-500'
  }
}

function AgentCard({ agent }: { agent: AgentState }) {
  const isRunning = agent.status === 'running'
  return (
    <div className={`rounded-xl border p-3 flex items-center gap-3 ${
      isRunning
        ? 'border-indigo-500/30 bg-indigo-500/5'
        : 'border-zinc-800 bg-zinc-900/30'
    }`}>
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${
        isRunning ? 'bg-indigo-500/10 border-indigo-500/20' : 'bg-zinc-800 border-zinc-700'
      }`}>
        {agentIcon(agent.type)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium text-white capitalize">{agent.type}</span>
          <span className={`text-xs ${agentStatusColor(agent.status)} flex items-center gap-1`}>
            {isRunning && (
              <motion.span
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
                className="w-1.5 h-1.5 rounded-full bg-indigo-400 inline-block"
              />
            )}
            {agent.status}
          </span>
        </div>
        {agent.currentTask && (
          <p className="text-xs text-zinc-500 truncate mt-0.5">{agent.currentTask}</p>
        )}
        <div className="flex items-center gap-3 mt-1">
          <span className="text-[10px] text-zinc-600">{agent.tasksRun} tasks</span>
          {agent.errors > 0 && (
            <span className="text-[10px] text-red-500/70">{agent.errors} errors</span>
          )}
          {agent.lastRunAt && (
            <span className="text-[10px] text-zinc-700 ml-auto">
              {new Date(agent.lastRunAt).toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function ServiceCard({ service }: { service: ServiceHealth }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-xl border p-4 flex items-start gap-3 ${statusBg(service.status)}`}
    >
      <div className="mt-0.5">
        <ServiceIcon name={service.name} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="font-medium text-sm text-white truncate">{service.name}</span>
          <StatusIcon status={service.status} />
        </div>
        {service.latencyMs !== undefined && (
          <p className="text-xs text-zinc-500 mt-0.5">
            {service.latencyMs}ms
          </p>
        )}
        {service.message && (
          <p className="text-xs text-zinc-400 mt-1 break-words">{service.message}</p>
        )}
        <p className="text-xs text-zinc-600 mt-1">
          {service.checkedAt
            ? `Checked ${new Date(service.checkedAt).toLocaleTimeString()}`
            : 'Not checked'}
        </p>
      </div>
    </motion.div>
  )
}

function QueueStatBadge({
  label,
  value,
  color = 'text-zinc-300',
}: {
  label: string
  value: number
  color?: string
}) {
  return (
    <div className="flex flex-col items-center gap-1 px-4 py-3">
      <span className={`text-2xl font-bold tabular-nums ${color}`}>{value}</span>
      <span className="text-xs text-zinc-500">{label}</span>
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function SystemPage() {
  const [health,          setHealth]          = useState<SystemHealth | null>(null)
  const [agents,          setAgents]          = useState<AgentState[]>([])
  const [devices,         setDevices]         = useState<OpsDevice[]>([])
  const [loading,         setLoading]         = useState(true)
  const [refreshing,      setRefreshing]      = useState(false)
  const [lastRefresh,     setLastRefresh]     = useState<Date | null>(null)
  const [processorResult, setProcessorResult] = useState<ProcessorResult | null>(null)
  const [processing,      setProcessing]      = useState(false)
  const [purging,         setPurging]         = useState(false)
  const [error,           setError]           = useState<string | null>(null)

  // ── Fetch agent states ──────────────────────────────────────────────────────

  const fetchAgents = useCallback(async () => {
    try {
      const res  = await fetch('/api/agents')
      const data = await res.json() as { agents?: AgentState[] }
      if (data.agents) setAgents(data.agents)
    } catch { /* non-fatal */ }
  }, [])

  // ── Fetch connected devices ─────────────────────────────────────────────────

  const fetchDevices = useCallback(async () => {
    try {
      const res  = await fetch('/api/devices')
      const data = await res.json() as { devices?: OpsDevice[] }
      if (data.devices) setDevices(data.devices)
    } catch { /* non-fatal */ }
  }, [])

  // ── Fetch health ────────────────────────────────────────────────────────────

  const fetchHealth = useCallback(async (force = false) => {
    setRefreshing(true)
    setError(null)
    try {
      const url = force ? '/api/health?refresh=true' : '/api/health'
      const [res] = await Promise.all([fetch(url), fetchAgents(), fetchDevices()])
      const data = await res.json() as SystemHealth & { error?: string }
      if (data.error) throw new Error(data.error)
      setHealth(data)
      setLastRefresh(new Date())
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [fetchAgents, fetchDevices])

  // Auto-refresh every 30s
  useEffect(() => {
    fetchHealth()
    const interval = setInterval(() => fetchHealth(), 30_000)
    return () => clearInterval(interval)
  }, [fetchHealth])

  // ── Trigger queue processor ─────────────────────────────────────────────────

  const triggerProcessor = async () => {
    setProcessing(true)
    setProcessorResult(null)
    try {
      const res = await fetch('/api/queue/process', { method: 'POST' })
      const data = await res.json() as ProcessorResult & { error?: string }
      if (data.error) throw new Error(data.error)
      setProcessorResult(data)
      // Refresh stats after processing
      await fetchHealth(true)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setProcessing(false)
    }
  }

  // ── Purge dead-letter queue ─────────────────────────────────────────────────

  const purgeDead = async () => {
    setPurging(true)
    try {
      const res = await fetch('/api/queue', { method: 'DELETE' })
      const data = await res.json() as { purged: number; error?: string }
      if (data.error) throw new Error(data.error)
      await fetchHealth(true)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setPurging(false)
    }
  }

  // ── Overall status dot ──────────────────────────────────────────────────────

  const overallStatus = health?.overall ?? 'unknown'
  const overallDot =
    overallStatus === 'online'   ? 'bg-emerald-400' :
    overallStatus === 'degraded' ? 'bg-amber-400'   :
    overallStatus === 'offline'  ? 'bg-red-400'     :
    'bg-zinc-500'

  const qs: QueueStats = health?.queueStats ?? {
    queued: 0, processing: 0, failed: 0, dead: 0, processed: 0, latencyMs: 0,
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-6 space-y-8">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${overallDot} shadow-lg shadow-current`} />
          <div>
            <h1 className="text-xl font-bold text-white">System Monitor</h1>
            <p className="text-sm text-zinc-500">
              {lastRefresh
                ? `Last updated ${lastRefresh.toLocaleTimeString()}`
                : 'Loading...'}
            </p>
          </div>
        </div>

        <button
          onClick={() => fetchHealth(true)}
          disabled={refreshing}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-sm text-zinc-300 disabled:opacity-50 transition-colors"
        >
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* ── Error banner ── */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm"
          >
            <AlertCircle size={16} />
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Loading skeleton ── */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="animate-spin text-violet-400" />
        </div>
      )}

      {!loading && health && (
        <>
          {/* ── Agent Status (Phase 4) ── */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">
                Agents
              </h2>
              <span className="text-xs text-zinc-600">
                {agents.filter(a => a.status === 'running').length} active
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {agents.length > 0
                ? agents.map(agent => <AgentCard key={agent.type} agent={agent} />)
                : (['planner', 'browser', 'communication', 'memory', 'optimization'] as const).map(type => (
                    <AgentCard key={type} agent={{ type, status: 'idle', tasksRun: 0, errors: 0 }} />
                  ))
              }
            </div>
            {/* Outlook connect status */}
            <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-lg border border-zinc-800 bg-zinc-900/30">
              <Mail size={14} className="text-cyan-400" />
              <span className="text-xs text-zinc-400">Outlook (Microsoft Graph)</span>
              <a
                href="/api/auth/microsoft"
                className="ml-auto text-xs px-2.5 py-1 rounded-lg bg-cyan-600/20 hover:bg-cyan-600/30 border border-cyan-500/20 text-cyan-400 transition-colors"
              >
                Connect
              </a>
            </div>
          </section>

          {/* ── Connected Desktop Agents (Phase 6) ── */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">
                Desktop Agents
              </h2>
              <div className="flex items-center gap-2">
                {devices.filter(d => d.status === 'active').length > 0 && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-semibold">
                    {devices.filter(d => d.status === 'active').length} online
                  </span>
                )}
                <a
                  href="/agent"
                  className="text-xs px-2.5 py-1 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/20 text-indigo-400 transition-colors"
                >
                  Download Agent
                </a>
              </div>
            </div>

            {devices.length === 0 ? (
              <div className="rounded-xl border border-dashed border-zinc-800 p-6 text-center">
                <MonitorSpeaker size={18} className="text-zinc-600 mx-auto mb-2" />
                <p className="text-xs text-zinc-500">No Desktop Agents paired</p>
                <p className="text-[10px] text-zinc-700 mt-0.5">
                  Install the KENUXA Desktop Agent to enable local OS control
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {devices.map(device => (
                  <DeviceRow key={device.id} device={device} />
                ))}
              </div>
            )}
          </section>

          {/* ── Queue Stats ── */}
          <section>
            <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">
              Queue Status
            </h2>
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
              <div className="grid grid-cols-5 divide-x divide-zinc-800">
                <QueueStatBadge label="Pending"    value={qs.queued}     color="text-blue-400"    />
                <QueueStatBadge label="Processing" value={qs.processing} color="text-amber-400"   />
                <QueueStatBadge label="Failed"     value={qs.failed}     color="text-red-400"     />
                <QueueStatBadge label="Dead"       value={qs.dead}       color="text-zinc-500"    />
                <QueueStatBadge label="Processed"  value={qs.processed}  color="text-emerald-400" />
              </div>

              {/* Processor controls */}
              <div className="border-t border-zinc-800 p-3 flex items-center gap-3 flex-wrap">
                <button
                  onClick={triggerProcessor}
                  disabled={processing}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-sm font-medium disabled:opacity-50 transition-colors"
                >
                  {processing
                    ? <Loader2 size={14} className="animate-spin" />
                    : <Play size={14} />
                  }
                  {processing ? 'Processing…' : 'Process Queue Now'}
                </button>

                {qs.dead > 0 && (
                  <button
                    onClick={purgeDead}
                    disabled={purging}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-800 hover:bg-red-900/50 text-sm text-zinc-400 hover:text-red-400 disabled:opacity-50 transition-colors"
                  >
                    {purging
                      ? <Loader2 size={14} className="animate-spin" />
                      : <Trash2 size={14} />
                    }
                    Purge {qs.dead} Dead
                  </button>
                )}

                {qs.latencyMs > 0 && (
                  <span className="flex items-center gap-1 text-xs text-zinc-500 ml-auto">
                    <Clock size={12} />
                    Queue latency: {qs.latencyMs}ms
                  </span>
                )}
              </div>

              {/* Processor result */}
              <AnimatePresence>
                {processorResult && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="border-t border-zinc-800 p-3 bg-zinc-900/50"
                  >
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-zinc-500 text-xs">Last run:</span>
                      <span className="text-emerald-400">✓ {processorResult.succeeded} succeeded</span>
                      {processorResult.failed > 0 && (
                        <span className="text-red-400">✗ {processorResult.failed} failed</span>
                      )}
                      {processorResult.skipped > 0 && (
                        <span className="text-zinc-500">{processorResult.skipped} skipped</span>
                      )}
                      <span className="text-zinc-500 ml-auto text-xs">
                        {processorResult.durationMs}ms · via {processorResult.triggeredBy}
                      </span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </section>

          {/* ── Service Health ── */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">
                Services
              </h2>
              <div className={`flex items-center gap-1.5 text-xs ${statusColor(health.overall)}`}>
                <Wifi size={12} />
                System {health.overall}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {health.services.map(service => (
                <ServiceCard key={service.name} service={service} />
              ))}
            </div>
          </section>

          {/* ── Cron Info ── */}
          <section>
            <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">
              Scheduled Jobs
            </h2>
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 space-y-3">
              {[
                { path: '/api/queue/process', schedule: 'Every 30 seconds', desc: 'Drain Redis queue, execute pending jobs' },
                { path: '/api/health',        schedule: 'Every 5 minutes',  desc: 'Probe all services, update health cache' },
              ].map(job => (
                <div key={job.path} className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-violet-400 mt-1.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <code className="text-xs bg-zinc-800 px-2 py-0.5 rounded text-violet-300">
                        {job.path}
                      </code>
                      <span className="text-xs text-zinc-500">{job.schedule}</span>
                    </div>
                    <p className="text-xs text-zinc-500 mt-0.5">{job.desc}</p>
                  </div>
                </div>
              ))}
              <p className="text-xs text-zinc-600 pt-1 border-t border-zinc-800">
                Configured via <code className="text-zinc-500">vercel.json</code> · Vercel Cron
              </p>
            </div>
          </section>

          {/* ── Checked at ── */}
          <p className="text-xs text-zinc-700 text-center">
            Health data cached at {new Date(health.checkedAt).toLocaleString()}
          </p>
        </>
      )}
    </div>
  )
}
