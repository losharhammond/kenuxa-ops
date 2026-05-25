/**
 * KENUXA CORE — AI Gateway API
 *
 * POST /api/ai
 * Used by all KENUXA apps to send AI requests through the ecosystem gateway.
 * Handles routing, fallback, cost tracking, and logging.
 *
 * Auth: Bearer JWT or X-Service-Key header
 */
import { NextRequest, NextResponse } from "next/server"
import { runAI } from "@/lib/ai/gateway"
import { requireServiceAuth } from "@/lib/auth/service-auth"

export async function POST(req: NextRequest) {
  const authError = await requireServiceAuth(req)
  if (authError) return authError

  try {
    const body = await req.json() as Record<string, unknown>

    const {
      app            = "core",
      organizationId,
      task,
      prompt,
      systemPrompt,
      tier           = "balanced",
      provider       = "auto",
      temperature    = 0.2,
      maxTokens,
      metadata       = {},
    } = body

    if (!organizationId || !task || !prompt) {
      return NextResponse.json(
        { error: "organizationId, task, and prompt are required" },
        { status: 400 }
      )
    }

    const result = await runAI({
      app:            app as "core" | "reach" | "ops" | "zuria" | "academy",
      organizationId: organizationId as string,
      task:           task as string,
      prompt:         prompt as string,
      systemPrompt:   systemPrompt as string | undefined,
      tier:           tier as "fast" | "balanced" | "powerful",
      provider:       provider as "groq" | "openai" | "anthropic" | "auto",
      temperature:    temperature as number,
      maxTokens:      maxTokens as number | undefined,
      metadata:       metadata as Record<string, unknown>,
    })

    return NextResponse.json({ data: result })
  } catch (err) {
    const msg = err instanceof Error ? err.message : "AI request failed"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
