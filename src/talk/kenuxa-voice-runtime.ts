/**
 * KENUXA OPS Persistent Voice Runtime
 *
 * Implements the full voice state machine:
 *   SLEEPING → ACTIVATING → LISTENING → PROCESSING → EXECUTING → FOLLOWUP_WAIT → IDLE_TIMEOUT → SLEEPING
 *
 * Key design goals:
 *  - Survives across sessions (state is externally observable)
 *  - Idle timeout resets to SLEEPING without full teardown
 *  - FOLLOWUP_WAIT lets the user chain commands without re-waking
 *  - All transitions emit typed events for UI and telemetry
 */

// ─── State ────────────────────────────────────────────────────────────────────

export type VoiceRuntimeState =
  | "SLEEPING"
  | "ACTIVATING"
  | "LISTENING"
  | "PROCESSING"
  | "EXECUTING"
  | "FOLLOWUP_WAIT"
  | "IDLE_TIMEOUT";

// ─── Events ───────────────────────────────────────────────────────────────────

export type VoiceRuntimeEventType =
  | "state:changed"
  | "wake:detected"
  | "speech:start"
  | "speech:end"
  | "transcript:ready"
  | "execution:start"
  | "execution:complete"
  | "execution:error"
  | "followup:prompt"
  | "idle:timeout"
  | "sleep:enter";

export interface VoiceRuntimeEvent {
  type: VoiceRuntimeEventType;
  state: VoiceRuntimeState;
  prevState?: VoiceRuntimeState;
  timestamp: Date;
  payload?: unknown;
}

export type VoiceRuntimeListener = (event: VoiceRuntimeEvent) => void;

// ─── Config ───────────────────────────────────────────────────────────────────

export interface VoiceRuntimeConfig {
  /** Milliseconds of silence before transitioning LISTENING → PROCESSING. Default: 1200 */
  silenceTimeoutMs?: number;
  /** Milliseconds in FOLLOWUP_WAIT before going IDLE_TIMEOUT. Default: 8000 */
  followupWindowMs?: number;
  /** Milliseconds in IDLE_TIMEOUT before going SLEEPING. Default: 30000 */
  idleTimeoutMs?: number;
  /** Wake phrase(s) to detect while SLEEPING. Matched case-insensitively. */
  wakePhrases?: string[];
  /** Called when the runtime wants to actually execute a command. */
  onExecute?: (transcript: string) => Promise<void>;
  /** Called on every state transition. */
  onStateChange?: (state: VoiceRuntimeState, prev: VoiceRuntimeState) => void;
}

// ─── Runtime ──────────────────────────────────────────────────────────────────

export class KenuxaVoiceRuntime {
  private _state: VoiceRuntimeState = "SLEEPING";
  private readonly _listeners = new Set<VoiceRuntimeListener>();
  private _silenceTimer: ReturnType<typeof setTimeout> | null = null;
  private _followupTimer: ReturnType<typeof setTimeout> | null = null;
  private _idleTimer: ReturnType<typeof setTimeout> | null = null;
  private _pendingTranscript = "";

  readonly config: Required<VoiceRuntimeConfig>;

  constructor(config: VoiceRuntimeConfig = {}) {
    this.config = {
      silenceTimeoutMs: config.silenceTimeoutMs ?? 1200,
      followupWindowMs: config.followupWindowMs ?? 8000,
      idleTimeoutMs: config.idleTimeoutMs ?? 30_000,
      wakePhrases: config.wakePhrases ?? ["hey kenuxa", "kenuxa", "ok kenuxa"],
      onExecute: config.onExecute ?? (() => Promise.resolve()),
      onStateChange: config.onStateChange ?? (() => undefined),
    };
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  get state(): VoiceRuntimeState {
    return this._state;
  }

  get isActive(): boolean {
    return this._state !== "SLEEPING" && this._state !== "IDLE_TIMEOUT";
  }

  /** Register a listener for all runtime events. Returns unsubscribe fn. */
  on(listener: VoiceRuntimeListener): () => void {
    this._listeners.add(listener);
    return () => this._listeners.delete(listener);
  }

  /**
   * Feed a raw transcript fragment to the runtime.
   * When SLEEPING, checks for wake phrase.
   * When LISTENING, accumulates text and resets silence timer.
   * When FOLLOWUP_WAIT, triggers a new listen cycle.
   */
  feedTranscript(text: string): void {
    switch (this._state) {
      case "SLEEPING":
      case "IDLE_TIMEOUT":
        if (this._matchesWakePhrase(text)) {
          void this._activate();
        }
        break;

      case "ACTIVATING":
      case "LISTENING":
        this._pendingTranscript = (this._pendingTranscript + " " + text).trim();
        this._resetSilenceTimer();
        break;

      case "FOLLOWUP_WAIT":
        // User spoke again inside follow-up window → go back to listening
        this._clearFollowupTimer();
        this._pendingTranscript = text.trim();
        this._transition("LISTENING");
        this._resetSilenceTimer();
        break;

      case "PROCESSING":
      case "EXECUTING":
        // Ignore mid-processing speech (queuing is handled at a higher layer)
        break;
    }
  }

  /**
   * Signals that continuous speech has started (e.g., VAD onset).
   * Transitions SLEEPING/IDLE_TIMEOUT → ACTIVATING if no wake phrase required.
   */
  onSpeechStart(skipWakePhrase = false): void {
    if ((this._state === "SLEEPING" || this._state === "IDLE_TIMEOUT") && skipWakePhrase) {
      void this._activate();
    } else if (this._state === "ACTIVATING" || this._state === "FOLLOWUP_WAIT") {
      this._clearFollowupTimer();
      this._transition("LISTENING");
      this._emit("speech:start", {});
    }
  }

  /** Signals VAD offset — triggers silence countdown toward PROCESSING. */
  onSpeechEnd(): void {
    if (this._state === "LISTENING") {
      this._emit("speech:end", {});
      this._resetSilenceTimer(0); // immediate for VAD-confirmed end
    }
  }

  /** Manually wake the runtime (e.g., button tap). */
  wake(): void {
    if (this._state === "SLEEPING" || this._state === "IDLE_TIMEOUT") {
      void this._activate();
    }
  }

  /** Manually put the runtime to sleep. */
  sleep(): void {
    this._clearAll();
    this._pendingTranscript = "";
    this._transition("SLEEPING");
    this._emit("sleep:enter", {});
  }

  /** Abort any in-progress execution and reset to SLEEPING. */
  abort(): void {
    this.sleep();
  }

  dispose(): void {
    this._clearAll();
    this._listeners.clear();
  }

  // ── Transitions ─────────────────────────────────────────────────────────────

  private async _activate(): Promise<void> {
    this._transition("ACTIVATING");
    this._emit("wake:detected", {});
    // Brief activating phase — then wait for first speech
    await this._delay(120);
    if (this._state === "ACTIVATING") {
      this._transition("LISTENING");
      this._resetSilenceTimer();
    }
  }

  private _onSilenceTimeout(): void {
    if (this._state !== "LISTENING") return;
    const transcript = this._pendingTranscript.trim();
    this._pendingTranscript = "";

    if (!transcript) {
      // Nothing said — idle out
      this._enterFollowupWait();
      return;
    }

    this._transition("PROCESSING");
    this._emit("transcript:ready", { transcript });
    void this._execute(transcript);
  }

  private async _execute(transcript: string): Promise<void> {
    this._transition("EXECUTING");
    this._emit("execution:start", { transcript });
    try {
      await this.config.onExecute(transcript);
      this._emit("execution:complete", { transcript });
    } catch (err) {
      this._emit("execution:error", { transcript, error: String(err) });
    } finally {
      if (this._state === "EXECUTING") {
        this._enterFollowupWait();
      }
    }
  }

  private _enterFollowupWait(): void {
    this._transition("FOLLOWUP_WAIT");
    this._emit("followup:prompt", {});
    this._clearFollowupTimer();
    this._followupTimer = setTimeout(() => {
      if (this._state === "FOLLOWUP_WAIT") {
        this._enterIdleTimeout();
      }
    }, this.config.followupWindowMs);
  }

  private _enterIdleTimeout(): void {
    this._transition("IDLE_TIMEOUT");
    this._emit("idle:timeout", {});
    this._clearIdleTimer();
    this._idleTimer = setTimeout(() => {
      if (this._state === "IDLE_TIMEOUT") {
        this.sleep();
      }
    }, this.config.idleTimeoutMs);
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  private _transition(next: VoiceRuntimeState): void {
    if (this._state === next) return;
    const prev = this._state;
    this._state = next;
    this.config.onStateChange(next, prev);
    this._emit("state:changed", { prevState: prev });
  }

  private _emit(type: VoiceRuntimeEventType, payload: Record<string, unknown>): void {
    const event: VoiceRuntimeEvent = {
      type,
      state: this._state,
      prevState: payload["prevState"] as VoiceRuntimeState | undefined,
      timestamp: new Date(),
      payload,
    };
    for (const listener of this._listeners) {
      try {
        listener(event);
      } catch {
        // Listener errors must not crash the runtime
      }
    }
  }

  private _matchesWakePhrase(text: string): boolean {
    const normalized = text.toLowerCase().trim();
    return this.config.wakePhrases.some((phrase) => normalized.includes(phrase.toLowerCase()));
  }

  private _resetSilenceTimer(overrideMs?: number): void {
    this._clearSilenceTimer();
    const ms = overrideMs ?? this.config.silenceTimeoutMs;
    this._silenceTimer = setTimeout(() => this._onSilenceTimeout(), ms);
  }

  private _clearSilenceTimer(): void {
    if (this._silenceTimer !== null) {
      clearTimeout(this._silenceTimer);
      this._silenceTimer = null;
    }
  }

  private _clearFollowupTimer(): void {
    if (this._followupTimer !== null) {
      clearTimeout(this._followupTimer);
      this._followupTimer = null;
    }
  }

  private _clearIdleTimer(): void {
    if (this._idleTimer !== null) {
      clearTimeout(this._idleTimer);
      this._idleTimer = null;
    }
  }

  private _clearAll(): void {
    this._clearSilenceTimer();
    this._clearFollowupTimer();
    this._clearIdleTimer();
  }

  private _delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// ─── Factory ──────────────────────────────────────────────────────────────────

export function createKenuxaVoiceRuntime(config?: VoiceRuntimeConfig): KenuxaVoiceRuntime {
  return new KenuxaVoiceRuntime(config);
}
