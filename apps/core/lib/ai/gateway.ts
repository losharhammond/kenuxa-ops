/**
 * KENUXA CORE — AI Gateway
 *
 * Ecosystem-wide AI orchestration layer.
 * Supports: Groq, OpenAI, Anthropic, OpenRouter, Gemini, Ollama.
 * Each app (REACH, OPS, ZURIA, Academy) can have isolated API keys.
 * Provider failover is automatic; all requests are logged.
 */

import { env } from "@/lib/env";
import { createSupabaseAdminClient, isSupabaseConfigured } from "@/lib/supabase";

export type AITier = "fast" | "balanced" | "powerful";
export type AIApp  = "core" | "reach" | "ops" | "zuria" | "academy";
export type AIProvider = "groq" | "openai" | "anthropic" | "openrouter" | "gemini" | "ollama" | "auto";

// ─── Model registries ─────────────────────────────────────────────────────────

const MODELS: Record<AIProvider, Partial<Record<AITier, string>>> = {
  groq: {
    fast:     "llama-3.1-8b-instant",
    balanced: "llama-3.3-70b-versatile",
    powerful: "llama-3.3-70b-versatile",
  },
  openai: {
    fast:     "gpt-4o-mini",
    balanced: "gpt-4o-mini",
    powerful: "gpt-4o",
  },
  anthropic: {
    fast:     "claude-haiku-4-5-20251001",
    balanced: "claude-sonnet-4-6",
    powerful: "claude-opus-4-7",
  },
  openrouter: {
    fast:     "meta-llama/llama-3.1-8b-instruct:free",
    balanced: "meta-llama/llama-3.3-70b-instruct",
    powerful: "anthropic/claude-opus-4-7",
  },
  gemini: {
    fast:     "gemini-2.0-flash",
    balanced: "gemini-1.5-pro",
    powerful: "gemini-1.5-pro",
  },
  ollama: {
    fast:     "llama3",
    balanced: "llama3",
    powerful: "llama3:70b",
  },
  auto: {},
};

// Cost per 1K tokens (USD): [input, output]
const COST_RATES: Record<string, [number, number]> = {
  "groq:llama-3.1-8b-instant":       [0.00005,  0.00008],
  "groq:llama-3.3-70b-versatile":    [0.00059,  0.00079],
  "openai:gpt-4o-mini":              [0.00015,  0.00060],
  "openai:gpt-4o":                   [0.00250,  0.01000],
  "anthropic:claude-haiku-4-5-20251001": [0.00025, 0.00125],
  "anthropic:claude-sonnet-4-6":     [0.00300,  0.01500],
  "anthropic:claude-opus-4-7":       [0.01500,  0.07500],
  "openrouter:meta-llama/llama-3.1-8b-instruct:free": [0, 0],
  "openrouter:meta-llama/llama-3.3-70b-instruct":     [0.00059, 0.00079],
  "openrouter:anthropic/claude-opus-4-7":              [0.01500, 0.07500],
  "gemini:gemini-2.0-flash":         [0.00010,  0.00040],
  "gemini:gemini-1.5-pro":           [0.00125,  0.00375],
  "ollama:llama3":                   [0, 0],
  "ollama:llama3:70b":               [0, 0],
};

// ─── Per-app key resolution ───────────────────────────────────────────────────

function getKeyForApp(provider: AIProvider, app: AIApp): string | undefined {
  if (provider === "groq") {
    const map: Record<AIApp, string | undefined> = {
      core:    env.GROQ_CORE_API_KEY    ?? env.GROQ_API_KEY,
      reach:   env.GROQ_REACH_API_KEY   ?? env.GROQ_CORE_API_KEY ?? env.GROQ_API_KEY,
      ops:     env.GROQ_OPS_API_KEY     ?? env.GROQ_CORE_API_KEY ?? env.GROQ_API_KEY,
      zuria:   env.GROQ_ZURIA_API_KEY   ?? env.GROQ_CORE_API_KEY ?? env.GROQ_API_KEY,
      academy: env.GROQ_ACADEMY_API_KEY ?? env.GROQ_CORE_API_KEY ?? env.GROQ_API_KEY,
    };
    return map[app];
  }
  if (provider === "openai")      return env.OPENAI_API_KEY;
  if (provider === "anthropic")   return env.ANTHROPIC_API_KEY;
  if (provider === "openrouter")  return env.OPENROUTER_API_KEY;
  if (provider === "gemini")      return env.GEMINI_API_KEY;
  if (provider === "ollama")      return "local"; // no key needed
  return undefined;
}

// ─── Public types ─────────────────────────────────────────────────────────────

export interface AICoreRequest {
  app:            AIApp;
  organizationId: string;
  task:           string;
  prompt:         string;
  systemPrompt?:  string;
  tier?:          AITier;
  provider?:      AIProvider;
  temperature?:   number;
  maxTokens?:     number;
  metadata?:      Record<string, unknown>;
}

export interface AICoreResponse {
  output:              string;
  provider:            string;
  model:               string;
  prompt_tokens:       number;
  completion_tokens:   number;
  latency_ms:          number;
  estimated_cost_usd:  number;
}

// ─── Main entry point ─────────────────────────────────────────────────────────

export async function runAI(req: AICoreRequest): Promise<AICoreResponse> {
  const tier        = req.tier ?? "balanced";
  const temperature = req.temperature ?? 0.2;
  const messages    = buildMessages(req.systemPrompt, req.prompt);

  // Determine provider order
  const providerOrder: AIProvider[] =
    req.provider === "auto" || !req.provider
      ? ["groq", "openrouter", "openai", "anthropic"]
      : [req.provider];

  let lastError: Error | null = null;
  const failovers: string[] = [];

  for (const p of providerOrder) {
    const key = getKeyForApp(p, req.app);
    if (!key || key.length === 0) continue;

    try {
      const result = await callProvider(p, key, tier, messages, temperature, req.maxTokens);

      // Log failover if applicable
      if (failovers.length > 0 && isSupabaseConfigured) {
        void (async () => {
          try {
            const supabase = createSupabaseAdminClient();
            await supabase.from("ai_failover_logs").insert({
              organization_id: req.organizationId,
              from_provider:   failovers[failovers.length - 1],
              to_provider:     p,
              model:           result.model,
              reason:          lastError?.message,
              latency_ms:      result.latency_ms,
            });
          } catch { /* non-blocking */ }
        })();
      }

      // Log usage
      if (isSupabaseConfigured) {
        void (async () => {
          try {
            const supabase = createSupabaseAdminClient();
            await supabase.from("ai_requests").insert({
              organization_id:    req.organizationId,
              provider:           result.provider,
              model:              result.model,
              task:               req.task,
              prompt_tokens:      result.prompt_tokens,
              completion_tokens:  result.completion_tokens,
              estimated_cost_usd: result.estimated_cost_usd,
              latency_ms:         result.latency_ms,
              status:             "completed",
              metadata:           req.metadata ?? {},
            });
          } catch { /* non-blocking */ }
        })();
      }

      return result;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      failovers.push(p);
    }
  }

  throw lastError ?? new Error("All AI providers exhausted");
}

// ─── Provider callers ─────────────────────────────────────────────────────────

type Message = { role: "system" | "user" | "assistant"; content: string };

function buildMessages(systemPrompt: string | undefined, prompt: string): Message[] {
  return [
    ...(systemPrompt ? [{ role: "system" as const, content: systemPrompt }] : []),
    { role: "user" as const, content: prompt },
  ];
}

async function callProvider(
  provider: AIProvider,
  apiKey: string,
  tier: AITier,
  messages: Message[],
  temperature: number,
  maxTokens?: number,
): Promise<AICoreResponse> {
  const start = Date.now();

  if (provider === "groq" || provider === "openai" || provider === "openrouter") {
    const urls: Record<AIProvider, string> = {
      groq:       "https://api.groq.com/openai/v1/chat/completions",
      openai:     "https://api.openai.com/v1/chat/completions",
      openrouter: "https://openrouter.ai/api/v1/chat/completions",
      anthropic:  "",
      gemini:     "",
      ollama:     "http://localhost:11434/v1/chat/completions",
      auto:       "",
    };
    const model = MODELS[provider]?.[tier] ?? MODELS[provider]?.balanced ?? "";
    const headers: Record<string, string> = {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    };
    if (provider === "openrouter") {
      headers["HTTP-Referer"] = "https://kenuxa.io";
      headers["X-Title"]      = "KENUXA CORE";
    }

    const res = await fetch(urls[provider], {
      method: "POST",
      headers,
      body: JSON.stringify({ model, messages, temperature, ...(maxTokens ? { max_tokens: maxTokens } : {}) }),
    });
    if (!res.ok) throw new Error(`${provider} ${res.status}: ${await res.text()}`);
    const json = await res.json() as {
      choices: [{ message: { content: string } }];
      usage: { prompt_tokens: number; completion_tokens: number };
    };
    return buildResponse(provider, model, json.choices[0]!.message.content, json.usage, Date.now() - start);
  }

  if (provider === "ollama") {
    const model = MODELS.ollama?.[tier] ?? "llama3";
    const res = await fetch("http://localhost:11434/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model, messages, temperature, ...(maxTokens ? { max_tokens: maxTokens } : {}) }),
    });
    if (!res.ok) throw new Error(`Ollama ${res.status}: ${await res.text()}`);
    const json = await res.json() as {
      choices: [{ message: { content: string } }];
      usage: { prompt_tokens: number; completion_tokens: number };
    };
    return buildResponse("ollama", model, json.choices[0]!.message.content, json.usage, Date.now() - start);
  }

  if (provider === "anthropic") {
    const model  = MODELS.anthropic?.[tier] ?? MODELS.anthropic?.balanced ?? "";
    const system = messages.find(m => m.role === "system")?.content;
    const turns  = messages.filter(m => m.role !== "system");

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens ?? 2048,
        ...(system ? { system } : {}),
        messages: turns,
      }),
    });
    if (!res.ok) throw new Error(`Anthropic ${res.status}: ${await res.text()}`);
    const json = await res.json() as {
      content: [{ type: string; text: string }];
      usage: { input_tokens: number; output_tokens: number };
    };
    const text = json.content.filter(c => c.type === "text").map(c => c.text).join("");
    return buildResponse("anthropic", model, text, {
      prompt_tokens: json.usage.input_tokens,
      completion_tokens: json.usage.output_tokens,
    }, Date.now() - start);
  }

  if (provider === "gemini") {
    const model = MODELS.gemini?.[tier] ?? "gemini-2.0-flash";
    const geminiMessages = messages
      .filter(m => m.role !== "system")
      .map(m => ({ role: m.role === "user" ? "user" : "model", parts: [{ text: m.content }] }));
    const systemInstruction = messages.find(m => m.role === "system")?.content;

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: geminiMessages,
          ...(systemInstruction ? { systemInstruction: { parts: [{ text: systemInstruction }] } } : {}),
          generationConfig: { temperature, ...(maxTokens ? { maxOutputTokens: maxTokens } : {}) },
        }),
      },
    );
    if (!res.ok) throw new Error(`Gemini ${res.status}: ${await res.text()}`);
    const json = await res.json() as {
      candidates: [{ content: { parts: [{ text: string }] } }];
      usageMetadata: { promptTokenCount: number; candidatesTokenCount: number };
    };
    const text = json.candidates[0]?.content.parts.map(p => p.text).join("") ?? "";
    return buildResponse("gemini", model, text, {
      prompt_tokens: json.usageMetadata.promptTokenCount,
      completion_tokens: json.usageMetadata.candidatesTokenCount,
    }, Date.now() - start);
  }

  throw new Error(`Unknown provider: ${provider}`);
}

function buildResponse(
  provider: string,
  model: string,
  content: string,
  usage: { prompt_tokens: number; completion_tokens: number },
  latency_ms: number,
): AICoreResponse {
  const rates = COST_RATES[`${provider}:${model}`] ?? [0.001, 0.002];
  const cost  = (usage.prompt_tokens / 1000) * rates[0] + (usage.completion_tokens / 1000) * rates[1];

  return {
    output:             content,
    provider,
    model,
    prompt_tokens:      usage.prompt_tokens,
    completion_tokens:  usage.completion_tokens,
    latency_ms,
    estimated_cost_usd: cost,
  };
}

// ─── Provider availability check ─────────────────────────────────────────────

export function getAvailableProviders(app: AIApp = "core"): Array<{ provider: AIProvider; configured: boolean; models: string[] }> {
  const providers: AIProvider[] = ["groq", "openai", "anthropic", "openrouter", "gemini", "ollama"];
  return providers.map(p => ({
    provider: p,
    configured: !!getKeyForApp(p, app),
    models: Object.values(MODELS[p] ?? {}),
  }));
}
