// ─── Core Entity Types ────────────────────────────────────────────────────────

export type BusinessType =
  | "retailer" | "supermarket" | "pharmacy" | "restaurant" | "hotel"
  | "manufacturer" | "distributor" | "service_provider" | "professional"
  | "freelancer" | "agency" | "contractor" | "wholesaler" | "importer";

export type UserRole =
  | "super_admin" | "country_admin" | "business_owner" | "branch_manager"
  | "cashier" | "employee" | "customer" | "supplier" | "delivery_rider"
  | "recruiter" | "job_seeker" | "financial_partner" | "freelancer";

export type BusinessStatus = "active" | "suspended" | "pending" | "closed";
export type VerificationStatus = "unverified" | "pending" | "verified" | "rejected";
export type OrderStatus = "pending" | "confirmed" | "processing" | "shipped" | "delivered" | "cancelled" | "refunded";
export type PaymentMethod = "cash" | "mtn_momo" | "telecel_cash" | "at_money" | "visa" | "mastercard" | "bank_transfer" | "wallet";
export type InvoiceStatus = "draft" | "sent" | "paid" | "overdue" | "cancelled";
export type JobType = "full_time" | "part_time" | "contract" | "gig" | "internship";
export type DeliveryStatus = "pending" | "assigned" | "picked_up" | "in_transit" | "delivered" | "failed";

export interface Business {
  id: string;
  slug: string;
  name: string;
  type: BusinessType;
  tagline?: string;
  description?: string;
  logo_url?: string;
  banner_url?: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  address?: string;
  city?: string;
  region?: string;
  country: string;
  lat?: number;
  lng?: number;
  tags: string[];
  status: BusinessStatus;
  verification_status: VerificationStatus;
  avg_rating: number;
  total_reviews: number;
  trust_score: number;
  is_featured: boolean;
  view_count: number;
  business_hours?: Record<string, { open: string; close: string; closed?: boolean }>;
  created_at: string;
}

export interface Product {
  id: string;
  business_id: string;
  name: string;
  description?: string;
  price: number;
  compare_price?: number;
  cost_price?: number;
  currency: string;
  unit: string;
  images: string[];
  stock_qty: number;
  low_stock_threshold: number;
  track_inventory: boolean;
  is_active: boolean;
  barcode?: string;
  sku?: string;
  avg_rating: number;
  total_sold: number;
  created_at: string;
}

export interface SaleItem {
  product_id?: string;
  name: string;
  sku?: string;
  qty: number;
  unit_price: number;
  discount: number;
  total: number;
}

export interface Sale {
  id: string;
  business_id: string;
  receipt_no: string;
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  total: number;
  amount_paid: number;
  change_amount: number;
  payment_method: PaymentMethod;
  status: OrderStatus;
  cashier_id?: string;
  customer_id?: string;
  items?: SaleItem[];
  created_at: string;
}

export interface CrmCustomer {
  id: string;
  business_id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  segment: string;
  lifetime_value: number;
  total_orders: number;
  loyalty_points: number;
  last_purchase?: string;
  tags: string[];
  created_at: string;
}

export interface Invoice {
  id: string;
  business_id: string;
  invoice_no: string;
  type: "quote" | "invoice" | "receipt";
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  discount: number;
  total: number;
  amount_paid: number;
  balance_due: number;
  currency: string;
  status: InvoiceStatus;
  issued_date: string;
  due_date?: string;
  customer?: CrmCustomer;
  items?: InvoiceItem[];
  created_at: string;
}

export interface InvoiceItem {
  id?: string;
  description: string;
  qty: number;
  unit_price: number;
  discount: number;
  total: number;
}

export interface JobListing {
  id: string;
  business_id: string;
  title: string;
  description: string;
  type: JobType;
  category?: string;
  location?: string;
  is_remote: boolean;
  salary_min?: number;
  salary_max?: number;
  salary_period: string;
  currency: string;
  skills: string[];
  deadline?: string;
  openings: number;
  applications: number;
  is_active: boolean;
  business?: Business;
  created_at: string;
}

export interface DeliveryOrder {
  id: string;
  business_id: string;
  pickup_address: string;
  delivery_address: string;
  recipient_name: string;
  recipient_phone: string;
  delivery_fee: number;
  distance_km?: number;
  status: DeliveryStatus;
  estimated_mins?: number;
  created_at: string;
}

export interface AiMessage {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp?: string;
}

export interface DashboardStats {
  total_sales: number;
  sales_change: number;
  total_orders: number;
  orders_change: number;
  total_customers: number;
  customers_change: number;
  revenue_today: number;
  low_stock_count: number;
  pending_invoices: number;
  pending_deliveries: number;
}

export interface NavItem {
  label: string;
  href: string;
  icon: string;
  badge?: number;
  children?: NavItem[];
}
