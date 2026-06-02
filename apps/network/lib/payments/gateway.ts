// ============================================================
// KENUXA Payment Gateway Abstraction Layer
// Switching providers requires config change, not code rewrites.
// ============================================================

export type Currency = "GHS" | "NGN" | "KES" | "ZAR" | "ETB" | "UGX" | "TZS" | "RWF" | "XOF" | "USD";

export type PaymentProvider = "paystack" | "flutterwave" | "mtn_momo" | "pesapal" | "stripe";

export type PaymentPurpose =
  | "wallet_topup"
  | "kenux_purchase"
  | "subscription"
  | "marketplace_order"
  | "service_booking"
  | "delivery_fee"
  | "escrow"
  | "loan_repayment";

export interface InitializePaymentInput {
  amount: number;      // in local currency (not subunits)
  currency: Currency;
  email: string;
  userId: string;
  reference: string;
  purpose: PaymentPurpose;
  metadata?: Record<string, unknown>;
  callbackUrl?: string;
}

export interface InitializePaymentResult {
  authorization_url: string;
  access_code?: string;
  reference: string;
  provider: PaymentProvider;
}

export interface VerifyPaymentResult {
  success: boolean;
  reference: string;
  amount: number;
  currency: string;
  userId: string;
  purpose: PaymentPurpose;
  providerRef: string;
  metadata?: Record<string, unknown>;
}

export interface PaymentGateway {
  name: PaymentProvider;
  initialize(input: InitializePaymentInput): Promise<InitializePaymentResult>;
  verify(reference: string): Promise<VerifyPaymentResult>;
  refund(reference: string, amount?: number): Promise<{ success: boolean }>;
  supportedCurrencies(): Currency[];
  supportedCountries(): string[];
}

// ── Paystack Adapter ─────────────────────────────────────────
export class PaystackGateway implements PaymentGateway {
  name: PaymentProvider = "paystack";
  private secretKey = process.env.PAYSTACK_SECRET_KEY ?? "";
  private baseUrl = "https://api.paystack.co";

  async initialize(input: InitializePaymentInput): Promise<InitializePaymentResult> {
    const res = await fetch(`${this.baseUrl}/transaction/initialize`, {
      method: "POST",
      headers: { Authorization: `Bearer ${this.secretKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        email: input.email,
        amount: Math.round(input.amount * 100),
        currency: input.currency,
        reference: input.reference,
        metadata: { user_id: input.userId, purpose: input.purpose, ...input.metadata },
        callback_url: input.callbackUrl,
      }),
    });
    const data = await res.json();
    if (!data.status) throw new Error(data.message ?? "Paystack initialization failed");
    return {
      authorization_url: data.data.authorization_url,
      access_code: data.data.access_code,
      reference: input.reference,
      provider: "paystack",
    };
  }

  async verify(reference: string): Promise<VerifyPaymentResult> {
    const res = await fetch(`${this.baseUrl}/transaction/verify/${reference}`, {
      headers: { Authorization: `Bearer ${this.secretKey}` },
    });
    if (!res.ok) throw new Error(`Paystack verify HTTP ${res.status}`);
    const { data } = await res.json();
    if (!data || data.status !== "success") throw new Error("Payment verification failed");
    return {
      success: true,
      reference,
      amount: data.amount / 100,
      currency: data.currency,
      userId: data.metadata?.user_id,
      purpose: data.metadata?.purpose,
      providerRef: String(data.id),
      metadata: data.metadata,
    };
  }

  async refund(reference: string, amount?: number): Promise<{ success: boolean }> {
    const res = await fetch(`${this.baseUrl}/refund`, {
      method: "POST",
      headers: { Authorization: `Bearer ${this.secretKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ transaction: reference, ...(amount ? { amount: amount * 100 } : {}) }),
    });
    const data = await res.json();
    return { success: data.status === true };
  }

  supportedCurrencies(): Currency[] { return ["GHS", "NGN", "ZAR", "KES", "USD"]; }
  supportedCountries(): string[] { return ["GH", "NG", "ZA", "KE"]; }
}

// ── Flutterwave Adapter ──────────────────────────────────────
export class FlutterwaveGateway implements PaymentGateway {
  name: PaymentProvider = "flutterwave";
  private secretKey = process.env.FLUTTERWAVE_SECRET_KEY ?? "";
  private baseUrl = "https://api.flutterwave.com/v3";

  async initialize(input: InitializePaymentInput): Promise<InitializePaymentResult> {
    const res = await fetch(`${this.baseUrl}/payments`, {
      method: "POST",
      headers: { Authorization: `Bearer ${this.secretKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        tx_ref: input.reference,
        amount: input.amount,
        currency: input.currency,
        redirect_url: input.callbackUrl,
        customer: { email: input.email },
        meta: { user_id: input.userId, purpose: input.purpose, ...input.metadata },
      }),
    });
    const data = await res.json();
    if (data.status !== "success") throw new Error(data.message ?? "Flutterwave initialization failed");
    return {
      authorization_url: data.data.link,
      reference: input.reference,
      provider: "flutterwave",
    };
  }

  async verify(reference: string): Promise<VerifyPaymentResult> {
    const res = await fetch(`${this.baseUrl}/transactions/${reference}/verify`, {
      headers: { Authorization: `Bearer ${this.secretKey}` },
    });
    if (!res.ok) throw new Error(`Flutterwave verify HTTP ${res.status}`);
    const { data } = await res.json();
    if (!data || data.status !== "successful") throw new Error("Flutterwave verification failed");
    return {
      success: true,
      reference,
      amount: data.amount,
      currency: data.currency,
      userId: data.meta?.user_id,
      purpose: data.meta?.purpose,
      providerRef: String(data.id),
      metadata: data.meta,
    };
  }

  async refund(reference: string): Promise<{ success: boolean }> {
    const res = await fetch(`${this.baseUrl}/transactions/${reference}/refund`, {
      method: "POST",
      headers: { Authorization: `Bearer ${this.secretKey}`, "Content-Type": "application/json" },
    });
    const data = await res.json();
    return { success: data.status === "success" };
  }

  supportedCurrencies(): Currency[] { return ["GHS", "NGN", "KES", "ZAR", "ETB", "UGX", "TZS", "RWF", "XOF", "USD"]; }
  supportedCountries(): string[] { return ["GH","NG","KE","ZA","ET","UG","TZ","RW","CI","SN"]; }
}

// ── Gateway Registry ─────────────────────────────────────────
const GATEWAYS: Record<PaymentProvider, PaymentGateway> = {
  paystack:    new PaystackGateway(),
  flutterwave: new FlutterwaveGateway(),
  mtn_momo:    new PaystackGateway(),  // placeholder — wire in MTN SDK
  pesapal:     new PaystackGateway(),  // placeholder
  stripe:      new FlutterwaveGateway(), // placeholder
};

// Country → preferred provider
const COUNTRY_PROVIDER: Record<string, PaymentProvider> = {
  GH: "paystack",
  NG: "paystack",
  KE: "flutterwave",
  ZA: "paystack",
  ET: "flutterwave",
  UG: "flutterwave",
  TZ: "flutterwave",
  RW: "flutterwave",
  CI: "flutterwave",
  SN: "flutterwave",
};

export function getGateway(provider?: PaymentProvider, country?: string): PaymentGateway {
  if (provider && GATEWAYS[provider]) return GATEWAYS[provider]!;
  if (country && COUNTRY_PROVIDER[country]) return GATEWAYS[COUNTRY_PROVIDER[country]!]!;
  return GATEWAYS.paystack!;
}

// ── KENUX Affordability Engine ────────────────────────────────
// Purchasing Power Pricing — local multipliers
export const KENUX_COUNTRY_RATES: Record<string, { currency: Currency; ghsEquiv: number; label: string }> = {
  GH: { currency: "GHS", ghsEquiv: 1,      label: "Ghana Cedis"      },
  NG: { currency: "NGN", ghsEquiv: 0.0096, label: "Nigerian Naira"   },  // NGN:GHS
  KE: { currency: "KES", ghsEquiv: 0.118,  label: "Kenyan Shillings" },
  ZA: { currency: "ZAR", ghsEquiv: 0.81,   label: "South African Rand" },
  ET: { currency: "ETB", ghsEquiv: 0.27,   label: "Ethiopian Birr"   },
  UG: { currency: "UGX", ghsEquiv: 0.004,  label: "Ugandan Shillings"},
  TZ: { currency: "TZS", ghsEquiv: 0.006,  label: "Tanzanian Shillings" },
  RW: { currency: "RWF", ghsEquiv: 0.011,  label: "Rwandan Francs"   },
};

// How many local currency units = 1 KENUX (affordability-adjusted)
export function kenuxLocalPrice(countryCode: string): number {
  const rate = KENUX_COUNTRY_RATES[countryCode];
  if (!rate) return 10; // default GHS
  const ghsPerKenux = 0.10; // 1 KENUX = 0.10 GHS (1 GHS = 10 KENUX)
  return parseFloat((ghsPerKenux / rate.ghsEquiv).toFixed(2));
}
