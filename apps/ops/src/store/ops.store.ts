import { create }   from 'zustand'
import { devtools } from 'zustand/middleware'
import type {
  OpsStoreState, VoiceState, OpsCommand, OpsTask, Workflow,
  Plugin, Integration, ExecPlan, ExecStep,
  OperationalStatus, ActiveVoiceSession,
} from '@/types/ops'

export const useOpsStore = create<OpsStoreState>()(
  devtools(
    (set) => ({
      // ── Voice ─────────────────────────────────────────────────────────────────
      voiceState:        'idle',
      wakeWordState:     'inactive',
      transcript:        '',
      interimTranscript: '',
      sessionId:         null,
      commandHistory:    [],

      // ── Phase 5.2: Operational runtime ────────────────────────────────────────
      operationalStatus:  'sleeping',
      activeVoiceSession: null,
      bridgeConnected:    false,

      // ── Execution pipeline ─────────────────────────────────────────────────────
      executions:      [],
      activeExecution: null,

      // ── UI ────────────────────────────────────────────────────────────────────
      sidebarOpen: true,
      activeView:  'dashboard',

      // ── Data ──────────────────────────────────────────────────────────────────
      recentTasks:     [],
      activeWorkflows: [],
      plugins:         [],
      integrations:    [],

      // ── Voice actions ──────────────────────────────────────────────────────────
      setVoiceState: (voiceState: VoiceState) => set({ voiceState }),

      setTranscript: (transcript: string) => set({ transcript }),

      setInterim: (interimTranscript: string) => set({ interimTranscript }),

      addCommand: (command: OpsCommand) =>
        set(state => ({
          commandHistory: [command, ...state.commandHistory].slice(0, 50),
        })),

      // ── UI actions ─────────────────────────────────────────────────────────────
      setSidebar:    (sidebarOpen: boolean) => set({ sidebarOpen }),
      setActiveView: (activeView: string)   => set({ activeView }),

      // ── Execution actions ──────────────────────────────────────────────────────
      addExecution: (plan: ExecPlan) =>
        set(state => ({
          executions:      [plan, ...state.executions].slice(0, 20),
          activeExecution: plan,
        })),

      updateExecution: (id: string, patch: Partial<ExecPlan>) =>
        set(state => ({
          executions: state.executions.map(p => p.id === id ? { ...p, ...patch } : p),
          activeExecution:
            state.activeExecution?.id === id
              ? { ...state.activeExecution, ...patch }
              : state.activeExecution,
        })),

      updateExecStep: (planId: string, stepId: string, patch: Partial<ExecStep>) =>
        set(state => {
          const update = (p: ExecPlan) =>
            p.id !== planId ? p : {
              ...p,
              steps: p.steps.map(s => s.id === stepId ? { ...s, ...patch } : s),
            }
          return {
            executions:      state.executions.map(update),
            activeExecution: state.activeExecution
              ? update(state.activeExecution)
              : null,
          }
        }),

      setActiveExecution: (activeExecution: ExecPlan | null) => set({ activeExecution }),

      // ── Phase 5.2 actions ──────────────────────────────────────────────────────

      setOperationalStatus: (operationalStatus: OperationalStatus) =>
        set({ operationalStatus }),

      startVoiceSession: (session: ActiveVoiceSession) =>
        set({ activeVoiceSession: session, operationalStatus: 'listening' }),

      endVoiceSession: () =>
        set({ activeVoiceSession: null, operationalStatus: 'sleeping' }),

      updateSessionEntity: (key: string, value: string) =>
        set(state => ({
          activeVoiceSession: state.activeVoiceSession
            ? {
                ...state.activeVoiceSession,
                entities: { ...state.activeVoiceSession.entities, [key]: value },
                lastCommandAt: new Date().toISOString(),
                commandCount:  state.activeVoiceSession.commandCount + 1,
              }
            : null,
        })),

      updateBrowserContext: (ctx: { url?: string; title?: string }) =>
        set(state => ({
          activeVoiceSession: state.activeVoiceSession
            ? {
                ...state.activeVoiceSession,
                browserContext: { ...state.activeVoiceSession.browserContext, ...ctx },
              }
            : null,
        })),

      setBridgeConnected: (bridgeConnected: boolean) => set({ bridgeConnected }),

      setPendingAction: (pendingAction: ActiveVoiceSession['pendingAction']) =>
        set(state => ({
          activeVoiceSession: state.activeVoiceSession
            ? { ...state.activeVoiceSession, pendingAction }
            : null,
        })),
    }),
    { name: 'kenuxa-ops' }
  )
)
