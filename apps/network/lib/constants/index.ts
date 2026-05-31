// ============================================================
// KENUXA BUSINESS NETWORK — Constants
// ============================================================

export const AFRICAN_COUNTRIES = [
  { code: "DZ", name: "Algeria",                  region: "North Africa" },
  { code: "AO", name: "Angola",                   region: "Central Africa" },
  { code: "BJ", name: "Benin",                    region: "West Africa" },
  { code: "BW", name: "Botswana",                 region: "Southern Africa" },
  { code: "BF", name: "Burkina Faso",             region: "West Africa" },
  { code: "BI", name: "Burundi",                  region: "East Africa" },
  { code: "CV", name: "Cabo Verde",               region: "West Africa" },
  { code: "CM", name: "Cameroon",                 region: "Central Africa" },
  { code: "CF", name: "Central African Republic", region: "Central Africa" },
  { code: "TD", name: "Chad",                     region: "Central Africa" },
  { code: "KM", name: "Comoros",                  region: "East Africa" },
  { code: "CD", name: "Congo (DRC)",              region: "Central Africa" },
  { code: "CG", name: "Congo (Republic)",         region: "Central Africa" },
  { code: "CI", name: "Cote d'Ivoire",            region: "West Africa" },
  { code: "DJ", name: "Djibouti",                 region: "East Africa" },
  { code: "EG", name: "Egypt",                    region: "North Africa" },
  { code: "GQ", name: "Equatorial Guinea",        region: "Central Africa" },
  { code: "ER", name: "Eritrea",                  region: "East Africa" },
  { code: "SZ", name: "Eswatini",                 region: "Southern Africa" },
  { code: "ET", name: "Ethiopia",                 region: "East Africa" },
  { code: "GA", name: "Gabon",                    region: "Central Africa" },
  { code: "GM", name: "Gambia",                   region: "West Africa" },
  { code: "GH", name: "Ghana",                    region: "West Africa" },
  { code: "GN", name: "Guinea",                   region: "West Africa" },
  { code: "GW", name: "Guinea-Bissau",            region: "West Africa" },
  { code: "KE", name: "Kenya",                    region: "East Africa" },
  { code: "LS", name: "Lesotho",                  region: "Southern Africa" },
  { code: "LR", name: "Liberia",                  region: "West Africa" },
  { code: "LY", name: "Libya",                    region: "North Africa" },
  { code: "MG", name: "Madagascar",               region: "East Africa" },
  { code: "MW", name: "Malawi",                   region: "East Africa" },
  { code: "ML", name: "Mali",                     region: "West Africa" },
  { code: "MR", name: "Mauritania",               region: "West Africa" },
  { code: "MU", name: "Mauritius",                region: "East Africa" },
  { code: "MA", name: "Morocco",                  region: "North Africa" },
  { code: "MZ", name: "Mozambique",               region: "East Africa" },
  { code: "NA", name: "Namibia",                  region: "Southern Africa" },
  { code: "NE", name: "Niger",                    region: "West Africa" },
  { code: "NG", name: "Nigeria",                  region: "West Africa" },
  { code: "RW", name: "Rwanda",                   region: "East Africa" },
  { code: "ST", name: "Sao Tome & Principe",      region: "Central Africa" },
  { code: "SN", name: "Senegal",                  region: "West Africa" },
  { code: "SC", name: "Seychelles",               region: "East Africa" },
  { code: "SL", name: "Sierra Leone",             region: "West Africa" },
  { code: "SO", name: "Somalia",                  region: "East Africa" },
  { code: "ZA", name: "South Africa",             region: "Southern Africa" },
  { code: "SS", name: "South Sudan",              region: "East Africa" },
  { code: "SD", name: "Sudan",                    region: "North Africa" },
  { code: "TZ", name: "Tanzania",                 region: "East Africa" },
  { code: "TG", name: "Togo",                     region: "West Africa" },
  { code: "TN", name: "Tunisia",                  region: "North Africa" },
  { code: "UG", name: "Uganda",                   region: "East Africa" },
  { code: "ZM", name: "Zambia",                   region: "Southern Africa" },
  { code: "ZW", name: "Zimbabwe",                 region: "Southern Africa" },
] as const;

export const AFRICAN_COUNTRY_NAMES = AFRICAN_COUNTRIES.map((c) => c.name);

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
