// ============================================================
// KENUXA BUSINESS NETWORK — Constants
// ============================================================

export const SUPPORTED_COUNTRIES = [
  { code: "DZ", name: "Algeria",                  region: "North" },
  { code: "AO", name: "Angola",                   region: "Central" },
  { code: "BJ", name: "Benin",                    region: "West" },
  { code: "BW", name: "Botswana",                 region: "Southern" },
  { code: "BF", name: "Burkina Faso",             region: "West" },
  { code: "BI", name: "Burundi",                  region: "East" },
  { code: "CV", name: "Cabo Verde",               region: "West" },
  { code: "CM", name: "Cameroon",                 region: "Central" },
  { code: "CF", name: "Central African Republic", region: "Central" },
  { code: "TD", name: "Chad",                     region: "Central" },
  { code: "KM", name: "Comoros",                  region: "East" },
  { code: "CD", name: "Congo (DRC)",              region: "Central" },
  { code: "CG", name: "Congo (Republic)",         region: "Central" },
  { code: "CI", name: "Cote d'Ivoire",            region: "West" },
  { code: "DJ", name: "Djibouti",                 region: "East" },
  { code: "EG", name: "Egypt",                    region: "North" },
  { code: "GQ", name: "Equatorial Guinea",        region: "Central" },
  { code: "ER", name: "Eritrea",                  region: "East" },
  { code: "SZ", name: "Eswatini",                 region: "Southern" },
  { code: "ET", name: "Ethiopia",                 region: "East" },
  { code: "GA", name: "Gabon",                    region: "Central" },
  { code: "GM", name: "Gambia",                   region: "West" },
  { code: "GH", name: "Ghana",                    region: "West" },
  { code: "GN", name: "Guinea",                   region: "West" },
  { code: "GW", name: "Guinea-Bissau",            region: "West" },
  { code: "KE", name: "Kenya",                    region: "East" },
  { code: "LS", name: "Lesotho",                  region: "Southern" },
  { code: "LR", name: "Liberia",                  region: "West" },
  { code: "LY", name: "Libya",                    region: "North" },
  { code: "MG", name: "Madagascar",               region: "East" },
  { code: "MW", name: "Malawi",                   region: "East" },
  { code: "ML", name: "Mali",                     region: "West" },
  { code: "MR", name: "Mauritania",               region: "West" },
  { code: "MU", name: "Mauritius",                region: "East" },
  { code: "MA", name: "Morocco",                  region: "North" },
  { code: "MZ", name: "Mozambique",               region: "East" },
  { code: "NA", name: "Namibia",                  region: "Southern" },
  { code: "NE", name: "Niger",                    region: "West" },
  { code: "NG", name: "Nigeria",                  region: "West" },
  { code: "RW", name: "Rwanda",                   region: "East" },
  { code: "ST", name: "Sao Tome & Principe",      region: "Central" },
  { code: "SN", name: "Senegal",                  region: "West" },
  { code: "SC", name: "Seychelles",               region: "East" },
  { code: "SL", name: "Sierra Leone",             region: "West" },
  { code: "SO", name: "Somalia",                  region: "East" },
  { code: "ZA", name: "South Africa",             region: "Southern" },
  { code: "SS", name: "South Sudan",              region: "East" },
  { code: "SD", name: "Sudan",                    region: "North" },
  { code: "TZ", name: "Tanzania",                 region: "East" },
  { code: "TG", name: "Togo",                     region: "West" },
  { code: "TN", name: "Tunisia",                  region: "North" },
  { code: "UG", name: "Uganda",                   region: "East" },
  { code: "ZM", name: "Zambia",                   region: "Southern" },
  { code: "ZW", name: "Zimbabwe",                 region: "Southern" },
] as const;

export const NETWORK_COUNTRY_NAMES = SUPPORTED_COUNTRIES.map((c) => c.name);

export const GHANA_REGIONS = [
  "Greater Accra",
  "Ashanti",
  "Western",
  "Central",
  "Eastern",
  "Northern",
  "Upper East",
  "Upper West",
  "Volta",
  "Brong-Ahafo",
  "Oti",
  "Savannah",
  "Bono",
  "Bono East",
  "Ahafo",
  "Western North",
] as const;

export const GHANA_CITIES = [
  "Accra",
  "Kumasi",
  "Takoradi",
  "Tamale",
  "Cape Coast",
  "Sunyani",
  "Ho",
  "Koforidua",
  "Wa",
  "Bolgatanga",
  "Tema",
  "Obuasi",
  "Teshie",
  "Madina",
  "Ashaiman",
] as const;

export const BUSINESS_CATEGORIES = [
  { slug: "retail",        name: "Retail & Shops",          icon: "🛒" },
  { slug: "food",          name: "Food & Restaurants",       icon: "🍽️" },
  { slug: "health",        name: "Health & Pharmacy",        icon: "💊" },
  { slug: "professional",  name: "Professional Services",    icon: "💼" },
  { slug: "technology",    name: "Technology",               icon: "💻" },
  { slug: "construction",  name: "Construction",             icon: "🔨" },
  { slug: "transport",     name: "Transport & Logistics",    icon: "🚚" },
  { slug: "agriculture",   name: "Agriculture",              icon: "🌾" },
  { slug: "finance",       name: "Finance & Insurance",      icon: "🏦" },
  { slug: "beauty",        name: "Beauty & Wellness",        icon: "💆" },
  { slug: "hospitality",   name: "Hospitality",              icon: "🏨" },
  { slug: "education",     name: "Education",                icon: "📚" },
  { slug: "manufacturing", name: "Manufacturing",            icon: "🏭" },
  { slug: "automotive",    name: "Automotive",               icon: "🚗" },
  { slug: "real_estate",   name: "Real Estate",              icon: "🏠" },
  { slug: "legal",         name: "Legal Services",           icon: "⚖️" },
] as const;

export const SERVICE_CATEGORIES = [
  "Electrical",
  "Plumbing",
  "Carpentry",
  "Automotive",
  "Cleaning",
  "IT & Tech",
  "Design",
  "Legal",
  "Accounting",
  "Marketing",
  "Consulting",
  "Event Planning",
  "Photography",
  "Tutoring",
  "Healthcare",
] as const;

export const PAYMENT_METHODS = {
  cash:          { label: "Cash",          icon: "💵", color: "#34d399" },
  mtn_momo:      { label: "MTN MoMo",      icon: "📱", color: "#fbbf24" },
  telecel_cash:  { label: "Telecel Cash",  icon: "📱", color: "#f87171" },
  at_money:      { label: "AT Money",      icon: "📱", color: "#60a5fa" },
  visa:          { label: "Visa",          icon: "💳", color: "#3b82f6" },
  mastercard:    { label: "Mastercard",    icon: "💳", color: "#ef4444" },
  bank_transfer: { label: "Bank Transfer", icon: "🏦", color: "#a78bfa" },
  wallet:        { label: "KENUXA Wallet", icon: "👛", color: "#FF8B5E" },
} as const;

export const USER_ROLES = [
  { value: "business_owner",  label: "Business Owner",   description: "Full access to business management" },
  { value: "branch_manager",  label: "Branch Manager",   description: "Manage a specific branch" },
  { value: "cashier",         label: "Cashier",          description: "Process sales at POS" },
  { value: "employee",        label: "Employee",         description: "Basic access to tools" },
  { value: "accountant",      label: "Accountant",       description: "Finance and invoicing access" },
] as const;

export const JOB_TYPES = [
  { value: "full_time",   label: "Full-Time" },
  { value: "part_time",   label: "Part-Time" },
  { value: "contract",    label: "Contract" },
  { value: "gig",         label: "Gig / Freelance" },
  { value: "internship",  label: "Internship" },
  { value: "apprentice",  label: "Apprenticeship" },
] as const;

export const CRM_SEGMENTS = [
  { value: "vip",      label: "VIP",       color: "#fbbf24", description: "High-value loyal customers" },
  { value: "regular",  label: "Regular",   color: "#60a5fa", description: "Consistent buyers" },
  { value: "new",      label: "New",       color: "#34d399", description: "First-time buyers" },
  { value: "at_risk",  label: "At Risk",   color: "#f87171", description: "Haven't bought recently" },
  { value: "inactive", label: "Inactive",  color: "#374151", description: "No activity in 90+ days" },
] as const;

export const VAT_RATE = 0.025; // Ghana VAT/NHIL 2.5% flat rate levy
export const GETFUND_LEVY = 0.025;
export const NHIL = 0.025;

export const CURRENCY = { code: "GHS", symbol: "GH₵", name: "Ghana Cedis" };

export const PLATFORM_STATS = {
  businesses:  "12,400+",
  cities:      "16 regions",
  modules:     16,
  users:       "50,000+",
} as const;

export const KENUXA_EMAIL = "support@kenuxa.com";
export const KENUXA_PHONE = "+233 30 000 0000";
export const KENUXA_WHATSAPP = "+233 24 000 0000";
