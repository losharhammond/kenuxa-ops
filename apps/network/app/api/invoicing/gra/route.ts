/**
 * GRA E-Invoicing (EFRIS) Integration
 *
 * Submits an invoice to the Ghana Revenue Authority's Electronic Fiscal
 * Receipting and Invoicing Solution (EFRIS) system.
 *
 * Feature flag: `e_invoicing` must be enabled in feature_flags table.
 * Required env vars (set when GRA credentials are issued):
 *   GRA_EFRIS_BASE_URL   — e.g. https://efris.gra.gov.gh/api/v1
 *   GRA_EFRIS_CLIENT_ID  — issued by GRA
 *   GRA_EFRIS_SECRET_KEY — HMAC signing key
 *
 * POST /api/invoicing/gra
 * Body: { invoice_id: string }
 */

import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface GraLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  taxCode: string; // e.g. "VAT" | "EXEMPT" | "NHIL"
  totalAmount: number;
}

interface GraInvoicePayload {
  invoiceNumber: string;
  invoiceDate: string;        // ISO date
  buyerName: string;
  buyerTin?: string;
  currency: string;
  lineItems: GraLineItem[];
  subTotal: number;
  vatAmount: number;
  totalAmount: number;
  businessTin: string;
  businessName: string;
}

// Stub: generate HMAC-SHA256 signature for GRA request
async function signPayload(payload: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const msgData = encoder.encode(payload);
  const key = await crypto.subtle.importKey("raw", keyData, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, msgData);
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Check feature flag
  const { data: flag } = await supabase
    .from("feature_flags")
    .select("value")
    .eq("key", "e_invoicing")
    .single();

  if (!flag?.value) {
    return NextResponse.json(
      { error: "GRA e-invoicing is not enabled. Contact your administrator." },
      { status: 503 }
    );
  }

  // Check GRA credentials
  const graBaseUrl = process.env.GRA_EFRIS_BASE_URL;
  const graClientId = process.env.GRA_EFRIS_CLIENT_ID;
  const graSecretKey = process.env.GRA_EFRIS_SECRET_KEY;

  if (!graBaseUrl || !graClientId || !graSecretKey) {
    return NextResponse.json(
      { error: "GRA credentials not configured. Set GRA_EFRIS_BASE_URL, GRA_EFRIS_CLIENT_ID, and GRA_EFRIS_SECRET_KEY." },
      { status: 503 }
    );
  }

  const body = await request.json() as { invoice_id?: string };
  if (!body.invoice_id) {
    return NextResponse.json({ error: "invoice_id is required" }, { status: 400 });
  }

  // Fetch invoice with line items
  const { data: profile } = await supabase.from("user_profiles").select("business_id").eq("id", user.id).single();
  if (!profile?.business_id) return NextResponse.json({ error: "No business" }, { status: 403 });

  const { data: invoice } = await supabase
    .from("invoices")
    .select(`
      id, invoice_number, created_at, total, subtotal, tax, currency,
      client_name, client_email,
      invoice_items ( description, quantity, unit_price, total ),
      businesses ( name, tin )
    `)
    .eq("id", body.invoice_id)
    .eq("business_id", profile.business_id)
    .single();

  if (!invoice) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });

  // Check if already submitted
  const { data: existing } = await supabase
    .from("invoices")
    .select("gra_submission_id, gra_status")
    .eq("id", body.invoice_id)
    .single();

  if (existing?.gra_submission_id) {
    return NextResponse.json({
      already_submitted: true,
      submission_id: existing.gra_submission_id,
      status: existing.gra_status,
    }, { status: 409 });
  }

  // Build GRA payload
  const lineItems: GraLineItem[] = ((invoice.invoice_items as { description: string; quantity: number; unit_price: number; total: number }[]) ?? []).map((item) => ({
    description: item.description ?? "Service",
    quantity:    item.quantity   ?? 1,
    unitPrice:   item.unit_price ?? 0,
    taxCode:     "VAT",
    totalAmount: item.total      ?? 0,
  }));

  // Supabase join returns array or object depending on relationship cardinality
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const businessRaw = invoice.businesses as any;
  const business: { name: string; tin?: string } | null =
    Array.isArray(businessRaw) ? (businessRaw[0] ?? null) : (businessRaw ?? null);
  const payload: GraInvoicePayload = {
    invoiceNumber: invoice.invoice_number ?? invoice.id.slice(0, 8).toUpperCase(),
    invoiceDate:   (invoice.created_at as string).slice(0, 10),
    buyerName:     invoice.client_name ?? "Customer",
    currency:      (invoice.currency as string) ?? "GHS",
    lineItems,
    subTotal:      (invoice.subtotal as number) ?? 0,
    vatAmount:     (invoice.tax as number)      ?? 0,
    totalAmount:   (invoice.total as number)    ?? 0,
    businessTin:   business?.tin ?? "",
    businessName:  business?.name ?? "",
  };

  const payloadStr = JSON.stringify(payload);
  const signature  = await signPayload(payloadStr, graSecretKey);

  // Submit to GRA EFRIS
  try {
    const graRes = await fetch(`${graBaseUrl}/invoices/submit`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Client-ID":  graClientId,
        "X-Signature":  signature,
      },
      body: payloadStr,
    });

    const graData = await graRes.json() as { submissionId?: string; status?: string; message?: string };

    if (!graRes.ok) {
      return NextResponse.json(
        { error: "GRA submission failed", detail: graData.message },
        { status: 502 }
      );
    }

    // Persist GRA submission ID on the invoice
    await supabase
      .from("invoices")
      .update({
        gra_submission_id: graData.submissionId,
        gra_status: graData.status ?? "submitted",
        gra_submitted_at: new Date().toISOString(),
      })
      .eq("id", body.invoice_id);

    return NextResponse.json({
      success: true,
      submission_id: graData.submissionId,
      status: graData.status,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Network error";
    return NextResponse.json({ error: "Failed to reach GRA EFRIS", detail: message }, { status: 502 });
  }
}
