/**
 * KENUXA Ecosystem Event Bus Client
 *
 * Events flow:
 *  App emits event → Core event bus → subscribers (webhook / workflow / realtime)
 *
 * All apps use this client to:
 *  - Emit typed ecosystem events
 *  - Subscribe to event patterns
 *  - Query event history
 */

import type {
  EcosystemEvent, EcosystemEventName, EmitEventPayload,
  EventSubscription, KenuxaApp,
} from '@kenuxa/shared-types'

export class KenuxaEventClient {
  private coreUrl:    string
  private serviceKey: string
  private app:        KenuxaApp

  constructor(opts: { coreUrl: string; serviceKey: string; app: KenuxaApp }) {
    this.coreUrl    = opts.coreUrl
    this.serviceKey = opts.serviceKey
    this.app        = opts.app
  }

  private async req<T>(path: string, options: RequestInit = {}): Promise<T> {
    const res = await fetch(`${this.coreUrl}/api/events${path}`, {
      ...options,
      headers: {
        'Content-Type':  'application/json',
        'X-Service-Key': this.serviceKey,
        'X-App':         this.app,
        ...(options.headers ?? {}),
      },
    })
    if (!res.ok) {
      const text = await res.text()
      throw new Error(`Events API ${path} → ${res.status}: ${text}`)
    }
    return res.json() as Promise<T>
  }

  /**
   * Emit an ecosystem event.
   * Fire-and-forget: the promise resolves when Core has queued the event.
   */
  async emit<T = Record<string, unknown>>(
    payload: Omit<EmitEventPayload<T>, 'source'>,
  ): Promise<EcosystemEvent<T>> {
    return this.req<EcosystemEvent<T>>('', {
      method: 'POST',
      body:   JSON.stringify({ ...payload, source: this.app }),
    })
  }

  /**
   * Emit and fire-forget — never throws, logs error to console only.
   * Use this when events are non-critical (analytics, telemetry, etc.)
   */
  emitSilent<T = Record<string, unknown>>(
    payload: Omit<EmitEventPayload<T>, 'source'>,
  ): void {
    this.emit(payload).catch(err =>
      console.error(`[${this.app}] Event emit failed (${payload.event}):`, err)
    )
  }

  /** Subscribe to an event pattern */
  async subscribe(opts: {
    organizationId: string
    eventPattern:   EcosystemEventName | string   // e.g. 'wallet.*'
    targetType:     'webhook' | 'workflow' | 'realtime'
    targetConfig:   Record<string, unknown>
  }): Promise<EventSubscription> {
    return this.req<EventSubscription>('/subscriptions', {
      method: 'POST',
      body:   JSON.stringify(opts),
    })
  }

  /** Get recent events for an organization */
  async getEvents(organizationId: string, opts: {
    event?:  string
    status?: string
    limit?:  number
  } = {}): Promise<EcosystemEvent[]> {
    const params = new URLSearchParams({
      organization_id: organizationId,
      ...(opts.event  ? { event:  opts.event  } : {}),
      ...(opts.status ? { status: opts.status } : {}),
      limit: String(opts.limit ?? 50),
    })
    return this.req<EcosystemEvent[]>(`?${params}`)
  }
}

// ─── Singleton ────────────────────────────────────────────────

let _events: KenuxaEventClient | null = null

export function getEventClient(opts?: { coreUrl: string; serviceKey: string; app: KenuxaApp }): KenuxaEventClient {
  if (!_events) {
    if (!opts) throw new Error('Event client not initialized')
    _events = new KenuxaEventClient(opts)
  }
  return _events
}

export function initEventClient(opts: { coreUrl: string; serviceKey: string; app: KenuxaApp }): KenuxaEventClient {
  _events = new KenuxaEventClient(opts)
  return _events
}
