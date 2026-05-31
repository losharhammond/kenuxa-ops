import { z } from "zod";

// ============================================================
// Auth
// ============================================================

export const LoginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const RegisterSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  fullName: z.string().min(2, "Full name required"),
  businessName: z.string().min(2, "Business name required"),
  businessType: z.string().min(1, "Business type required"),
  phone: z.string().min(10, "Valid phone number required"),
});

// ============================================================
// Business
// ============================================================

export const BusinessSchema = z.object({
  name: z.string().min(2, "Business name must be at least 2 characters"),
  type: z.string().min(1, "Business type required"),
  description: z.string().max(500, "Description cannot exceed 500 characters").optional(),
  phone: z.string().min(10, "Valid phone number required"),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  website: z.string().url("Invalid URL").optional().or(z.literal("")),
  address: z.string().min(5, "Full address required"),
  city: z.string().min(1, "City required"),
  region: z.string().min(1, "Region required"),
  category_slug: z.string().min(1, "Category required"),
});

// ============================================================
// Products
// ============================================================

export const ProductSchema = z.object({
  name: z.string().min(2, "Product name required"),
  sku: z.string().optional(),
  description: z.string().optional(),
  cost_price: z.number().min(0, "Cost price cannot be negative"),
  selling_price: z.number().min(0, "Selling price cannot be negative"),
  stock_qty: z.number().int().min(0, "Stock cannot be negative"),
  reorder_level: z.number().int().min(0).optional(),
  unit: z.string().default("unit"),
  category_id: z.string().uuid("Invalid category").optional(),
  barcode: z.string().optional(),
});

// ============================================================
// POS / Sale
// ============================================================

export const SaleSchema = z.object({
  customer_name: z.string().optional(),
  payment_method: z.enum(["cash", "mtn_momo", "telecel_cash", "at_money", "visa", "mastercard", "bank_transfer", "wallet"]),
  amount_paid: z.number().min(0),
  items: z.array(z.object({
    product_id: z.string().uuid(),
    name: z.string(),
    qty: z.number().int().min(1),
    unit_price: z.number().min(0),
    discount: z.number().min(0).max(100).default(0),
    total: z.number().min(0),
  })).min(1, "At least one item required"),
});

// ============================================================
// Invoice
// ============================================================

export const InvoiceSchema = z.object({
  customer_id: z.string().uuid("Valid customer required"),
  due_date: z.string().min(1, "Due date required"),
  notes: z.string().optional(),
  items: z.array(z.object({
    description: z.string().min(1, "Description required"),
    qty: z.number().int().min(1),
    unit_price: z.number().min(0),
    tax_pct: z.number().min(0).max(100).default(0),
  })).min(1, "At least one line item required"),
});

// ============================================================
// CRM Customer
// ============================================================

export const CustomerSchema = z.object({
  name: z.string().min(2, "Customer name required"),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().min(10, "Valid phone number required"),
  city: z.string().optional(),
  segment: z.enum(["vip", "regular", "new", "at_risk", "inactive"]).default("new"),
  notes: z.string().optional(),
});

// ============================================================
// Job Listing
// ============================================================

export const JobSchema = z.object({
  title: z.string().min(5, "Job title required"),
  description: z.string().min(20, "Job description must be at least 20 characters"),
  job_type: z.enum(["full_time", "part_time", "contract", "gig", "internship", "apprentice"]),
  city: z.string().min(1, "City required"),
  remote: z.boolean().default(false),
  salary_min: z.number().min(0).optional(),
  salary_max: z.number().min(0).optional(),
  requirements: z.string().optional(),
  deadline: z.string().optional(),
});

// ============================================================
// Review
// ============================================================

export const ReviewSchema = z.object({
  business_id: z.string().uuid("Invalid business"),
  rating: z.number().int().min(1).max(5, "Rating must be between 1 and 5"),
  comment: z.string().min(10, "Review must be at least 10 characters").optional(),
});

// ============================================================
// Service
// ============================================================

export const ServiceSchema = z.object({
  name: z.string().min(5, "Service name required"),
  description: z.string().min(20, "Service description required"),
  category: z.string().min(1, "Category required"),
  price_type: z.enum(["fixed", "hourly", "quote"]),
  price: z.number().min(0).optional(),
  duration_hours: z.number().min(0).optional(),
  location: z.string().optional(),
});

// ============================================================
// Delivery
// ============================================================

export const DeliverySchema = z.object({
  pickup_address: z.string().min(5, "Pickup address required"),
  delivery_address: z.string().min(5, "Delivery address required"),
  recipient_name: z.string().min(2, "Recipient name required"),
  recipient_phone: z.string().min(10, "Valid recipient phone required"),
  notes: z.string().optional(),
});

// Type exports
export type LoginInput      = z.infer<typeof LoginSchema>;
export type RegisterInput   = z.infer<typeof RegisterSchema>;
export type BusinessInput   = z.infer<typeof BusinessSchema>;
export type ProductInput    = z.infer<typeof ProductSchema>;
export type SaleInput       = z.infer<typeof SaleSchema>;
export type InvoiceInput    = z.infer<typeof InvoiceSchema>;
export type CustomerInput   = z.infer<typeof CustomerSchema>;
export type JobInput        = z.infer<typeof JobSchema>;
export type ReviewInput     = z.infer<typeof ReviewSchema>;
export type ServiceInput    = z.infer<typeof ServiceSchema>;
export type DeliveryInput   = z.infer<typeof DeliverySchema>;
