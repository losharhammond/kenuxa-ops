import { z } from "zod";
import { env } from "@/lib/env";
import { createSupabaseAdminClient, isSupabaseConfigured } from "@/lib/supabase";

export const aiRequestSchema = z.object({
  organizationId: z.string(),
  task: z.string().min(2),
  prompt: z.string().min(2),
  model: z.enum(["llama3-70b-8192", "llama3-8b-8192", "mixtral-8x7b-32768", "gemma-7b-it"]).default("llama3-8b-8192"),
  context: z.record(z.unknown()).default({})
});

export async function runAiRequest(rawInput: z.input<typeof aiRequestSchema>) {
  const input = aiRequestSchema.parse(rawInput);
  const startedAt = Date.now();
  const provider = env.GROQ_API_KEY ? "groq" : "stub";
  const output = provider === "stub"
    ? `Stubbed ${input.model} response for task: ${input.task}`
    : await callGroq(input.model, input.prompt);

  const record = {
    organization_id: input.organizationId,
    provider,
    model: input.model,
    task: input.task,
    prompt_tokens: estimateTokens(input.prompt),
    completion_tokens: estimateTokens(output),
    latency_ms: Date.now() - startedAt,
    status: "completed",
    metadata: input.context
  };

  if (isSupabaseConfigured) {
    const supabase = createSupabaseAdminClient();
    await supabase.from("ai_requests").insert(record);
  }

  return { output, usage: record };
}

async function callGroq(model: string, prompt: string) {
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      authorization: `Bearer ${env.GROQ_API_KEY}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2
    })
  });
  if (!response.ok) throw new Error(`Groq request failed: ${response.status}`);
  const json = await response.json();
  return json.choices?.[0]?.message?.content ?? "";
}

function estimateTokens(text: string) {
  return Math.ceil(text.length / 4);
}
