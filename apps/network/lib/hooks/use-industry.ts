/**
 * KENUXA Industry Specialization Engine
 * Detects business category and returns industry-specific config:
 * - specialized nav shortcuts
 * - KPI definitions
 * - AI prompt context
 * - quick actions
 * - feature flags
 */

import { useMemo } from "react";

export type IndustryKey =
  | "restaurant"
  | "pharmacy"
  | "retail"
  | "hotel"
  | "healthcare"
  | "education"
  | "agriculture"
  | "technology"
  | "services"
  | "mobile_money"
  | "logistics"
  | "manufacturing"
  | "default";

export interface IndustryConfig {
  key: IndustryKey;
  label: string;
  color: string;
  icon: string;
  kpis: Array<{ title: string; field: string; format: "currency" | "number" | "percent" }>;
  quickActions: Array<{ label: string; href: string }>;
  aiContext: string;
  features: {
    reservations: boolean;
    prescriptions: boolean;
    menuManagement: boolean;
    roomManagement: boolean;
    floatManagement: boolean;
    deliveryTracking: boolean;
    studentManagement: boolean;
    harvestTracking: boolean;
  };
  dashboardWidgets: string[];
}

const INDUSTRY_CONFIGS: Record<IndustryKey, IndustryConfig> = {
  restaurant: {
    key: "restaurant",
    label: "Restaurant OS",
    color: "#f97316",
    icon: "🍽️",
    kpis: [
      { title: "Orders Today",       field: "total_orders",   format: "number"   },
      { title: "Revenue Today",      field: "revenue_today",  format: "currency" },
      { title: "Avg Order Value",    field: "avg_order",      format: "currency" },
      { title: "Tables Occupied",    field: "tables_active",  format: "number"   },
    ],
    quickActions: [
      { label: "New Order",      href: "/dashboard/pos"         },
      { label: "Update Menu",    href: "/dashboard/inventory"   },
      { label: "Reservations",   href: "/dashboard/crm"         },
      { label: "AI Demand Forecast", href: "/dashboard/ai"     },
    ],
    aiContext: "You are an AI assistant for a restaurant. Focus on: menu optimization, demand forecasting, food waste reduction, peak hour staffing, popular dishes, and customer satisfaction.",
    features: { reservations: true, prescriptions: false, menuManagement: true, roomManagement: false, floatManagement: false, deliveryTracking: true, studentManagement: false, harvestTracking: false },
    dashboardWidgets: ["orders_today", "popular_items", "table_status", "peak_hours_chart", "recent_orders"],
  },

  pharmacy: {
    key: "pharmacy",
    label: "Pharmacy OS",
    color: "#10b981",
    icon: "💊",
    kpis: [
      { title: "Prescriptions Today", field: "total_orders",    format: "number"   },
      { title: "Revenue Today",       field: "revenue_today",   format: "currency" },
      { title: "Expiring Items",      field: "low_stock_count", format: "number"   },
      { title: "Active Customers",    field: "total_customers", format: "number"   },
    ],
    quickActions: [
      { label: "Dispense Medicine",   href: "/dashboard/pos"       },
      { label: "Check Expiry",        href: "/dashboard/inventory" },
      { label: "Patient Records",     href: "/dashboard/crm"       },
      { label: "Reorder Stock",       href: "/dashboard/suppliers" },
    ],
    aiContext: "You are an AI assistant for a pharmacy. Focus on: medicine expiry tracking, prescription fulfillment, drug interaction warnings, inventory forecasting, and patient medication adherence.",
    features: { reservations: false, prescriptions: true, menuManagement: false, roomManagement: false, floatManagement: false, deliveryTracking: true, studentManagement: false, harvestTracking: false },
    dashboardWidgets: ["prescriptions_today", "expiring_medicines", "low_stock_alert", "daily_sales", "top_medicines"],
  },

  retail: {
    key: "retail",
    label: "Retail OS",
    color: "#3B82F6",
    icon: "🛍️",
    kpis: [
      { title: "Sales Today",         field: "revenue_today",   format: "currency" },
      { title: "Transactions",        field: "total_orders",    format: "number"   },
      { title: "Low Stock Items",     field: "low_stock_count", format: "number"   },
      { title: "Customers Today",     field: "total_customers", format: "number"   },
    ],
    quickActions: [
      { label: "POS Sale",            href: "/dashboard/pos"       },
      { label: "Stock Update",        href: "/dashboard/inventory" },
      { label: "Customer Lookup",     href: "/dashboard/crm"       },
      { label: "Analytics",           href: "/dashboard/analytics" },
    ],
    aiContext: "You are an AI assistant for a retail store. Focus on: inventory optimization, sales trends, customer behavior, promotions strategy, and reorder recommendations.",
    features: { reservations: false, prescriptions: false, menuManagement: false, roomManagement: false, floatManagement: false, deliveryTracking: true, studentManagement: false, harvestTracking: false },
    dashboardWidgets: ["sales_today", "top_products", "low_stock", "customer_visits", "revenue_chart"],
  },

  hotel: {
    key: "hotel",
    label: "Hotel OS",
    color: "#8B5CF6",
    icon: "🏨",
    kpis: [
      { title: "Occupied Rooms",      field: "total_orders",    format: "number"   },
      { title: "Revenue Today",       field: "revenue_today",   format: "currency" },
      { title: "Occupancy Rate",      field: "occupancy_rate",  format: "percent"  },
      { title: "Active Guests",       field: "total_customers", format: "number"   },
    ],
    quickActions: [
      { label: "Check In Guest",      href: "/dashboard/pos"       },
      { label: "Room Availability",   href: "/dashboard/inventory" },
      { label: "Guest Records",       href: "/dashboard/crm"       },
      { label: "Housekeeping",        href: "/dashboard/delivery"  },
    ],
    aiContext: "You are an AI assistant for a hotel. Focus on: occupancy optimization, revenue per room, guest satisfaction, seasonal pricing, and housekeeping efficiency.",
    features: { reservations: true, prescriptions: false, menuManagement: true, roomManagement: true, floatManagement: false, deliveryTracking: false, studentManagement: false, harvestTracking: false },
    dashboardWidgets: ["room_status", "checkins_today", "revenue_today", "occupancy_chart", "guest_satisfaction"],
  },

  healthcare: {
    key: "healthcare",
    label: "Healthcare OS",
    color: "#f87171",
    icon: "🏥",
    kpis: [
      { title: "Appointments Today",  field: "total_orders",    format: "number"   },
      { title: "Revenue Today",       field: "revenue_today",   format: "currency" },
      { title: "Active Patients",     field: "total_customers", format: "number"   },
      { title: "Pending Bills",       field: "pending_invoices",format: "number"   },
    ],
    quickActions: [
      { label: "New Patient",         href: "/dashboard/crm"       },
      { label: "Schedule Appt",       href: "/dashboard/pos"       },
      { label: "Create Invoice",      href: "/dashboard/invoicing" },
      { label: "Medical Supplies",    href: "/dashboard/inventory" },
    ],
    aiContext: "You are an AI assistant for a healthcare clinic. Focus on: appointment management, patient billing, medical supply inventory, and operational efficiency.",
    features: { reservations: true, prescriptions: true, menuManagement: false, roomManagement: false, floatManagement: false, deliveryTracking: false, studentManagement: false, harvestTracking: false },
    dashboardWidgets: ["appointments_today", "patient_queue", "billing_summary", "supply_levels", "revenue_chart"],
  },

  education: {
    key: "education",
    label: "Education OS",
    color: "#F59E0B",
    icon: "🎓",
    kpis: [
      { title: "Enrolled Students",   field: "total_customers", format: "number"   },
      { title: "Fees Collected",      field: "revenue_today",   format: "currency" },
      { title: "Pending Fees",        field: "pending_invoices",format: "number"   },
      { title: "Attendance Today",    field: "total_orders",    format: "number"   },
    ],
    quickActions: [
      { label: "Record Fees",         href: "/dashboard/pos"       },
      { label: "Student Records",     href: "/dashboard/crm"       },
      { label: "Fee Invoice",         href: "/dashboard/invoicing" },
      { label: "School Supplies",     href: "/dashboard/inventory" },
    ],
    aiContext: "You are an AI assistant for an educational institution. Focus on: student enrollment, fee collection, attendance tracking, and academic performance.",
    features: { reservations: false, prescriptions: false, menuManagement: false, roomManagement: false, floatManagement: false, deliveryTracking: false, studentManagement: true, harvestTracking: false },
    dashboardWidgets: ["enrollment_stats", "fee_collection", "attendance_rate", "upcoming_deadlines"],
  },

  agriculture: {
    key: "agriculture",
    label: "Agriculture OS",
    color: "#84cc16",
    icon: "🌾",
    kpis: [
      { title: "Produce Listed",      field: "total_orders",    format: "number"   },
      { title: "Revenue Today",       field: "revenue_today",   format: "currency" },
      { title: "Stock Levels",        field: "low_stock_count", format: "number"   },
      { title: "Buyers Reached",      field: "total_customers", format: "number"   },
    ],
    quickActions: [
      { label: "List Produce",        href: "/dashboard/marketplace" },
      { label: "Record Sale",         href: "/dashboard/pos"         },
      { label: "Find Buyers",         href: "/dashboard/discover"    },
      { label: "AI Yield Forecast",   href: "/dashboard/ai"          },
    ],
    aiContext: "You are an AI assistant for an agricultural business. Focus on: produce pricing, market demand, harvest planning, soil health, weather impact, and connecting with buyers.",
    features: { reservations: false, prescriptions: false, menuManagement: false, roomManagement: false, floatManagement: false, deliveryTracking: true, studentManagement: false, harvestTracking: true },
    dashboardWidgets: ["produce_listings", "market_prices", "harvest_calendar", "buyer_connections", "weather_impact"],
  },

  mobile_money: {
    key: "mobile_money",
    label: "Mobile Money OS",
    color: "#F59E0B",
    icon: "📱",
    kpis: [
      { title: "Transactions Today",  field: "total_orders",    format: "number"   },
      { title: "Float Balance",       field: "revenue_today",   format: "currency" },
      { title: "Commission Earned",   field: "revenue_month",   format: "currency" },
      { title: "Customers Served",    field: "total_customers", format: "number"   },
    ],
    quickActions: [
      { label: "Record Transaction",  href: "/dashboard/pos"       },
      { label: "Float Report",        href: "/dashboard/finance"   },
      { label: "Commission Track",    href: "/dashboard/analytics" },
      { label: "AI Float Forecast",   href: "/dashboard/ai"        },
    ],
    aiContext: "You are an AI assistant for a mobile money agent. Focus on: float management, transaction volume forecasting, commission optimization, and identifying peak demand periods.",
    features: { reservations: false, prescriptions: false, menuManagement: false, roomManagement: false, floatManagement: true, deliveryTracking: false, studentManagement: false, harvestTracking: false },
    dashboardWidgets: ["float_balance", "transactions_today", "commission_tracker", "peak_hours", "float_forecast"],
  },

  logistics: {
    key: "logistics",
    label: "Logistics OS",
    color: "#3B82F6",
    icon: "🚚",
    kpis: [
      { title: "Deliveries Today",    field: "total_orders",    format: "number"   },
      { title: "Revenue Today",       field: "revenue_today",   format: "currency" },
      { title: "Active Riders",       field: "total_customers", format: "number"   },
      { title: "Pending Pickups",     field: "low_stock_count", format: "number"   },
    ],
    quickActions: [
      { label: "Assign Delivery",     href: "/dashboard/delivery"  },
      { label: "Track Riders",        href: "/dashboard/delivery"  },
      { label: "Customer Lookup",     href: "/dashboard/crm"       },
      { label: "Revenue Report",      href: "/dashboard/analytics" },
    ],
    aiContext: "You are an AI assistant for a logistics and delivery company. Focus on: route optimization, delivery efficiency, rider performance, and customer satisfaction.",
    features: { reservations: false, prescriptions: false, menuManagement: false, roomManagement: false, floatManagement: false, deliveryTracking: true, studentManagement: false, harvestTracking: false },
    dashboardWidgets: ["active_deliveries", "rider_map", "delivery_performance", "revenue_today"],
  },

  technology: {
    key: "technology",
    label: "Tech Business OS",
    color: "#6366f1",
    icon: "💻",
    kpis: [
      { title: "Active Clients",      field: "total_customers", format: "number"   },
      { title: "Revenue This Month",  field: "revenue_month",   format: "currency" },
      { title: "Pending Invoices",    field: "pending_invoices",format: "number"   },
      { title: "Projects Active",     field: "total_orders",    format: "number"   },
    ],
    quickActions: [
      { label: "Create Invoice",      href: "/dashboard/invoicing" },
      { label: "Client Records",      href: "/dashboard/crm"       },
      { label: "Post Job",            href: "/dashboard/jobs"      },
      { label: "Find Freelancers",    href: "/dashboard/freelancers" },
    ],
    aiContext: "You are an AI assistant for a technology business. Focus on: project management, client retention, talent hiring, revenue forecasting, and competitive positioning.",
    features: { reservations: false, prescriptions: false, menuManagement: false, roomManagement: false, floatManagement: false, deliveryTracking: false, studentManagement: false, harvestTracking: false },
    dashboardWidgets: ["client_pipeline", "invoice_summary", "team_utilization", "revenue_forecast"],
  },

  services: {
    key: "services",
    label: "Services OS",
    color: "#14b8a6",
    icon: "🔧",
    kpis: [
      { title: "Jobs Today",          field: "total_orders",    format: "number"   },
      { title: "Revenue Today",       field: "revenue_today",   format: "currency" },
      { title: "Active Clients",      field: "total_customers", format: "number"   },
      { title: "Pending Invoices",    field: "pending_invoices",format: "number"   },
    ],
    quickActions: [
      { label: "New Job",             href: "/dashboard/pos"       },
      { label: "Client Records",      href: "/dashboard/crm"       },
      { label: "Send Invoice",        href: "/dashboard/invoicing" },
      { label: "List Service",        href: "/dashboard/services"  },
    ],
    aiContext: "You are an AI assistant for a service business. Focus on: job scheduling, client management, pricing strategy, and service quality improvement.",
    features: { reservations: true, prescriptions: false, menuManagement: false, roomManagement: false, floatManagement: false, deliveryTracking: false, studentManagement: false, harvestTracking: false },
    dashboardWidgets: ["jobs_today", "client_satisfaction", "revenue_by_service", "upcoming_appointments"],
  },

  manufacturing: {
    key: "manufacturing",
    label: "Manufacturing OS",
    color: "#94a3b8",
    icon: "🏭",
    kpis: [
      { title: "Units Produced",      field: "total_orders",    format: "number"   },
      { title: "Revenue Today",       field: "revenue_today",   format: "currency" },
      { title: "Raw Materials Low",   field: "low_stock_count", format: "number"   },
      { title: "Orders Pending",      field: "pending_invoices",format: "number"   },
    ],
    quickActions: [
      { label: "Record Production",   href: "/dashboard/pos"       },
      { label: "Raw Materials",       href: "/dashboard/inventory" },
      { label: "Find Suppliers",      href: "/dashboard/suppliers" },
      { label: "B2B Sales",           href: "/dashboard/invoicing" },
    ],
    aiContext: "You are an AI assistant for a manufacturing business. Focus on: production planning, raw material sourcing, quality control, supply chain optimization, and B2B sales.",
    features: { reservations: false, prescriptions: false, menuManagement: false, roomManagement: false, floatManagement: false, deliveryTracking: true, studentManagement: false, harvestTracking: false },
    dashboardWidgets: ["production_output", "raw_material_levels", "order_backlog", "supplier_status"],
  },

  default: {
    key: "default",
    label: "Business OS",
    color: "#FF8B5E",
    icon: "🏢",
    kpis: [
      { title: "Revenue Today",       field: "revenue_today",   format: "currency" },
      { title: "Monthly Revenue",     field: "revenue_month",   format: "currency" },
      { title: "Total Orders",        field: "total_orders",    format: "number"   },
      { title: "Customers",           field: "total_customers", format: "number"   },
    ],
    quickActions: [
      { label: "New Sale",            href: "/dashboard/pos"       },
      { label: "Add Product",         href: "/dashboard/inventory" },
      { label: "Create Invoice",      href: "/dashboard/invoicing" },
      { label: "Add Customer",        href: "/dashboard/crm"       },
    ],
    aiContext: "You are an AI assistant for a business. Provide actionable insights on revenue, customers, inventory, and growth opportunities.",
    features: { reservations: false, prescriptions: false, menuManagement: false, roomManagement: false, floatManagement: false, deliveryTracking: false, studentManagement: false, harvestTracking: false },
    dashboardWidgets: ["revenue_today", "recent_sales", "low_stock", "pending_invoices"],
  },
};

// Map business category strings → industry keys
const CATEGORY_MAP: Record<string, IndustryKey> = {
  // Restaurants / Food
  restaurant: "restaurant",
  "food & beverage": "restaurant",
  "food and beverage": "restaurant",
  "fast food": "restaurant",
  cafe: "restaurant",
  bakery: "restaurant",
  catering: "restaurant",

  // Pharmacies
  pharmacy: "pharmacy",
  pharmaceutical: "pharmacy",
  drugstore: "pharmacy",
  chemist: "pharmacy",

  // Retail
  retail: "retail",
  supermarket: "retail",
  shop: "retail",
  store: "retail",
  fashion: "retail",
  clothing: "retail",
  electronics: "retail",

  // Hotels
  hotel: "hotel",
  "hospitality": "hotel",
  guesthouse: "hotel",
  "bed and breakfast": "hotel",
  airbnb: "hotel",

  // Healthcare
  clinic: "healthcare",
  hospital: "healthcare",
  healthcare: "healthcare",
  dental: "healthcare",
  optician: "healthcare",
  laboratory: "healthcare",

  // Education
  school: "education",
  education: "education",
  tutoring: "education",
  training: "education",
  university: "education",
  college: "education",

  // Agriculture
  agriculture: "agriculture",
  farming: "agriculture",
  agribusiness: "agriculture",
  farm: "agriculture",

  // Mobile Money
  "mobile money": "mobile_money",
  "momo": "mobile_money",
  fintech: "mobile_money",
  "financial services": "mobile_money",

  // Logistics
  logistics: "logistics",
  delivery: "logistics",
  courier: "logistics",
  transport: "logistics",
  trucking: "logistics",

  // Technology
  technology: "technology",
  tech: "technology",
  software: "technology",
  "it services": "technology",
  digital: "technology",

  // Services
  services: "services",
  "professional services": "services",
  cleaning: "services",
  plumbing: "services",
  electrical: "services",
  construction: "services",
  "beauty & wellness": "services",

  // Manufacturing
  manufacturing: "manufacturing",
  factory: "manufacturing",
  production: "manufacturing",
};

export function detectIndustry(category: string | null | undefined): IndustryKey {
  if (!category) return "default";
  const key = category.toLowerCase().trim();
  return CATEGORY_MAP[key] ?? "default";
}

export function useIndustry(category: string | null | undefined): IndustryConfig {
  const key = useMemo(() => detectIndustry(category), [category]);
  return INDUSTRY_CONFIGS[key] ?? INDUSTRY_CONFIGS.default!;
}

export { INDUSTRY_CONFIGS };
