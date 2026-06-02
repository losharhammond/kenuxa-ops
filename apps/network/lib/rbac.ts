// ============================================================
// KENUXA BUSINESS NETWORK — Enterprise RBAC System
// ============================================================

export type Role =
  | "super_admin"
  | "country_admin"
  | "business_owner"
  | "branch_manager"
  | "cashier"
  | "employee"
  | "customer"
  | "supplier"
  | "delivery_rider"
  | "recruiter"
  | "job_seeker"
  | "financial_partner"
  | "freelancer";

export type Permission =
  // Platform Admin
  | "platform.manage"
  | "platform.analytics"
  | "platform.config"
  | "platform.feature_flags"
  // Country
  | "country.manage"
  | "country.analytics"
  | "country.kyc"
  // Business
  | "business.create"
  | "business.edit"
  | "business.delete"
  | "business.view"
  | "business.verify"
  | "business.suspend"
  | "business.billing"
  | "business.analytics"
  // Users & Team
  | "users.invite"
  | "users.manage"
  | "users.view"
  | "users.suspend"
  // Branches
  | "branch.manage"
  | "branch.analytics"
  // POS
  | "pos.access"
  | "pos.discount"
  | "pos.refund"
  | "pos.void"
  // Inventory
  | "inventory.view"
  | "inventory.edit"
  | "inventory.delete"
  | "inventory.reorder"
  // CRM
  | "crm.view"
  | "crm.edit"
  | "crm.export"
  // Invoicing
  | "invoicing.view"
  | "invoicing.create"
  | "invoicing.send"
  | "invoicing.mark_paid"
  // Payments & Finance
  | "payments.view"
  | "payments.export"
  | "finance.view"
  | "finance.manage"
  | "finance.bnpl"
  | "finance.loans"
  // Marketplace
  | "marketplace.buy"
  | "marketplace.sell"
  | "marketplace.list"
  // Services
  | "services.book"
  | "services.offer"
  // Jobs
  | "jobs.post"
  | "jobs.apply"
  | "jobs.manage_apps"
  // Suppliers
  | "suppliers.view"
  | "suppliers.rfq"
  | "suppliers.quote"
  | "suppliers.manage"
  // Delivery
  | "delivery.manage"
  | "delivery.assign"
  | "delivery.pickup"
  | "delivery.earnings"
  // Marketing
  | "marketing.view"
  | "marketing.manage"
  | "marketing.send"
  // Analytics
  | "analytics.view"
  | "analytics.export"
  // Compliance & KYC
  | "kyc.submit"
  | "kyc.review"
  | "kyc.approve"
  // Audit
  | "audit.view"
  // Settings
  | "settings.view"
  | "settings.manage"
  | "settings.rbac"
  // Treasury & Finance
  | "treasury.view"
  | "treasury.manage"
  // Wallet & KENUX
  | "wallet.view"
  | "wallet.transfer"
  | "kenux.buy"
  // Team
  | "team.view"
  | "team.manage"
  // Billing
  | "billing.view"
  | "billing.manage"
  // Developer
  | "developer.access"
  // Talent
  | "talent.manage"
  // Lending & Credit
  | "lending.view"
  | "lending.apply"
  | "lending.manage"
  | "credit.view";

const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  super_admin: [
    "platform.manage", "platform.analytics", "platform.config", "platform.feature_flags",
    "country.manage", "country.analytics", "country.kyc",
    "business.create", "business.edit", "business.delete", "business.view",
    "business.verify", "business.suspend", "business.billing", "business.analytics",
    "users.invite", "users.manage", "users.view", "users.suspend",
    "branch.manage", "branch.analytics",
    "pos.access", "pos.discount", "pos.refund", "pos.void",
    "inventory.view", "inventory.edit", "inventory.delete", "inventory.reorder",
    "crm.view", "crm.edit", "crm.export",
    "invoicing.view", "invoicing.create", "invoicing.send", "invoicing.mark_paid",
    "payments.view", "payments.export",
    "finance.view", "finance.manage", "finance.bnpl", "finance.loans",
    "marketplace.buy", "marketplace.sell", "marketplace.list",
    "services.book", "services.offer",
    "jobs.post", "jobs.apply", "jobs.manage_apps",
    "suppliers.view", "suppliers.rfq", "suppliers.quote", "suppliers.manage",
    "delivery.manage", "delivery.assign", "delivery.pickup", "delivery.earnings",
    "marketing.view", "marketing.manage", "marketing.send",
    "analytics.view", "analytics.export",
    "kyc.submit", "kyc.review", "kyc.approve",
    "audit.view",
    "settings.view", "settings.manage", "settings.rbac",
    "treasury.view", "treasury.manage",
    "wallet.view", "wallet.transfer", "kenux.buy",
    "team.view", "team.manage",
    "billing.view", "billing.manage",
    "developer.access",
    "talent.manage",
    "lending.view", "lending.apply", "lending.manage",
    "credit.view",
  ],
  country_admin: [
    "country.manage", "country.analytics", "country.kyc",
    "business.view", "business.verify", "business.suspend", "business.analytics",
    "users.view", "users.suspend",
    "kyc.review", "kyc.approve",
    "analytics.view", "analytics.export",
    "audit.view",
    "settings.view",
    "treasury.view",
    "wallet.view",
    "team.view",
    "credit.view",
  ],
  business_owner: [
    "business.create", "business.edit", "business.view", "business.billing", "business.analytics",
    "users.invite", "users.manage", "users.view",
    "branch.manage", "branch.analytics",
    "pos.access", "pos.discount", "pos.refund", "pos.void",
    "inventory.view", "inventory.edit", "inventory.delete", "inventory.reorder",
    "crm.view", "crm.edit", "crm.export",
    "invoicing.view", "invoicing.create", "invoicing.send", "invoicing.mark_paid",
    "payments.view", "payments.export",
    "finance.view", "finance.manage", "finance.bnpl", "finance.loans",
    "marketplace.buy", "marketplace.sell", "marketplace.list",
    "services.book", "services.offer",
    "jobs.post", "jobs.manage_apps",
    "suppliers.view", "suppliers.rfq", "suppliers.manage",
    "delivery.manage", "delivery.assign",
    "marketing.view", "marketing.manage", "marketing.send",
    "analytics.view", "analytics.export",
    "kyc.submit",
    "settings.view", "settings.manage", "settings.rbac",
    "treasury.view", "treasury.manage",
    "wallet.view", "wallet.transfer", "kenux.buy",
    "team.view", "team.manage",
    "billing.view", "billing.manage",
    "developer.access",
    "lending.view", "lending.apply",
    "credit.view",
  ],
  branch_manager: [
    "business.view", "business.analytics",
    "users.view",
    "branch.manage", "branch.analytics",
    "pos.access", "pos.discount", "pos.refund",
    "inventory.view", "inventory.edit", "inventory.reorder",
    "crm.view", "crm.edit",
    "invoicing.view", "invoicing.create",
    "payments.view",
    "finance.view",
    "marketplace.buy",
    "delivery.manage", "delivery.assign",
    "marketing.view",
    "analytics.view",
    "settings.view",
    "treasury.view",
    "wallet.view", "wallet.transfer", "kenux.buy",
    "team.view",
    "billing.view",
    "lending.view", "lending.apply",
    "credit.view",
  ],
  cashier: [
    "pos.access", "pos.discount",
    "inventory.view",
    "invoicing.view",
    "payments.view",
    "marketplace.buy",
    "crm.view",
    "kyc.submit",
    "settings.view",
    "wallet.view", "kenux.buy",
  ],
  employee: [
    "inventory.view",
    "crm.view",
    "pos.access",
    "invoicing.view",
    "payments.view",
    "analytics.view",
    "kyc.submit",
    "settings.view",
    "wallet.view", "kenux.buy",
  ],
  customer: [
    "marketplace.buy",
    "services.book",
    "jobs.apply",
    "invoicing.view",
    "payments.view",
    "kyc.submit",
    "settings.view",
    "wallet.view", "wallet.transfer", "kenux.buy",
    "credit.view",
    "lending.view", "lending.apply",
    "developer.access",
  ],
  supplier: [
    "suppliers.view", "suppliers.quote", "suppliers.manage", "suppliers.rfq",
    "invoicing.view", "invoicing.create", "invoicing.send",
    "payments.view",
    "marketplace.buy", "marketplace.list", "marketplace.sell",
    "analytics.view",
    "kyc.submit",
    "settings.view",
    "wallet.view", "wallet.transfer", "kenux.buy",
    "treasury.view",
    "credit.view",
    "lending.view", "lending.apply",
    "developer.access",
  ],
  delivery_rider: [
    "delivery.pickup", "delivery.earnings",
    "marketplace.buy",
    "analytics.view",
    "kyc.submit",
    "settings.view",
    "wallet.view", "wallet.transfer", "kenux.buy",
  ],
  recruiter: [
    "jobs.post", "jobs.manage_apps",
    "marketplace.buy",
    "analytics.view",
    "kyc.submit",
    "settings.view",
    "wallet.view", "wallet.transfer", "kenux.buy",
    "talent.manage",
    "developer.access",
  ],
  job_seeker: [
    "jobs.apply",
    "marketplace.buy",
    "services.book",
    "kyc.submit",
    "settings.view",
    "wallet.view", "wallet.transfer", "kenux.buy",
    "credit.view",
    "lending.view", "lending.apply",
  ],
  financial_partner: [
    "finance.view", "finance.bnpl", "finance.loans",
    "analytics.view", "analytics.export",
    "kyc.review", "kyc.submit",
    "settings.view",
    "wallet.view",
    "lending.view", "lending.manage",
    "credit.view",
    "developer.access",
  ],
  freelancer: [
    "jobs.apply", "services.book",
    "marketplace.buy", "marketplace.list", "marketplace.sell",
    "services.offer",
    "analytics.view",
    "kyc.submit",
    "settings.view",
    "wallet.view", "wallet.transfer", "kenux.buy",
    "credit.view",
    "lending.view", "lending.apply",
    "developer.access",
  ],
};

// Exported alias for multi-role permission union (use-roles.ts)
export const ROLE_PERMISSIONS_MAP = ROLE_PERMISSIONS;

export function hasPermission(role: Role | null | undefined, permission: Permission): boolean {
  if (!role) return false;
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function hasAnyPermission(role: Role | null | undefined, permissions: Permission[]): boolean {
  return permissions.some((p) => hasPermission(role, p));
}

export function hasAllPermissions(role: Role | null | undefined, permissions: Permission[]): boolean {
  return permissions.every((p) => hasPermission(role, p));
}

export function getRolePermissions(role: Role): Permission[] {
  return ROLE_PERMISSIONS[role] ?? [];
}

export function isAdminRole(role: Role | null | undefined): boolean {
  return role === "super_admin" || role === "country_admin";
}

export function isBusinessRole(role: Role | null | undefined): boolean {
  return (
    role === "business_owner" ||
    role === "branch_manager" ||
    role === "cashier" ||
    role === "employee"
  );
}

export const ROLE_LABELS: Record<Role, string> = {
  super_admin: "Super Admin",
  country_admin: "Country Admin",
  business_owner: "Business Owner",
  branch_manager: "Branch Manager",
  cashier: "Cashier",
  employee: "Employee",
  customer: "Customer",
  supplier: "Supplier",
  delivery_rider: "Delivery Rider",
  recruiter: "Recruiter",
  job_seeker: "Job Seeker",
  financial_partner: "Financial Partner",
  freelancer: "Freelancer",
};

// ─── ABAC — Attribute-Based Access Control helpers ───────────────────────────

export interface AbacContext {
  userId?: string;
  businessId?: string | null;
  branchId?: string | null;
  country?: string | null;
  ownerId?: string | null;
  isVerified?: boolean;
  subscriptionTier?: "free" | "pro" | "enterprise";
  complianceStatus?: "pending" | "approved" | "suspended";
}

/** True if the user owns the resource (userId === ownerId) */
export function isOwner(userId: string | undefined, ownerId: string | null | undefined): boolean {
  return !!userId && !!ownerId && userId === ownerId;
}

/** True if the user belongs to the business */
export function isMemberOf(userBusinessId: string | null | undefined, targetBusinessId: string | null | undefined): boolean {
  return !!userBusinessId && !!targetBusinessId && userBusinessId === targetBusinessId;
}

/** Full RBAC + ABAC permission check */
export function checkPermission(
  role: Role | null | undefined,
  permission: Permission,
  ctx?: AbacContext
): boolean {
  // Suspended users lose all permissions
  if (ctx?.complianceStatus === "suspended") return false;
  // Base RBAC check
  const rbac = hasPermission(role, permission);
  if (!rbac) return false;
  // Additional ABAC guards
  if (permission === "business.delete" && ctx && !isOwner(ctx.userId, ctx.ownerId)) return false;
  if (permission === "business.billing" && ctx?.subscriptionTier === "free") return false;
  return true;
}

/** Check if a multi-role user (array) has permission in any of their roles */
export function hasPermissionAny(roles: Role[], permission: Permission): boolean {
  return roles.some((r) => hasPermission(r, permission));
}

export const ROLE_COLORS: Record<Role, string> = {
  super_admin: "#FF6524",
  country_admin: "#F59E0B",
  business_owner: "#3B82F6",
  branch_manager: "#8B5CF6",
  cashier: "#10b981",
  employee: "#64748b",
  customer: "#06b6d4",
  supplier: "#f97316",
  delivery_rider: "#84cc16",
  recruiter: "#ec4899",
  job_seeker: "#6366f1",
  financial_partner: "#14b8a6",
  freelancer: "#a78bfa",
};
