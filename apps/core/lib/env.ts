import { z } from "zod";

const envSchema = z.object({
  // ─── Supabase ──────────────────────────────────────────────
  NEXT_PUBLIC_SUPABASE_URL:      z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY:     z.string().optional(),

  // ─── JWT ───────────────────────────────────────────────────
  JWT_SECRET: z.string().min(32).optional(),

  // ─── AI — per-app Groq keys for isolated rate limits ──────
  GROQ_API_KEY:         z.string().optional(),   // legacy key — maps to GROQ_CORE_API_KEY
  GROQ_CORE_API_KEY:    z.string().optional(),
  GROQ_REACH_API_KEY:   z.string().optional(),
  GROQ_OPS_API_KEY:     z.string().optional(),
  GROQ_ZURIA_API_KEY:   z.string().optional(),
  GROQ_ACADEMY_API_KEY: z.string().optional(),

  // ─── Additional AI Providers ───────────────────────────────
  OPENAI_API_KEY:     z.string().optional(),
  ANTHROPIC_API_KEY:  z.string().optional(),
  TOGETHER_API_KEY:   z.string().optional(),
  OPENROUTER_API_KEY: z.string().optional(),
  DEEPSEEK_API_KEY:   z.string().optional(),
  MISTRAL_API_KEY:    z.string().optional(),
  GEMINI_API_KEY:     z.string().optional(),
  DEEPGRAM_API_KEY:   z.string().optional(),
  ELEVENLABS_API_KEY: z.string().optional(),

  // ─── Payments ──────────────────────────────────────────────
  PAYSTACK_SECRET_KEY: z.string().optional(),

  // ─── Email ─────────────────────────────────────────────────
  RESEND_API_KEY: z.string().optional(),
  SMTP_URL:       z.string().optional(),

  // ─── Infrastructure ────────────────────────────────────────
  REDIS_URL:   z.string().optional(),
  REDIS_TOKEN: z.string().optional(),

  // ─── Ecosystem ─────────────────────────────────────────────
  KENUXA_CORE_API_KEY: z.string().optional(),   // service-to-service auth key
  ADMIN_SECRET:        z.string().optional(),

  APP_URL: z.string().url().default("http://localhost:3000"),
});

export const env = envSchema.parse(process.env);

export function requireEnv<K extends keyof typeof env>(key: K): NonNullable<(typeof env)[K]> {
  const value = env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value as NonNullable<(typeof env)[K]>;
}
