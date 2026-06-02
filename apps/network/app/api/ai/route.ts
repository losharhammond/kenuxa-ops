import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const SYSTEM_PROMPT = `You are KENUXA AI — an intelligent business assistant for SMEs, with deep expertise in Ghanaian and emerging-market businesses. You have access to the business's data and context.

Your capabilities:
- Analyze sales trends, revenue, customer behavior
- Recommend inventory reorders based on sales velocity
- Generate marketing copy (Facebook posts, WhatsApp campaigns, SMS, Instagram)
- Provide business insights and financial analysis
- Forecast revenue and demand
- Answer questions about running a business in Ghana and beyond

Style: Professional, practical, and commercially relevant. Be concise and actionable. Use data to back recommendations. Respond in English but you understand local context (GHS currency, MoMo payments, local business culture, etc.).`;

export async function POST(req: NextRequest) {
  // Require authentication to prevent free-riding on GROQ quota
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const { systemContext } = body;
    const messages = body.messages;

    // Input validation
    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "messages must be a non-empty array" }, { status: 400 });
    }
    if (messages.length > 50) {
      return NextResponse.json({ error: "Too many messages in conversation" }, { status: 400 });
    }
    // Sanitize: only allow user/assistant roles, max 4000 chars per message
    const sanitizedMessages = messages
      .filter((m: { role: string; content: string }) =>
        (m.role === "user" || m.role === "assistant") && typeof m.content === "string"
      )
      .map((m: { role: string; content: string }) => ({
        role: m.role,
        content: m.content.slice(0, 4000),
      }));

    if (sanitizedMessages.length === 0) {
      return NextResponse.json({ error: "No valid messages provided" }, { status: 400 });
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { reply: "AI is not configured. Add GROQ_API_KEY to your .env.local file." },
        { status: 503 }
      );
    }

    const model = process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile";

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "system",
            content: systemContext
              ? `${SYSTEM_PROMPT}\n\n${String(systemContext).slice(0, 2000)}`
              : SYSTEM_PROMPT,
          },
          ...sanitizedMessages,
        ],
        temperature: 0.7,
        max_tokens: 1024,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("Groq error:", err);
      return NextResponse.json(
        { reply: "AI service error. Please check your API key." },
        { status: 503 }
      );
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content ?? "No response generated.";

    return NextResponse.json({ reply });
  } catch (err) {
    console.error("AI route error:", err);
    return NextResponse.json({ reply: "An error occurred. Please try again." }, { status: 500 });
  }
}
