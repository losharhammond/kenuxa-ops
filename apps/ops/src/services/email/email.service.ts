/**
 * KENUXA OPS — Email Service
 * Send via Resend, read via provider APIs
 */
import { Resend }       from 'resend'
import { balancedChat } from '@/lib/groq/client'
import type { ComposeEmailParams, EmailThread } from '@/types/ops'

let resendClient: Resend | null = null

function getResend(): Resend {
  if (!resendClient) resendClient = new Resend(process.env.RESEND_API_KEY)
  return resendClient
}

// ── Send email ─────────────────────────────────────────────────────────────────

export async function sendEmail(
  from:   string,
  params: ComposeEmailParams
): Promise<{ id: string; messageId?: string }> {
  const resend = getResend()

  const toArray = Array.isArray(params.to) ? params.to : [params.to]

  const { data, error } = await resend.emails.send({
    from,
    to:      toArray,
    subject: params.subject,
    text:    params.body,
    cc:      params.cc,
    bcc:     params.bcc,
  })

  if (error) throw new Error(error.message)
  if (!data) throw new Error('No response from email service')

  return { id: data.id }
}

// ── AI Draft generation ────────────────────────────────────────────────────────

export async function draftEmail(params: {
  to:          string
  subject?:    string
  instruction: string
  context?:    string
}): Promise<{ subject: string; body: string }> {
  const prompt = `You are a professional email drafting assistant.
Draft a professional email based on this instruction: "${params.instruction}"
To: ${params.to}
${params.subject ? `Subject hint: ${params.subject}` : ''}
${params.context ? `Context: ${params.context}` : ''}

Respond ONLY with JSON: { "subject": "email subject", "body": "email body text" }
Keep it concise and professional.`

  try {
    const res = await balancedChat(
      'You draft professional emails. Always respond with valid JSON.',
      prompt,
      { temperature: 0.3, maxTokens: 500 }
    )
    return JSON.parse(res) as { subject: string; body: string }
  } catch {
    return {
      subject: params.subject ?? 'Follow-up',
      body:    `Hi,\n\n${params.instruction}\n\nBest regards`,
    }
  }
}

// ── Summarize email threads ────────────────────────────────────────────────────

export async function summarizeThreads(threads: EmailThread[]): Promise<string> {
  if (threads.length === 0) return 'Your inbox is empty.'

  const unread    = threads.filter(t => !t.isRead).length
  const important = threads.filter(t => t.isImportant).length

  if (unread === 0) return `All ${threads.length} emails are read.`

  const topThreads = threads
    .filter(t => !t.isRead)
    .slice(0, 5)
    .map(t => `From: ${t.participants[0] ?? 'unknown'} — ${t.subject ?? '(no subject)'}: ${t.snippet ?? ''}`)
    .join('\n')

  const prompt = `Summarize these ${unread} unread emails for a voice assistant in 2-3 sentences:
${topThreads}
${important > 0 ? `\n${important} marked as important.` : ''}
Be brief and mention any urgent items first.`

  try {
    return await balancedChat(
      'You summarize email inboxes briefly for voice assistants.',
      prompt,
      { temperature: 0.2, maxTokens: 100 }
    )
  } catch {
    return `You have ${unread} unread email${unread > 1 ? 's' : ''}${important > 0 ? `, ${important} important` : ''}.`
  }
}

// ── Classify email priority ────────────────────────────────────────────────────

export async function classifyEmail(subject: string, snippet: string): Promise<{
  priority: 'urgent' | 'high' | 'normal' | 'low'
  actionRequired: boolean
  sentiment:      'positive' | 'neutral' | 'negative'
}> {
  try {
    const res = await balancedChat(
      'You classify emails. Respond with JSON only.',
      `Classify this email:
Subject: "${subject}"
Preview: "${snippet.slice(0, 300)}"

Respond: { "priority": "urgent|high|normal|low", "actionRequired": true|false, "sentiment": "positive|neutral|negative" }`,
      { temperature: 0.0, maxTokens: 60 }
    )
    return JSON.parse(res) as { priority: 'urgent' | 'high' | 'normal' | 'low'; actionRequired: boolean; sentiment: 'positive' | 'neutral' | 'negative' }
  } catch {
    return { priority: 'normal', actionRequired: false, sentiment: 'neutral' }
  }
}
