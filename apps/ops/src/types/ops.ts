// ═══════════════════════════════════════════════════════════════════════════
// KENUXA OPS — Core Type Definitions
// ═══════════════════════════════════════════════════════════════════════════

// ── Voice ──────────────────────────────────────────────────────────────────────

export type VoiceState =
  | 'idle'       // passive, not listening
  | 'listening'  // wake word detected, capturing command
  | 'processing' // sending to AI
  | 'speaking'   // TTS response playing
  | 'error'

export type WakeWordState = 'inactive' | 'active' | 'triggered'

// ── Phase 5.2: Operational Status (10 real-time UI states) ───────────────────

export type OperationalStatus =
  | 'sleeping'          // 😴 low-power wake word mode
  | 'listening'         // 🎤 active, capturing speech
  | 'processing'        // 🧠 classifying + routing
  | 'executing'         // ⚡ executing steps
  | 'browser_active'    // 🌐 Playwright worker running
  | 'email_sending'     // 📧 Outlook Graph API
  | 'desktop_active'    // 🖥 Electron bridge action
  | 'file_opening'      // 📁 file system operation
  | 'completed'         // ✅ action verified + confirmed
  | 'follow_up'         // ⏳ session open, waiting for next command

// ── Phase 5.2: Execution Domains ─────────────────────────────────────────────

export type ExecutionDomain =
  | 'browser'       // web navigation, search, scrape
  | 'email'         // Outlook / send / read / draft
  | 'desktop'       // open apps, switch windows (requires bridge)
  | 'file'          // open files, navigate filesystem (requires bridge)
  | 'workflow'      // run saved workflow
  | 'conversation'  // memory, AI chat, general

// ── Phase 5.2: Persistent Voice Session ──────────────────────────────────────

export interface ActiveVoiceSession {
  id:             string
  startedAt:      string
  lastCommandAt:  string
  commandCount:   number
  entities:       Record<string, string>   // e.g. { lastEmail: 'hammond@...', lastUrl: 'tally.com' }
  browserContext: { url?: string; title?: string }
  activeWorkflow: string | null
  pendingAction:  { domain: ExecutionDomain; partial: Record<string, unknown> } | null
}

// ── Phase 5.2: Desktop Bridge ─────────────────────────────────────────────────

export type DesktopBridgeStatus = 'connected' | 'disconnected' | 'connecting' | 'error'

export interface BridgeCommand {
  type:    'open_app' | 'switch_window' | 'file_open' | 'file_search' | 'notify' | 'keyboard' | 'mouse' | 'open_url' | 'browser_navigate'
  payload: Record<string, unknown>
  id:      string
}

export interface BridgeResponse {
  id:      string
  success: boolean
  result?: unknown
  error?:  string
}

export interface VoiceSession {
  id:             string
  userId:         string
  wakeWord?:      string
  startedAt:      string
  endedAt?:       string
  commandsExecuted: number
  fullTranscript: string
  status:         'active' | 'ended' | 'error'
}

export interface AudioCapture {
  audioBlob?: Blob
  audioUrl?:  string
  duration:   number // ms
}

export interface VoiceEngineConfig {
  wakeWords:        string[]   // e.g. ['hey kenuxa', 'okay kenuxa', 'kenuxa']
  language:         string     // e.g. 'en-US'
  sttProvider:      'browser' | 'whisper' | 'groq'
  ttsProvider:      'browser' | 'edge' | 'piper'
  ttsVoice:         string
  ttsPitch:         number
  ttsRate:          number
  autoRestartMs:    number     // how long silent before auto-restart listen
  maxListenMs:      number     // max time to capture one command
}

// ── Commands ───────────────────────────────────────────────────────────────────

export type CommandStatus = 'pending' | 'executing' | 'completed' | 'failed' | 'cancelled'
export type CommandSource = 'voice' | 'api' | 'scheduled' | 'automation'

export type CommandIntent =
  // System
  | 'open_app' | 'close_app' | 'system_info' | 'search_files'
  // Browser
  | 'open_url' | 'search_web' | 'get_page_content'
  // Email
  | 'send_email' | 'read_emails' | 'search_emails' | 'summarize_inbox' | 'draft_reply'
  // Tasks
  | 'create_task' | 'list_tasks' | 'complete_task'
  // KENUXA
  | 'query_reach' | 'get_intelligence' | 'search_entities'
  // Memory
  | 'remember' | 'recall' | 'forget'
  // Workflows
  | 'run_workflow' | 'list_workflows' | 'create_workflow'
  // Calendar
  | 'create_event' | 'list_events' | 'find_free_time'
  // Utility
  | 'speak_only' | 'ask_clarification' | 'help' | 'unknown'

export interface ParsedIntent {
  intent:      CommandIntent
  confidence:  number           // 0–1
  entities:    Record<string, string | number | boolean | string[]>
  speak_text:  string           // immediate feedback to speak
  needs_confirm: boolean        // does this need user confirmation?
  raw_text:    string
}

export interface OpsCommand {
  id:          string
  userId:      string
  sessionId?:  string
  rawText:     string
  intent:      CommandIntent
  confidence:  number
  entities:    Record<string, unknown>
  handler:     string
  status:      CommandStatus
  result?:     unknown
  speakText?:  string
  error?:      string
  executionMs?: number
  source:      CommandSource
  createdAt:   string
}

// ── Memory ─────────────────────────────────────────────────────────────────────

export type MemoryType = 'fact' | 'preference' | 'context' | 'entity' | 'workflow' | 'contact'

export interface MemoryEntry {
  id:              string
  userId:          string
  type:            MemoryType
  key?:            string
  value:           string
  importance:      number   // 0–1
  accessCount:     number
  lastAccessedAt?: string
  expiresAt?:      string
  metadata:        Record<string, unknown>
  createdAt:       string
  updatedAt:       string
}

// ── Workflows ──────────────────────────────────────────────────────────────────

export type WorkflowTrigger = 'cron' | 'event' | 'manual' | 'voice' | 'webhook'
export type WorkflowStatus  = 'running' | 'completed' | 'failed' | 'cancelled'
export type StepType        = 'email' | 'command' | 'wait' | 'condition' | 'http' | 'memory'

export interface WorkflowStep {
  id:     string
  type:   StepType
  label:  string
  config: Record<string, unknown>
}

export interface Workflow {
  id:            string
  userId:        string
  name:          string
  description?:  string
  triggerType:   WorkflowTrigger
  triggerConfig: Record<string, unknown>
  steps:         WorkflowStep[]
  isActive:      boolean
  runCount:      number
  successCount:  number
  lastRunAt?:    string
  lastStatus?:   string
  tags:          string[]
  createdAt:     string
  updatedAt:     string
}

export interface WorkflowRun {
  id:          string
  workflowId:  string
  userId:      string
  status:      WorkflowStatus
  trigger?:    string
  input:       Record<string, unknown>
  output:      Record<string, unknown>
  stepResults: Array<{ stepId: string; status: string; output: unknown; durationMs: number }>
  error?:      string
  startedAt:   string
  completedAt?: string
  durationMs?: number
}

// ── Email ──────────────────────────────────────────────────────────────────────

export type EmailProvider = 'gmail' | 'outlook'

export interface EmailThread {
  id:             string
  userId:         string
  provider:       EmailProvider
  threadId:       string
  subject?:       string
  participants:   string[]
  snippet?:       string
  isRead:         boolean
  isImportant:    boolean
  labels:         string[]
  messageCount:   number
  aiSummary?:     string
  actionItems:    string[]
  sentiment?:     'positive' | 'neutral' | 'negative'
  lastMessageAt?: string
}

export interface ComposeEmailParams {
  to:      string | string[]
  subject: string
  body:    string
  cc?:     string[]
  bcc?:    string[]
}

// ── Tasks ──────────────────────────────────────────────────────────────────────

export type TaskStatus   = 'todo' | 'in_progress' | 'done' | 'cancelled'
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent'

export interface OpsTask {
  id:          string
  userId:      string
  title:       string
  description?: string
  status:      TaskStatus
  priority:    TaskPriority
  dueDate?:    string
  source:      'voice' | 'manual' | 'automation' | 'email'
  commandId?:  string
  tags:        string[]
  createdAt:   string
  updatedAt:   string
}

// ── Plugins ────────────────────────────────────────────────────────────────────

export type PluginCategory =
  | 'productivity' | 'communication' | 'intelligence' | 'automation' | 'kenuxa'
  | 'browser' | 'email' | 'ai' | 'data' | 'integration'  // extended categories

export interface PluginManifest {
  commands:       string[]
  triggers:       string[]
  settingsSchema: Record<string, unknown>
}

export interface Plugin {
  id:             string
  name:           string
  displayName?:   string
  description?:   string
  version:        string
  author?:        string
  category:       PluginCategory
  isBuiltIn:      boolean
  isActive:       boolean
  enabled?:       boolean           // UI alias for isActive
  manifest?:      PluginManifest
  permissions?:   string[]
  capabilities?:  string[]
  configSchema?:  Record<string, string>
}

export interface PluginSettings {
  pluginId:  string
  isEnabled: boolean
  settings:  Record<string, unknown>
}

// ── Integrations ───────────────────────────────────────────────────────────────

export type IntegrationType = 'gmail' | 'outlook' | 'calendar' | 'kenuxa_core' | 'slack' | 'notion'
export type IntegrationStatus = 'connected' | 'disconnected' | 'error' | 'pending'

export interface Integration {
  id:            string
  userId:        string
  type:          IntegrationType
  status:        IntegrationStatus
  displayName?:  string
  settings:      Record<string, unknown>
  scopes:        string[]
  lastSyncedAt?: string
  errorMessage?: string
}

// ── Activity ───────────────────────────────────────────────────────────────────

export interface ActivityEntry {
  id:          string
  userId:      string
  type:        string
  description: string
  icon?:       string
  metadata:    Record<string, unknown>
  createdAt:   string
}

// ── Queue System (Phase 3) ────────────────────────────────────────────────────

export type JobType =
  | 'execute_plan'      // full multi-step execution
  | 'execute_step'      // single step retry
  | 'browser_task'      // delegated to external Playwright worker
  | 'email_task'        // email operation
  | 'workflow_run'      // trigger a saved workflow
  | 'memory_task'       // memory read/write
  | 'health_check'      // probe system health
  | 'cron_workflow'     // scheduled workflow trigger

export type JobStatus = 'queued' | 'processing' | 'completed' | 'failed' | 'retrying' | 'dead'

export interface QueueJob {
  id:          string
  type:        JobType
  payload:     Record<string, unknown>
  userId:      string
  orgId?:      string
  status:      JobStatus
  retries:     number
  maxRetries:  number
  error?:      string
  result?:     unknown
  createdAt:   string
  scheduledAt: string        // when to process (ISO)
  processedAt?: string
  completedAt?: string
}

export interface QueueStats {
  queued:     number
  processing: number
  failed:     number
  dead:       number
  processed:  number         // total processed (rolling 24h)
  latencyMs:  number         // avg processing time
}

// ── DAG Workflow Engine (Phase 3) ──────────────────────────────────────────────

export interface DagNode {
  id:          string        // matches ExecStep.id
  stepType:    ExecStepType
  label:       string
  tool:        string
  input:       Record<string, unknown>
  dependsOn:   string[]      // ids of nodes whose output this needs
  status:      ExecStepStatus
  output?:     unknown
  error?:      string
  startedAt?:  string
  completedAt?: string
  durationMs?: number
}

export interface DagGraph {
  id:          string
  planId:      string
  userId:      string
  nodes:       DagNode[]
  status:      ExecPlanStatus
  startedAt:   string
  completedAt?: string
  result?:     unknown
}

// ── System Health (Phase 3) ────────────────────────────────────────────────────

export type ServiceStatus = 'online' | 'degraded' | 'offline' | 'unknown'

export interface ServiceHealth {
  name:       string
  status:     ServiceStatus
  latencyMs?: number
  message?:   string
  checkedAt:  string
}

export interface SystemHealth {
  overall:    ServiceStatus
  services:   ServiceHealth[]
  queueStats: QueueStats
  checkedAt:  string
}

// ── CORE Auth Context (Phase 3) ───────────────────────────────────────────────

export interface CoreUserContext {
  userId:   string
  email:    string
  name?:    string
  orgId?:   string
  orgName?: string
  roles:    string[]
  permissions: string[]
}

// ── Multi-Agent System (Phase 4) ──────────────────────────────────────────────

export type AgentType =
  | 'planner'        // builds execution DAG, selects tools
  | 'browser'        // controls Playwright worker
  | 'communication'  // Outlook / email / messaging
  | 'memory'         // Supabase reads/writes
  | 'optimization'   // workflow efficiency & learning

export type AgentStatus = 'idle' | 'running' | 'completed' | 'failed' | 'offline'

export interface AgentTask {
  id:        string
  agentType: AgentType
  action:    string
  payload:   Record<string, unknown>
  userId:    string
  planId?:   string
  stepId?:   string
}

export interface AgentResult {
  agentType:  AgentType
  taskId:     string
  success:    boolean
  output?:    unknown
  error?:     string
  durationMs: number
  metadata?:  Record<string, unknown>
}

export interface AgentEvent {
  type:       'agent_start' | 'agent_complete' | 'agent_failed' | 'agent_log'
  agentType:  AgentType
  taskId:     string
  planId?:    string
  message?:   string
  data?:      unknown
  timestamp:  string
}

export interface AgentState {
  type:       AgentType
  status:     AgentStatus
  currentTask?: string
  lastRunAt?:   string
  tasksRun:     number
  errors:       number
}

// ── Microsoft Graph / Outlook (Phase 4) ───────────────────────────────────────

export interface OutlookMessage {
  id:          string
  subject:     string
  from:        string
  to:          string[]
  bodyPreview: string
  body?:       string
  receivedAt:  string
  isRead:      boolean
  importance:  'low' | 'normal' | 'high'
  hasAttachments: boolean
}

export interface OutlookSendPayload {
  to:       string | string[]
  subject:  string
  body:     string
  cc?:      string | string[]
  bcc?:     string | string[]
  isHtml?:  boolean
}

// ── Execution Pipeline (Phase 2) ──────────────────────────────────────────────

export type ExecStepStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped'

export type ExecStepType =
  | 'intent_analysis'
  | 'task_decomposition'
  | 'web_search'
  | 'browser_open'
  | 'browser_click'
  | 'browser_extract'
  | 'browser_screenshot'
  | 'email_read'
  | 'email_send'
  | 'email_draft'
  | 'desktop_open'
  | 'desktop_screenshot'
  | 'desktop_control'
  | 'memory_read'
  | 'memory_write'
  | 'ai_process'
  | 'workflow_run'
  | 'http_request'
  | 'kenuxa_query'
  | 'result_verify'
  | 'speak'
  | 'wait'

export interface ExecStep {
  id:           string
  index:        number
  type:         ExecStepType
  label:        string
  tool:         string            // e.g. 'playwright', 'groq', 'gmail', 'memory'
  input:        Record<string, unknown>
  output?:      unknown
  status:       ExecStepStatus
  error?:       string
  startedAt?:   string
  completedAt?: string
  durationMs?:  number
}

export type ExecPlanStatus = 'planning' | 'executing' | 'completed' | 'failed' | 'cancelled'

export interface ExecPlan {
  id:           string
  userId:       string
  goal:         string
  rawText:      string
  steps:        ExecStep[]
  status:       ExecPlanStatus
  currentStep:  number
  startedAt:    string
  completedAt?: string
  durationMs?:  number
  result?:      unknown
  error?:       string
  source:       CommandSource
}

export interface ExecEvent {
  type:      'plan_created' | 'step_start' | 'step_complete' | 'step_failed' | 'plan_complete' | 'plan_failed' | 'log'
  planId:    string
  stepId?:   string
  data?:     unknown
  message?:  string
  timestamp: string
}

// ── WebSocket Events ───────────────────────────────────────────────────────────

export type WsEventType =
  | 'voice:state_change'
  | 'voice:transcript'
  | 'voice:command_result'
  | 'command:executing'
  | 'command:complete'
  | 'workflow:started'
  | 'workflow:step_complete'
  | 'workflow:complete'
  | 'memory:updated'
  | 'error'

export interface WsEvent<T = unknown> {
  type:      WsEventType
  payload:   T
  timestamp: string
  sessionId?: string
}

// ── Store (Zustand) ────────────────────────────────────────────────────────────

export interface OpsStoreState {
  // Voice
  voiceState:        VoiceState
  wakeWordState:     WakeWordState
  transcript:        string
  interimTranscript: string
  sessionId:         string | null
  commandHistory:    OpsCommand[]

  // Phase 5.2 — Operational runtime
  operationalStatus:  OperationalStatus
  activeVoiceSession: ActiveVoiceSession | null
  bridgeConnected:    boolean

  // Execution pipeline (Phase 2)
  executions:       ExecPlan[]
  activeExecution:  ExecPlan | null

  // UI
  sidebarOpen:      boolean
  activeView:       string

  // Data
  recentTasks:      OpsTask[]
  activeWorkflows:  Workflow[]
  plugins:          Plugin[]
  integrations:     Integration[]

  // Actions
  setVoiceState:       (s: VoiceState) => void
  setTranscript:       (t: string) => void
  setInterim:          (t: string) => void
  addCommand:          (c: OpsCommand) => void
  setSidebar:          (open: boolean) => void
  setActiveView:       (v: string) => void
  addExecution:        (p: ExecPlan) => void
  updateExecution:     (id: string, patch: Partial<ExecPlan>) => void
  updateExecStep:      (planId: string, stepId: string, patch: Partial<ExecStep>) => void
  setActiveExecution:  (p: ExecPlan | null) => void

  // Phase 5.2 actions
  setOperationalStatus: (s: OperationalStatus) => void
  startVoiceSession:    (session: ActiveVoiceSession) => void
  endVoiceSession:      () => void
  updateSessionEntity:  (key: string, value: string) => void
  updateBrowserContext: (ctx: { url?: string; title?: string }) => void
  setBridgeConnected:   (connected: boolean) => void
  setPendingAction:     (action: ActiveVoiceSession['pendingAction']) => void
}

// ── Phase 6: Device Registry (Desktop Agent Auto-Pairing) ─────────────────────

export type DeviceStatus   = 'active' | 'offline' | 'degraded' | 'unsynced'
export type DevicePlatform = 'windows' | 'macos' | 'linux'

export interface OpsDevice {
  id:           string
  userId:       string
  name:         string
  platform:     DevicePlatform
  version:      string
  status:       DeviceStatus
  capabilities: string[]         // e.g. ['browser', 'filesystem', 'voice', 'playwright']
  ipAddress?:   string
  lastSeenAt:   string
  pairedAt:     string
  fingerprint:  string           // hardware fingerprint for identity verification
}

export interface DevicePairRequest {
  deviceId:     string
  name:         string
  platform:     DevicePlatform
  version:      string
  capabilities: string[]
  fingerprint:  string
  ipAddress?:   string
}

export interface DevicePairResponse {
  success:      boolean
  device?:      OpsDevice
  sessionToken?: string
  error?:       string
}

export interface DeviceHeartbeatResponse {
  alive:         boolean
  pendingCommands?: BridgeCommand[]
  error?:        string
}
