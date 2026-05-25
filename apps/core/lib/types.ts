export type Role =
  | "super_admin"
  | "organization_owner"
  | "organization_admin"
  | "operator"
  | "analyst"
  | "contributor"
  | "viewer";

export type SubscriptionTier = "free" | "growth" | "scale" | "enterprise";

export type EventStatus = "queued" | "processing" | "completed" | "failed" | "retrying";

export type MemoryType =
  | "user"
  | "organization"
  | "workflow"
  | "ai_interaction"
  | "business"
  | "vector"
  | "conversation";

export type WorkflowTrigger = "event" | "schedule" | "webhook" | "manual";

export type NotificationType =
  | "info" | "success" | "warning" | "error"
  | "system" | "billing" | "security" | "ai" | "event" | "workflow";

export type AuditAction =
  | "auth.login" | "auth.logout" | "auth.signup" | "auth.password_reset"
  | "org.create" | "org.update" | "org.delete"
  | "org.member.invite" | "org.member.remove" | "org.member.role_change"
  | "api_key.create" | "api_key.revoke"
  | "wallet.credit" | "wallet.debit" | "wallet.transfer"
  | "ai.request" | "ai.provider.add" | "ai.provider.remove"
  | "workflow.create" | "workflow.run" | "workflow.delete"
  | "memory.create" | "memory.delete"
  | "integration.connect" | "integration.disconnect"
  | "security.session.revoke" | "security.mfa.enable";

export type WalletTransactionType =
  | "purchase" | "earn" | "spend"
  | "transfer_in" | "transfer_out"
  | "refund" | "welcome_bonus" | "subscription_credit"
  | "marketplace_sale" | "admin_grant"
  | "ai_usage" | "automation_usage" | "api_usage";

export type EscrowStatus = "held" | "released" | "cancelled" | "disputed";

export type OpsCommandType = "voice" | "text" | "api" | "scheduled";

export interface ApiContext {
  userId: string;
  organizationId?: string;
  role?: Role;
  apiKeyId?: string;
  ipAddress?: string;
  requestId?: string;
}

export interface UsageMetric {
  metric: string;
  value: number;
  limit?: number;
  window: "hour" | "day" | "month";
}

export interface Notification {
  id: string;
  organization_id?: string;
  user_id?: string;
  type: NotificationType;
  title: string;
  body: string;
  action_url?: string;
  action_label?: string;
  is_read: boolean;
  read_at?: string;
  created_at: string;
  metadata: Record<string, unknown>;
}

export interface AuditLogEntry {
  id: string;
  organization_id?: string;
  user_id?: string;
  actor_type: "user" | "system" | "api_key" | "service";
  actor_id: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  description?: string;
  ip_address?: string;
  status: "success" | "failure" | "error";
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface WalletBalance {
  userId: string;
  balance: number;
  lifetimeEarned: number;
  lifetimeSpent: number;
}

export interface AIProvider {
  id: string;
  name: string;
  slug: string;
  base_url: string;
  is_active: boolean;
  capabilities: string[];
  models: string[];
}
