import { NextRequest, NextResponse } from "next/server";

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
  try {
    const { messages, systemContext } = await req.json();

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { reply: "AI is not configured. Add GROQ_API_KEY to your .env.local file." },
        { status: 200 }
      );
    }

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.1-70b-versatile",
        messages: [
          { role: "system", content: systemContext ? `${SYSTEM_PROMPT}\n\n${systemContext}` : SYSTEM_PROMPT },
          ...messages.map((m: { role: string; content: string }) => ({
            role: m.role,
            content: m.content,
          })),
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
        { status: 200 }
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
