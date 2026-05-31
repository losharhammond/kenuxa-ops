import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(
  amount: number,
  currency = "GHS",
  locale = "en-GH"
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

export function formatDate(date: string | Date, opts?: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat("en-GH", {
    day: "numeric",
    month: "short",
    year: "numeric",
    ...opts,
  }).format(new Date(date));
}

export function timeAgo(date: string | Date): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(date);
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function generateReceiptNo(): string {
  const date = new Date();
  const prefix = `RCP`;
  const datePart = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}`;
  const rand = Math.floor(Math.random() * 10000).toString().padStart(4, "0");
  return `${prefix}-${datePart}-${rand}`;
}

export function calculateChangePercent(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

export function truncate(text: string, maxLen = 100): string {
  if (!text) return "";
  return text.length <= maxLen ? text : `${text.slice(0, maxLen)}…`;
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: "Cash",
  mtn_momo: "MTN MoMo",
  telecel_cash: "Telecel Cash",
  at_money: "AT Money",
  visa: "Visa",
  mastercard: "Mastercard",
  bank_transfer: "Bank Transfer",
  wallet: "KENUXA Wallet",
};

export const BUSINESS_TYPE_LABELS: Record<string, string> = {
  retailer: "Retailer",
  supermarket: "Supermarket",
  pharmacy: "Pharmacy",
  restaurant: "Restaurant",
  hotel: "Hotel",
  manufacturer: "Manufacturer",
  distributor: "Distributor",
  service_provider: "Service Provider",
  professional: "Professional",
  freelancer: "Freelancer",
  agency: "Agency",
  contractor: "Contractor",
  wholesaler: "Wholesaler",
  importer: "Importer",
};
