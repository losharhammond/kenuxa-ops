/**
 * KENUXA OPS — Premium Command Center Dashboard
 *
 * A LitElement web component that renders the main OPS control panel:
 *   • Animated system status strip (voice state, gateway, agent count)
 *   • Live execution stream feed
 *   • Agent roster panel with connection indicators
 *   • Voice wave visualizer
 *   • Quick-action command bar
 *
 * Usage:
 *   <kenuxa-ops-dashboard .status=${...} .executions=${...} />
 */

import { LitElement, css, html } from "lit";
import { property, state } from "lit/decorators.js";

// ─── Types ────────────────────────────────────────────────────────────────────

export type VoiceState =
  | "SLEEPING" | "ACTIVATING" | "LISTENING"
  | "PROCESSING" | "EXECUTING" | "FOLLOWUP_WAIT" | "IDLE_TIMEOUT";

export interface AgentStatus {
  id: string;
  name: string;
  channel: string;
  online: boolean;
  lastSeen?: Date;
  tasksCompleted?: number;
}

export interface ExecutionEntry {
  id: string;
  timestamp: Date;
  command: string;
  status: "pending" | "running" | "done" | "error";
  result?: string;
  durationMs?: number;
}

export interface SystemStatus {
  gatewayConnected: boolean;
  agentCount: number;
  voiceState: VoiceState;
  uptime: number; // seconds
  tasksToday: number;
  errorCount: number;
}

// ─── Component ────────────────────────────────────────────────────────────────

export class KenuxaOpsDashboard extends LitElement {
  @property({ type: Object }) status: SystemStatus = {
    gatewayConnected: false,
    agentCount: 0,
    voiceState: "SLEEPING",
    uptime: 0,
    tasksToday: 0,
    errorCount: 0,
  };

  @property({ type: Array }) agents: AgentStatus[] = [];
  @property({ type: Array }) executions: ExecutionEntry[] = [];

  @state() private _commandDraft = "";
  @state() private _voiceAnimFrame = 0;

  private _voiceAnimInterval: ReturnType<typeof setInterval> | null = null;

  override connectedCallback() {
    super.connectedCallback();
    this._voiceAnimInterval = setInterval(() => {
      this._voiceAnimFrame = (this._voiceAnimFrame + 1) % 60;
    }, 80);
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    if (this._voiceAnimInterval) {
      clearInterval(this._voiceAnimInterval);
    }
  }

  override render() {
    return html`
      <div class="dashboard">
        ${this._renderStatusStrip()}
        <div class="dashboard__body">
          ${this._renderVoicePanel()}
          ${this._renderExecutionFeed()}
          ${this._renderAgentsPanel()}
        </div>
        ${this._renderCommandBar()}
      </div>
    `;
  }

  // ── Status strip ───────────────────────────────────────────────────────────

  private _renderStatusStrip() {
    const s = this.status;
    const gatewayClass = s.gatewayConnected ? "pill pill--ok" : "pill pill--warn";
    const voiceClass   = s.voiceState === "SLEEPING" ? "pill pill--muted"
                       : s.voiceState === "LISTENING" ? "pill pill--accent pill--pulse"
                       : s.voiceState === "EXECUTING" ? "pill pill--accent"
                       : "pill pill--secondary";

    return html`
      <header class="status-strip">
        <div class="status-strip__brand">
          <span class="brand-icon">◈</span>
          <span class="brand-name">KENUXA <strong>OPS</strong></span>
        </div>

        <div class="status-strip__pills">
          <span class="${gatewayClass}">
            <span class="pill__dot"></span>
            Gateway ${s.gatewayConnected ? "Connected" : "Offline"}
          </span>
          <span class="${voiceClass}">
            <span class="pill__dot"></span>
            Voice ${this._voiceStateLabel(s.voiceState)}
          </span>
          <span class="pill pill--neutral">
            ${s.agentCount} agent${s.agentCount !== 1 ? "s" : ""}
          </span>
          <span class="pill pill--neutral">
            ${s.tasksToday} tasks today
          </span>
        </div>

        <div class="status-strip__uptime">
          ${this._formatUptime(s.uptime)}
        </div>
      </header>
    `;
  }

  // ── Voice panel ────────────────────────────────────────────────────────────

  private _renderVoicePanel() {
    const isActive  = this.status.voiceState !== "SLEEPING" &&
                      this.status.voiceState !== "IDLE_TIMEOUT";
    const isListen  = this.status.voiceState === "LISTENING";
    const isProcess = this.status.voiceState === "PROCESSING" ||
                      this.status.voiceState === "EXECUTING";

    return html`
      <section class="voice-panel panel ${isActive ? "panel--active" : ""}">
        <div class="panel__header">
          <span class="panel__title">Voice Runtime</span>
          <span class="voice-state-badge state-${this.status.voiceState.toLowerCase()}">
            ${this.status.voiceState}
          </span>
        </div>
        <div class="voice-visualizer ${isListen ? "voice-visualizer--listening" : ""}">
          ${this._renderWaveBars(isActive, isListen)}
        </div>
        ${isProcess ? html`
          <div class="voice-processing">
            <span class="spinner"></span>
            <span>${this.status.voiceState === "EXECUTING" ? "Executing…" : "Processing…"}</span>
          </div>
        ` : ""}
        <div class="voice-hint">
          ${this._voiceHintText(this.status.voiceState)}
        </div>
      </section>
    `;
  }

  private _renderWaveBars(active: boolean, listening: boolean) {
    const bars = Array.from({ length: 20 }, (_, i) => {
      const phase = (i / 20) * Math.PI * 2;
      const base  = active ? 0.3 : 0.08;
      const amp   = listening ? 0.7 : 0.2;
      const h     = base + amp * Math.abs(Math.sin(phase + this._voiceAnimFrame * 0.18));
      return html`<div class="wave-bar" style="height: ${Math.round(h * 48)}px"></div>`;
    });
    return html`<div class="wave-bars">${bars}</div>`;
  }

  // ── Execution feed ─────────────────────────────────────────────────────────

  private _renderExecutionFeed() {
    const recent = [...this.executions].reverse().slice(0, 12);
    return html`
      <section class="exec-feed panel">
        <div class="panel__header">
          <span class="panel__title">Execution Stream</span>
          <span class="panel__badge">${this.executions.length}</span>
        </div>
        <div class="exec-list">
          ${recent.length === 0
            ? html`<div class="exec-empty">No executions yet — say "Hey KENUXA" to begin.</div>`
            : recent.map((e) => this._renderExecEntry(e))
          }
        </div>
      </section>
    `;
  }

  private _renderExecEntry(entry: ExecutionEntry) {
    const statusIcon = entry.status === "done"    ? "✓"
                     : entry.status === "error"   ? "✗"
                     : entry.status === "running" ? "⟳"
                     : "·";
    const ts = entry.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    return html`
      <div class="exec-entry exec-entry--${entry.status}">
        <span class="exec-icon">${statusIcon}</span>
        <span class="exec-time">${ts}</span>
        <span class="exec-command">${entry.command}</span>
        ${entry.durationMs !== undefined
          ? html`<span class="exec-duration">${entry.durationMs}ms</span>`
          : ""
        }
        ${entry.result
          ? html`<span class="exec-result">${entry.result}</span>`
          : ""
        }
      </div>
    `;
  }

  // ── Agents panel ───────────────────────────────────────────────────────────

  private _renderAgentsPanel() {
    return html`
      <section class="agents-panel panel">
        <div class="panel__header">
          <span class="panel__title">Active Agents</span>
          <span class="panel__badge">${this.agents.filter((a) => a.online).length} online</span>
        </div>
        <div class="agent-list">
          ${this.agents.length === 0
            ? html`<div class="agent-empty">No agents connected</div>`
            : this.agents.map((a) => this._renderAgentRow(a))
          }
        </div>
      </section>
    `;
  }

  private _renderAgentRow(agent: AgentStatus) {
    return html`
      <div class="agent-row ${agent.online ? "agent-row--online" : "agent-row--offline"}">
        <span class="agent-dot"></span>
        <span class="agent-name">${agent.name}</span>
        <span class="agent-channel">${agent.channel}</span>
        ${agent.tasksCompleted !== undefined
          ? html`<span class="agent-tasks">${agent.tasksCompleted} tasks</span>`
          : ""
        }
      </div>
    `;
  }

  // ── Command bar ────────────────────────────────────────────────────────────

  private _renderCommandBar() {
    return html`
      <footer class="command-bar">
        <span class="command-bar__prompt">⌥</span>
        <input
          class="command-bar__input"
          type="text"
          placeholder="Type a command or ask anything…"
          .value=${this._commandDraft}
          @input=${(e: InputEvent) => {
            this._commandDraft = (e.target as HTMLInputElement).value;
          }}
          @keydown=${(e: KeyboardEvent) => {
            if (e.key === "Enter" && this._commandDraft.trim()) {
              this._dispatchCommand(this._commandDraft.trim());
              this._commandDraft = "";
            }
          }}
        />
        <button
          class="command-bar__send"
          ?disabled=${!this._commandDraft.trim()}
          @click=${() => {
            if (this._commandDraft.trim()) {
              this._dispatchCommand(this._commandDraft.trim());
              this._commandDraft = "";
            }
          }}
        >
          ↵
        </button>
      </footer>
    `;
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  private _dispatchCommand(command: string) {
    this.dispatchEvent(new CustomEvent("kenuxa-command", {
      detail: { command },
      bubbles: true,
      composed: true,
    }));
  }

  private _voiceStateLabel(s: VoiceState): string {
    const map: Record<VoiceState, string> = {
      SLEEPING:     "Sleeping",
      ACTIVATING:   "Waking",
      LISTENING:    "Listening",
      PROCESSING:   "Processing",
      EXECUTING:    "Executing",
      FOLLOWUP_WAIT: "Follow-up",
      IDLE_TIMEOUT:  "Idle",
    };
    return map[s] ?? s;
  }

  private _voiceHintText(s: VoiceState): string {
    const map: Record<VoiceState, string> = {
      SLEEPING:      'Say "Hey KENUXA" or press the mic button to wake.',
      ACTIVATING:    "Waking up…",
      LISTENING:     "Listening — speak your command.",
      PROCESSING:    "Understanding your request…",
      EXECUTING:     "Running…",
      FOLLOWUP_WAIT: "Done. Say another command or stay quiet to sleep.",
      IDLE_TIMEOUT:  "Going to sleep soon…",
    };
    return map[s] ?? "";
  }

  private _formatUptime(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}h ${m}m uptime`;
    if (m > 0) return `${m}m ${s}s uptime`;
    return `${s}s uptime`;
  }

  // ── Styles ────────────────────────────────────────────────────────────────

  static override styles = css`
    :host {
      display: flex;
      flex-direction: column;
      height: 100%;
      font-family: var(--font-body, "Inter", system-ui, sans-serif);
      background: var(--bg, #080910);
      color: var(--text, #c8c8d4);
    }

    /* ── Status strip ─────────────────────────────────────────────────────── */
    .status-strip {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 12px 20px;
      background: var(--chrome, rgba(8, 9, 16, 0.96));
      border-bottom: 1px solid var(--border, #1a1c28);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
    }

    .status-strip__brand {
      display: flex;
      align-items: center;
      gap: 8px;
      color: var(--text-strong, #f0f0f4);
      font-size: 15px;
      letter-spacing: -0.02em;
      flex-shrink: 0;
    }

    .brand-icon {
      color: var(--accent, #6366f1);
      font-size: 18px;
    }

    .brand-name strong {
      color: var(--accent, #6366f1);
    }

    .status-strip__pills {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      flex: 1;
    }

    .status-strip__uptime {
      font-size: 11px;
      color: var(--muted, #707080);
      flex-shrink: 0;
      font-variant-numeric: tabular-nums;
    }

    .pill {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 3px 9px;
      border-radius: 9999px;
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.02em;
      border: 1px solid transparent;
    }

    .pill__dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: currentColor;
    }

    .pill--ok       { color: var(--ok, #22c55e); border-color: rgba(34,197,94,0.25); background: rgba(34,197,94,0.08); }
    .pill--warn     { color: var(--warn, #f59e0b); border-color: rgba(245,158,11,0.25); background: rgba(245,158,11,0.08); }
    .pill--accent   { color: var(--accent, #6366f1); border-color: var(--accent-subtle, rgba(99,102,241,0.25)); background: var(--accent-subtle, rgba(99,102,241,0.1)); }
    .pill--secondary{ color: var(--muted, #707080); border-color: var(--border, #1a1c28); background: var(--card, #0f1119); }
    .pill--neutral  { color: var(--muted-strong, #606070); border-color: var(--border, #1a1c28); background: transparent; }
    .pill--muted    { color: var(--muted, #707080); border-color: var(--border, #1a1c28); background: transparent; }

    .pill--pulse .pill__dot {
      animation: pulse-dot 1.2s ease-in-out infinite;
    }

    @keyframes pulse-dot {
      0%, 100% { opacity: 1; transform: scale(1); }
      50%       { opacity: 0.4; transform: scale(0.7); }
    }

    /* ── Dashboard body ───────────────────────────────────────────────────── */
    .dashboard {
      display: flex;
      flex-direction: column;
      height: 100%;
      overflow: hidden;
    }

    .dashboard__body {
      display: grid;
      grid-template-columns: 240px 1fr 220px;
      gap: 1px;
      flex: 1;
      overflow: hidden;
      background: var(--border, #1a1c28);
    }

    @media (max-width: 900px) {
      .dashboard__body {
        grid-template-columns: 1fr;
        overflow-y: auto;
      }
    }

    /* ── Panel base ───────────────────────────────────────────────────────── */
    .panel {
      display: flex;
      flex-direction: column;
      background: var(--bg, #080910);
      overflow: hidden;
    }

    .panel--active {
      background: var(--bg-accent, #0d0f18);
    }

    .panel__header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 16px 10px;
      border-bottom: 1px solid var(--border, #1a1c28);
      flex-shrink: 0;
    }

    .panel__title {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.07em;
      text-transform: uppercase;
      color: var(--muted, #707080);
    }

    .panel__badge {
      font-size: 11px;
      font-weight: 600;
      color: var(--accent, #6366f1);
      background: var(--accent-subtle, rgba(99,102,241,0.1));
      padding: 2px 7px;
      border-radius: 9999px;
    }

    /* ── Voice panel ──────────────────────────────────────────────────────── */
    .voice-panel { align-items: stretch; }

    .voice-state-badge {
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      padding: 2px 7px;
      border-radius: 4px;
    }

    .state-sleeping, .state-idle_timeout {
      color: var(--muted, #707080);
      background: var(--bg-muted, #181b28);
    }
    .state-activating, .state-followup_wait {
      color: var(--accent-2, #a78bfa);
      background: rgba(167,139,250,0.1);
    }
    .state-listening {
      color: var(--ok, #22c55e);
      background: var(--ok-subtle, rgba(34,197,94,0.08));
    }
    .state-processing {
      color: var(--warn, #f59e0b);
      background: var(--warn-subtle, rgba(245,158,11,0.08));
    }
    .state-executing {
      color: var(--accent, #6366f1);
      background: var(--accent-subtle, rgba(99,102,241,0.1));
    }

    .voice-visualizer {
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 20px 16px;
      flex: 1;
      min-height: 80px;
    }

    .wave-bars {
      display: flex;
      align-items: center;
      gap: 3px;
      height: 56px;
    }

    .wave-bar {
      width: 3px;
      border-radius: 9999px;
      background: var(--accent, #6366f1);
      opacity: 0.6;
      transition: height 80ms ease-out;
      min-height: 4px;
    }

    .voice-visualizer--listening .wave-bar {
      opacity: 0.9;
    }

    .voice-processing {
      display: flex;
      align-items: center;
      gap: 8px;
      justify-content: center;
      padding: 8px;
      font-size: 12px;
      color: var(--accent, #6366f1);
    }

    .spinner {
      display: inline-block;
      width: 14px;
      height: 14px;
      border: 2px solid var(--accent-subtle, rgba(99,102,241,0.25));
      border-top-color: var(--accent, #6366f1);
      border-radius: 50%;
      animation: spin 0.7s linear infinite;
    }

    @keyframes spin { to { transform: rotate(360deg); } }

    .voice-hint {
      padding: 10px 16px 14px;
      font-size: 11px;
      color: var(--muted, #707080);
      line-height: 1.5;
      text-align: center;
      border-top: 1px solid var(--border, #1a1c28);
    }

    /* ── Execution feed ───────────────────────────────────────────────────── */
    .exec-feed { flex: 1; }

    .exec-list {
      flex: 1;
      overflow-y: auto;
      padding: 8px 0;
    }

    .exec-empty {
      padding: 32px 20px;
      text-align: center;
      color: var(--muted, #707080);
      font-size: 12px;
      line-height: 1.6;
    }

    .exec-entry {
      display: grid;
      grid-template-columns: 18px 56px 1fr auto;
      align-items: baseline;
      gap: 8px;
      padding: 6px 16px;
      font-size: 12px;
      border-left: 2px solid transparent;
      transition: background 120ms;
    }

    .exec-entry:hover { background: var(--bg-hover, #181b28); }

    .exec-entry--done    { border-left-color: var(--ok, #22c55e); }
    .exec-entry--error   { border-left-color: var(--destructive, #ef4444); }
    .exec-entry--running { border-left-color: var(--accent, #6366f1); }
    .exec-entry--pending { border-left-color: var(--border-strong, #262840); }

    .exec-icon  { text-align: center; font-size: 11px; }
    .exec-time  { color: var(--muted, #707080); font-variant-numeric: tabular-nums; font-size: 10px; }
    .exec-command { color: var(--text-strong, #f0f0f4); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .exec-duration { color: var(--muted, #707080); font-size: 10px; font-variant-numeric: tabular-nums; flex-shrink: 0; }
    .exec-result { grid-column: 2 / -1; color: var(--muted-strong, #606070); font-size: 11px; }

    /* ── Agents panel ─────────────────────────────────────────────────────── */
    .agent-list { flex: 1; overflow-y: auto; padding: 8px 0; }

    .agent-empty {
      padding: 24px 16px;
      color: var(--muted, #707080);
      font-size: 11px;
      text-align: center;
    }

    .agent-row {
      display: grid;
      grid-template-columns: 8px 1fr auto auto;
      align-items: center;
      gap: 8px;
      padding: 6px 14px;
      font-size: 11px;
      transition: background 120ms;
    }

    .agent-row:hover { background: var(--bg-hover, #181b28); }

    .agent-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--muted, #707080);
    }

    .agent-row--online .agent-dot {
      background: var(--ok, #22c55e);
      box-shadow: 0 0 6px rgba(34,197,94,0.4);
    }

    .agent-name    { color: var(--text, #c8c8d4); font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .agent-channel { color: var(--muted, #707080); font-size: 10px; }
    .agent-tasks   { color: var(--accent, #6366f1); font-size: 10px; font-variant-numeric: tabular-nums; }

    /* ── Command bar ──────────────────────────────────────────────────────── */
    .command-bar {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 16px;
      background: var(--chrome, rgba(8,9,16,0.96));
      border-top: 1px solid var(--border, #1a1c28);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
    }

    .command-bar__prompt {
      color: var(--accent, #6366f1);
      font-size: 15px;
      flex-shrink: 0;
    }

    .command-bar__input {
      flex: 1;
      background: var(--bg-elevated, #121420);
      border: 1px solid var(--border, #1a1c28);
      border-radius: var(--radius-md, 10px);
      padding: 8px 14px;
      font-size: 13px;
      color: var(--text-strong, #f0f0f4);
      outline: none;
      transition: border-color 150ms, box-shadow 150ms;
    }

    .command-bar__input:focus {
      border-color: var(--accent, #6366f1);
      box-shadow: 0 0 0 3px var(--accent-subtle, rgba(99,102,241,0.12));
    }

    .command-bar__input::placeholder { color: var(--muted, #707080); }

    .command-bar__send {
      width: 36px;
      height: 36px;
      border-radius: var(--radius-md, 10px);
      border: none;
      background: var(--accent, #6366f1);
      color: #fff;
      font-size: 16px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 150ms, transform 80ms;
      flex-shrink: 0;
    }

    .command-bar__send:hover:not(:disabled) {
      background: var(--accent-hover, #818cf8);
    }

    .command-bar__send:active:not(:disabled) {
      transform: scale(0.94);
    }

    .command-bar__send:disabled {
      background: var(--bg-muted, #181b28);
      color: var(--muted, #707080);
      cursor: not-allowed;
    }
  `;
}

if (!customElements.get("kenuxa-ops-dashboard")) {
  customElements.define("kenuxa-ops-dashboard", KenuxaOpsDashboard);
}

declare global {
  interface HTMLElementTagNameMap {
    "kenuxa-ops-dashboard": KenuxaOpsDashboard;
  }
}
