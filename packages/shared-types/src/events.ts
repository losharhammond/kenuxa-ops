// ============================================================
// KENUXA Ecosystem — Event Bus Types
// All systems communicate via the ecosystem event bus
// ============================================================

import type { KenuxaApp } from './ecosystem'

export type EventStatus = 'queued' | 'processing' | 'completed' | 'failed' | 'retrying'

// ─── Typed event registry ────────────────────────────────────
// Prefix = source app, name = what happened

export type EcosystemEventName =
  // Auth events (emitted by Core)
  | 'auth.user.created'
  | 'auth.user.verified'
  | 'auth.user.deleted'
  | 'auth.org.created'
  | 'auth.org.member.added'
  | 'auth.org.member.removed'
  // Wallet events (emitted by Core)
  | 'wallet.kenux.credited'
  | 'wallet.kenux.debited'
  | 'wallet.kenux.transferred'
  | 'wallet.subscription.activated'
  | 'wallet.subscription.cancelled'
  | 'wallet.payment.success'
  // Intelligence events (emitted by Reach)
  | 'reach.entity.extracted'
  | 'reach.trend.detected'
  | 'reach.signal.created'
  | 'reach.crawler.completed'
  | 'reach.marketplace.asset.published'
  | 'reach.marketplace.asset.purchased'
  // Campaign events (emitted by Reach)
  | 'reach.campaign.launched'
  | 'reach.campaign.completed'
  | 'reach.campaign.failed'
  // OPS events (emitted by OPS)
  | 'ops.workflow.triggered'
  | 'ops.workflow.completed'
  | 'ops.voice.command.received'
  | 'ops.automation.executed'
  // Memory events (emitted by Zuria)
  | 'zuria.memory.created'
  | 'zuria.memory.updated'
  | 'zuria.context.resolved'
  // System events
  | 'system.feature.toggled'
  | 'system.health.degraded'
  | 'system.health.restored'

export interface EcosystemEvent<T = Record<string, unknown>> {
  id:              string
  organization_id: string
  event:           EcosystemEventName
  source:          KenuxaApp
  payload:         T
  status:          EventStatus
  attempts:        number
  max_attempts:    number
  idempotency_key?: string
  next_retry_at?:  string
  processed_at?:   string
  error?:          string
  created_at:      string
}

// ─── Typed event payloads ────────────────────────────────────

export interface WalletCreditedPayload {
  user_id:     string
  amount:      number
  balance:     number
  type:        string
  description: string
}

export interface TrendDetectedPayload {
  trend_id:    string
  signal_type: string
  title:       string
  velocity:    number
  countries:   string[]
}

export interface CampaignCompletedPayload {
  campaign_id:     string
  channel:         string
  sent_count:      number
  delivered_count: number
  failed_count:    number
  cost_kenux:      number
}

// ─── Event subscription ──────────────────────────────────────

export interface EventSubscription {
  id:              string
  organization_id: string
  event_pattern:   string    // glob-style: 'wallet.*', 'reach.trend.*'
  target_type:     'webhook' | 'workflow' | 'realtime'
  target_config:   Record<string, unknown>
  enabled:         boolean
  created_at:      string
}

export interface EmitEventPayload<T = Record<string, unknown>> {
  event:           EcosystemEventName
  organizationId:  string
  source:          KenuxaApp
  payload:         T
  idempotencyKey?: string
}
