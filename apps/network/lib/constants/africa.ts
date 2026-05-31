/**
 * KENUXA — Africa Economic OS
 * Module 29: Multi-Country Expansion Constants
 * All 54 African Union member states with currencies, dialing codes, and regional groupings
 */

export interface AfricanCountry {
  code: string;          // ISO 3166-1 alpha-2
  name: string;
  currency: string;      // ISO 4217
  currencySymbol: string;
  dialCode: string;
  region: AfricanRegion;
  languages: string[];
  mobileMoneyProviders?: string[];
  paymentMethods?: string[];
  active: boolean;       // live on KENUXA
}

export type AfricanRegion =
  | "West Africa"
  | "East Africa"
  | "North Africa"
  | "Southern Africa"
  | "Central Africa";

export const AFRICAN_COUNTRIES: AfricanCountry[] = [
  // ── WEST AFRICA ──────────────────────────────────────────────────────────
  {
    code: "GH", name: "Ghana",              currency: "GHS", currencySymbol: "GH₵", dialCode: "+233",
    region: "West Africa", languages: ["English"], active: true,
    mobileMoneyProviders: ["MTN MoMo", "Telecel Cash", "AT Money"],
    paymentMethods: ["MTN MoMo", "Telecel Cash", "AT Money", "Visa", "Mastercard", "Bank Transfer"],
  },
  {
    code: "NG", name: "Nigeria",            currency: "NGN", currencySymbol: "₦",    dialCode: "+234",
    region: "West Africa", languages: ["English"], active: false,
    mobileMoneyProviders: ["OPay", "Palmpay", "Flutterwave"],
    paymentMethods: ["OPay", "Palmpay", "Paystack", "Flutterwave", "Visa", "Mastercard"],
  },
  {
    code: "SN", name: "Senegal",            currency: "XOF", currencySymbol: "CFA",  dialCode: "+221",
    region: "West Africa", languages: ["French"], active: false,
    mobileMoneyProviders: ["Orange Money", "Wave", "Free Money"],
  },
  {
    code: "CI", name: "Côte d'Ivoire",      currency: "XOF", currencySymbol: "CFA",  dialCode: "+225",
    region: "West Africa", languages: ["French"], active: false,
    mobileMoneyProviders: ["MTN MoMo", "Orange Money", "Wave"],
  },
  {
    code: "BF", name: "Burkina Faso",       currency: "XOF", currencySymbol: "CFA",  dialCode: "+226",
    region: "West Africa", languages: ["French"], active: false,
  },
  {
    code: "ML", name: "Mali",               currency: "XOF", currencySymbol: "CFA",  dialCode: "+223",
    region: "West Africa", languages: ["French"], active: false,
  },
  {
    code: "GN", name: "Guinea",             currency: "GNF", currencySymbol: "Fr",   dialCode: "+224",
    region: "West Africa", languages: ["French"], active: false,
  },
  {
    code: "GW", name: "Guinea-Bissau",      currency: "XOF", currencySymbol: "CFA",  dialCode: "+245",
    region: "West Africa", languages: ["Portuguese"], active: false,
  },
  {
    code: "LR", name: "Liberia",            currency: "LRD", currencySymbol: "L$",   dialCode: "+231",
    region: "West Africa", languages: ["English"], active: false,
  },
  {
    code: "SL", name: "Sierra Leone",       currency: "SLL", currencySymbol: "Le",   dialCode: "+232",
    region: "West Africa", languages: ["English"], active: false,
  },
  {
    code: "GM", name: "Gambia",             currency: "GMD", currencySymbol: "D",    dialCode: "+220",
    region: "West Africa", languages: ["English"], active: false,
  },
  {
    code: "CV", name: "Cape Verde",         currency: "CVE", currencySymbol: "Esc",  dialCode: "+238",
    region: "West Africa", languages: ["Portuguese"], active: false,
  },
  {
    code: "MR", name: "Mauritania",         currency: "MRU", currencySymbol: "UM",   dialCode: "+222",
    region: "West Africa", languages: ["Arabic", "French"], active: false,
  },
  {
    code: "BJ", name: "Benin",              currency: "XOF", currencySymbol: "CFA",  dialCode: "+229",
    region: "West Africa", languages: ["French"], active: false,
  },
  {
    code: "TG", name: "Togo",               currency: "XOF", currencySymbol: "CFA",  dialCode: "+228",
    region: "West Africa", languages: ["French"], active: false,
  },
  {
    code: "NE", name: "Niger",              currency: "XOF", currencySymbol: "CFA",  dialCode: "+227",
    region: "West Africa", languages: ["French"], active: false,
  },

  // ── EAST AFRICA ──────────────────────────────────────────────────────────
  {
    code: "KE", name: "Kenya",              currency: "KES", currencySymbol: "KSh",  dialCode: "+254",
    region: "East Africa", languages: ["English", "Swahili"], active: false,
    mobileMoneyProviders: ["M-Pesa", "Airtel Money"],
    paymentMethods: ["M-Pesa", "Airtel Money", "Visa", "Mastercard"],
  },
  {
    code: "TZ", name: "Tanzania",           currency: "TZS", currencySymbol: "TSh",  dialCode: "+255",
    region: "East Africa", languages: ["Swahili", "English"], active: false,
    mobileMoneyProviders: ["M-Pesa", "Airtel Money", "Tigo Pesa"],
  },
  {
    code: "UG", name: "Uganda",             currency: "UGX", currencySymbol: "USh",  dialCode: "+256",
    region: "East Africa", languages: ["English", "Swahili"], active: false,
    mobileMoneyProviders: ["MTN MoMo", "Airtel Money"],
  },
  {
    code: "RW", name: "Rwanda",             currency: "RWF", currencySymbol: "RF",   dialCode: "+250",
    region: "East Africa", languages: ["Kinyarwanda", "English", "French"], active: false,
    mobileMoneyProviders: ["MTN MoMo", "Airtel Money"],
  },
  {
    code: "ET", name: "Ethiopia",           currency: "ETB", currencySymbol: "Br",   dialCode: "+251",
    region: "East Africa", languages: ["Amharic"], active: false,
    mobileMoneyProviders: ["Telebirr"],
  },
  {
    code: "SO", name: "Somalia",            currency: "SOS", currencySymbol: "Sh",   dialCode: "+252",
    region: "East Africa", languages: ["Somali", "Arabic"], active: false,
    mobileMoneyProviders: ["Hormuud EVC Plus", "Dahabshiil"],
  },
  {
    code: "SS", name: "South Sudan",        currency: "SSP", currencySymbol: "£",    dialCode: "+211",
    region: "East Africa", languages: ["English"], active: false,
  },
  {
    code: "ER", name: "Eritrea",            currency: "ERN", currencySymbol: "Nfk",  dialCode: "+291",
    region: "East Africa", languages: ["Tigrinya", "Arabic"], active: false,
  },
  {
    code: "DJ", name: "Djibouti",           currency: "DJF", currencySymbol: "Fr",   dialCode: "+253",
    region: "East Africa", languages: ["French", "Arabic"], active: false,
  },
  {
    code: "BI", name: "Burundi",            currency: "BIF", currencySymbol: "Fr",   dialCode: "+257",
    region: "East Africa", languages: ["Kirundi", "French"], active: false,
  },
  {
    code: "MG", name: "Madagascar",         currency: "MGA", currencySymbol: "Ar",   dialCode: "+261",
    region: "East Africa", languages: ["Malagasy", "French"], active: false,
  },
  {
    code: "MU", name: "Mauritius",          currency: "MUR", currencySymbol: "₨",    dialCode: "+230",
    region: "East Africa", languages: ["English", "French"], active: false,
  },
  {
    code: "SC", name: "Seychelles",         currency: "SCR", currencySymbol: "₨",    dialCode: "+248",
    region: "East Africa", languages: ["Seychellois Creole", "English", "French"], active: false,
  },
  {
    code: "KM", name: "Comoros",            currency: "KMF", currencySymbol: "Fr",   dialCode: "+269",
    region: "East Africa", languages: ["Comorian", "Arabic", "French"], active: false,
  },

  // ── NORTH AFRICA ─────────────────────────────────────────────────────────
  {
    code: "EG", name: "Egypt",              currency: "EGP", currencySymbol: "£",    dialCode: "+20",
    region: "North Africa", languages: ["Arabic"], active: false,
    mobileMoneyProviders: ["Vodafone Cash", "Orange Money", "Etisalat Cash"],
  },
  {
    code: "MA", name: "Morocco",            currency: "MAD", currencySymbol: "د.م.", dialCode: "+212",
    region: "North Africa", languages: ["Arabic", "Berber", "French"], active: false,
  },
  {
    code: "DZ", name: "Algeria",            currency: "DZD", currencySymbol: "دج",  dialCode: "+213",
    region: "North Africa", languages: ["Arabic", "Berber"], active: false,
  },
  {
    code: "TN", name: "Tunisia",            currency: "TND", currencySymbol: "د.ت", dialCode: "+216",
    region: "North Africa", languages: ["Arabic", "French"], active: false,
  },
  {
    code: "LY", name: "Libya",              currency: "LYD", currencySymbol: "ل.د", dialCode: "+218",
    region: "North Africa", languages: ["Arabic"], active: false,
  },
  {
    code: "SD", name: "Sudan",              currency: "SDG", currencySymbol: "£",    dialCode: "+249",
    region: "North Africa", languages: ["Arabic", "English"], active: false,
  },

  // ── SOUTHERN AFRICA ──────────────────────────────────────────────────────
  {
    code: "ZA", name: "South Africa",       currency: "ZAR", currencySymbol: "R",    dialCode: "+27",
    region: "Southern Africa", languages: ["Zulu", "Xhosa", "Afrikaans", "English"], active: false,
    mobileMoneyProviders: ["MTN MoMo", "Vodacom M-Pesa"],
    paymentMethods: ["MTN MoMo", "Vodacom M-Pesa", "Snapscan", "Visa", "Mastercard"],
  },
  {
    code: "ZW", name: "Zimbabwe",           currency: "ZWL", currencySymbol: "Z$",   dialCode: "+263",
    region: "Southern Africa", languages: ["Shona", "Ndebele", "English"], active: false,
    mobileMoneyProviders: ["EcoCash", "OneMoney"],
  },
  {
    code: "ZM", name: "Zambia",             currency: "ZMW", currencySymbol: "ZK",   dialCode: "+260",
    region: "Southern Africa", languages: ["English"], active: false,
    mobileMoneyProviders: ["MTN MoMo", "Airtel Money"],
  },
  {
    code: "MZ", name: "Mozambique",         currency: "MZN", currencySymbol: "MT",   dialCode: "+258",
    region: "Southern Africa", languages: ["Portuguese"], active: false,
    mobileMoneyProviders: ["M-Pesa", "mKesh"],
  },
  {
    code: "MW", name: "Malawi",             currency: "MWK", currencySymbol: "MK",   dialCode: "+265",
    region: "Southern Africa", languages: ["Chewa", "English"], active: false,
    mobileMoneyProviders: ["TNM Mpamba", "Airtel Money"],
  },
  {
    code: "BW", name: "Botswana",           currency: "BWP", currencySymbol: "P",    dialCode: "+267",
    region: "Southern Africa", languages: ["Setswana", "English"], active: false,
  },
  {
    code: "NA", name: "Namibia",            currency: "NAD", currencySymbol: "N$",   dialCode: "+264",
    region: "Southern Africa", languages: ["English"], active: false,
  },
  {
    code: "SZ", name: "Eswatini",           currency: "SZL", currencySymbol: "L",    dialCode: "+268",
    region: "Southern Africa", languages: ["Swati", "English"], active: false,
  },
  {
    code: "LS", name: "Lesotho",            currency: "LSL", currencySymbol: "L",    dialCode: "+266",
    region: "Southern Africa", languages: ["Sesotho", "English"], active: false,
  },
  {
    code: "AO", name: "Angola",             currency: "AOA", currencySymbol: "Kz",   dialCode: "+244",
    region: "Southern Africa", languages: ["Portuguese"], active: false,
  },

  // ── CENTRAL AFRICA ────────────────────────────────────────────────────────
  {
    code: "CD", name: "DR Congo",           currency: "CDF", currencySymbol: "FC",   dialCode: "+243",
    region: "Central Africa", languages: ["French"], active: false,
    mobileMoneyProviders: ["M-Pesa", "Airtel Money", "Orange Money"],
  },
  {
    code: "CM", name: "Cameroon",           currency: "XAF", currencySymbol: "CFA",  dialCode: "+237",
    region: "Central Africa", languages: ["French", "English"], active: false,
    mobileMoneyProviders: ["MTN MoMo", "Orange Money"],
  },
  {
    code: "CG", name: "Republic of Congo",  currency: "XAF", currencySymbol: "CFA",  dialCode: "+242",
    region: "Central Africa", languages: ["French"], active: false,
  },
  {
    code: "TD", name: "Chad",               currency: "XAF", currencySymbol: "CFA",  dialCode: "+235",
    region: "Central Africa", languages: ["Arabic", "French"], active: false,
  },
  {
    code: "CF", name: "Central African Republic", currency: "XAF", currencySymbol: "CFA", dialCode: "+236",
    region: "Central Africa", languages: ["Sango", "French"], active: false,
  },
  {
    code: "GQ", name: "Equatorial Guinea",  currency: "XAF", currencySymbol: "CFA",  dialCode: "+240",
    region: "Central Africa", languages: ["Spanish", "French", "Portuguese"], active: false,
  },
  {
    code: "GA", name: "Gabon",              currency: "XAF", currencySymbol: "CFA",  dialCode: "+241",
    region: "Central Africa", languages: ["French"], active: false,
  },
  {
    code: "ST", name: "São Tomé & Príncipe",currency: "STN", currencySymbol: "Db",   dialCode: "+239",
    region: "Central Africa", languages: ["Portuguese"], active: false,
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

export const ACTIVE_COUNTRIES = AFRICAN_COUNTRIES.filter((c) => c.active);

export const COUNTRIES_BY_REGION = AFRICAN_COUNTRIES.reduce<Record<AfricanRegion, AfricanCountry[]>>(
  (acc, c) => {
    if (!acc[c.region]) acc[c.region] = [];
    acc[c.region]!.push(c);
    return acc;
  },
  {} as Record<AfricanRegion, AfricanCountry[]>
);

export function getCountry(code: string): AfricanCountry | undefined {
  return AFRICAN_COUNTRIES.find((c) => c.code === code);
}

export function formatAfricanCurrency(amount: number, countryCode = "GH"): string {
  const country = getCountry(countryCode);
  if (!country) return `GH₵${amount.toLocaleString("en-GH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return `${country.currencySymbol}${amount.toLocaleString("en", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// ── Currency exchange rates (relative to GHS, for display) ───────────────────
// These should be fetched from a live API in production
export const APPROXIMATE_RATES_TO_GHS: Record<string, number> = {
  GHS: 1,
  NGN: 0.0083,     // 1 NGN ≈ 0.0083 GHS
  KES: 0.082,      // 1 KES ≈ 0.082 GHS
  ZAR: 0.56,       // 1 ZAR ≈ 0.56 GHS
  USD: 12.5,       // 1 USD ≈ 12.5 GHS
  EUR: 13.7,       // 1 EUR ≈ 13.7 GHS
  GBP: 15.9,       // 1 GBP ≈ 15.9 GHS
  XOF: 0.021,      // CFA Franc West
  XAF: 0.021,      // CFA Franc Central
  ETB: 0.092,
  TZS: 0.0048,
  UGX: 0.0033,
  EGP: 0.26,
  MAD: 1.25,
};

// ── Mobile Money providers across Africa ─────────────────────────────────────
export const AFRICA_MOBILE_MONEY = [
  { name: "MTN MoMo",        countries: ["GH", "NG", "RW", "UG", "CM", "ZM", "BJ", "CI", "ZA"] },
  { name: "M-Pesa",          countries: ["KE", "TZ", "RW", "MZ", "CD", "ZA"] },
  { name: "Orange Money",    countries: ["SN", "CI", "ML", "BF", "CM", "MR"] },
  { name: "Wave",            countries: ["SN", "CI", "ML", "BF"] },
  { name: "Telecel Cash",    countries: ["GH"] },
  { name: "AT Money",        countries: ["GH"] },
  { name: "Airtel Money",    countries: ["KE", "TZ", "RW", "UG", "ZM", "MW"] },
  { name: "EcoCash",         countries: ["ZW"] },
  { name: "Telebirr",        countries: ["ET"] },
  { name: "Vodafone Cash",   countries: ["EG"] },
  { name: "OPay",            countries: ["NG"] },
  { name: "Palmpay",         countries: ["NG"] },
];

// ── African regional economic communities ─────────────────────────────────────
export const ECONOMIC_COMMUNITIES = {
  ECOWAS:  { name: "ECOWAS", members: ["GH","NG","SN","CI","BF","ML","GN","GW","LR","SL","GM","CV","MR","BJ","TG","NE"] },
  EAC:     { name: "East African Community", members: ["KE","TZ","UG","RW","BI","SS","CD"] },
  SADC:    { name: "SADC", members: ["ZA","ZW","ZM","MZ","MW","BW","NA","SZ","LS","AO","MG","MU","SC","TZ","CD"] },
  AU:      { name: "African Union", members: AFRICAN_COUNTRIES.map((c) => c.code) },
  AfCFTA:  { name: "AfCFTA", members: AFRICAN_COUNTRIES.map((c) => c.code) }, // All 54 AU members
};
