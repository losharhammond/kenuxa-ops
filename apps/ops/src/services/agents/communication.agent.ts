/**
 * KENUXA OPS — Communication Agent (Phase 4)
 *
 * Responsibilities:
 *  - Handle all email operations via Microsoft Outlook (PRIMARY)
 *  - Fallback to existing email API if Outlook not connected
 *  - Classify, summarize, draft, and send messages
 *  - Log every email action to Supabase
 *
 * Phase 4 mandate: Outlook is DEFAULT. Gmail is SECONDARY fallback only.
 */
import {
  listMessages,
  getMessage,
  sendMessage,
  isMicrosoftConfigured,
  getOutlookStatus,
} from '@/lib/microsoft/graph.client'
import { balancedChat, fastJSON } from '@/lib/groq/client'
import type { AgentTask, AgentResult } from '@/types/ops'

// ── Main dispatcher ────────────────────────────────────────────────────────────

export async function runCommunicationAgent(task: AgentTask): Promise<AgentResult> {
  const start = Date.now()

  try {
    let output: unknown

    switch (task.action) {
      case 'email_read':
      case 'list_emails':
        output = await actionListEmails(task)
        break

      case 'email_read_thread':
      case 'get_email':
        output = await actionGetEmail(task)
        break

      case 'email_send':
      case 'send_email':
        output = await actionSendEmail(task)
        break

      case 'email_draft':
      case 'draft_email':
        output = await actionDraftEmail(task)
        break

      case 'email_classify':
      case 'classify_emails':
        output = await actionClassifyEmails(task)
        break

      case 'email_summarize':
      case 'summarize_inbox':
        output = await actionSummarizeInbox(task)
        break

      case 'outlook_status':
        output = await getOutlookStatus(task.userId)
        break

      default:
        output = { error: `Unknown communication action: ${task.action}` }
    }

    const err = (output as Record<string, unknown>)?.['error']
    const success = !err

    return {
      agentType:  'communication',
      taskId:     task.id,
      success,
      output,
      error:      err ? String(err) : undefined,
      durationMs: Date.now() - start,
      metadata:   { action: task.action, provider: getProvider(task.userId) },
    }
  } catch (err) {
    return {
      agentType:  'communication',
      taskId:     task.id,
      success:    false,
      error:      (err as Error).message,
      durationMs: Date.now() - start,
    }
  }
}

// ── Provider selection ─────────────────────────────────────────────────────────

function getProvider(_userId: string): string {
  return isMicrosoftConfigured() ? 'outlook-graph' : 'legacy-api'
}

// ── Action implementations ─────────────────────────────────────────────────────

async function actionListEmails(task: AgentTask) {
  const count  = Number(task.payload['count']  ?? 10)
  const filter = task.payload['filter'] as string | undefined

  // Try Outlook (primary)
  if (isMicrosoftConfigured()) {
    const { messages, error } = await listMessages(task.userId, {
      top:    count,
      filter: filter
        ? `contains(subject,'${filter}') or contains(bodyPreview,'${filter}')`
        : undefined,
    })

    if (!error) {
      return {
        messages: messages.map(m => ({
          id:          m.id,
          subject:     m.subject,
          from:        m.from.emailAddress.address,
          bodyPreview: m.bodyPreview,
          receivedAt:  m.receivedDateTime,
          isRead:      m.isRead,
          importance:  m.importance,
          provider:    'outlook',
        })),
        total:    messages.length,
        provider: 'outlook',
      }
    }
    // Fall through to legacy API on error
    console.warn('[communication-agent] Outlook failed, falling back:', error)
  }

  // Fallback: legacy email API
  return legacyListEmails(task.userId, count)
}

async function actionGetEmail(task: AgentTask) {
  const messageId = task.payload['messageId'] as string
  if (!messageId) return { error: 'messageId required' }

  if (isMicrosoftConfigured()) {
    const { message, error } = await getMessage(task.userId, messageId)
    if (!error && message) {
      return {
        id:          message.id,
        subject:     message.subject,
        from:        message.from.emailAddress.address,
        body:        message.body?.content,
        bodyPreview: message.bodyPreview,
        receivedAt:  message.receivedDateTime,
        isRead:      message.isRead,
        provider:    'outlook',
      }
    }
    console.warn('[communication-agent] Outlook getMessage failed:', error)
  }

  return { error: 'Message not found', messageId }
}

async function actionSendEmail(task: AgentTask) {
  const to      = task.payload['to']      as string
  const subject = task.payload['subject'] as string
  const body    = task.payload['body']    as string
  const cc      = task.payload['cc']      as string | undefined

  if (!to || !body) return { error: 'to and body are required for email_send' }

  // Outlook (primary)
  if (isMicrosoftConfigured()) {
    const { success, error } = await sendMessage(task.userId, {
      to,
      subject: subject ?? 'Message from KENUXA OPS',
      body,
      cc,
    })

    if (success) {
      await logEmailAction(task.userId, 'sent', { to, subject })
      return { sent: true, to, subject, provider: 'outlook' }
    }
    console.warn('[communication-agent] Outlook send failed:', error)
  }

  // Fallback: legacy email API
  return legacySendEmail({ to, subject, body })
}

async function actionDraftEmail(task: AgentTask) {
  const instruction = task.payload['instruction'] as string ?? 'Write a professional email'
  const to          = task.payload['to']          as string ?? ''
  const subject     = task.payload['subject']     as string ?? ''
  const context     = task.payload['context']     as string ?? ''

  const draft = await balancedChat(
    'You are a professional email writer for KENUXA OPS. Generate concise, clear, professional emails.',
    `${instruction}

${context ? `Context: ${context.slice(0, 500)}` : ''}
${to      ? `To: ${to}` : ''}
${subject ? `Subject: ${subject}` : ''}

Return ONLY the email body — no subject line, no metadata, no "Dear..." unless appropriate.`,
    { temperature: 0.2, maxTokens: 400 }
  )

  return { draft, to, subject, provider: 'groq-drafted' }
}

async function actionClassifyEmails(task: AgentTask) {
  // Get recent emails first
  const emailData = await actionListEmails({ ...task, payload: { count: 20 } })
  const messages  = (emailData as { messages?: unknown[] }).messages ?? []

  if (messages.length === 0) return { classified: [], total: 0 }

  const classified = await fastJSON<{ classified: Array<{
    id: string; subject: string; category: string; priority: string; actionRequired: boolean
  }>}>(
    'You are an email classifier. Categorize emails accurately.',
    `Classify these ${messages.length} emails:
${JSON.stringify(messages.map((m: unknown) => {
  const msg = m as Record<string, unknown>
  return { id: msg['id'], subject: msg['subject'], preview: msg['bodyPreview'] }
}), null, 2).slice(0, 2000)}

Return JSON: { "classified": [{ "id": "...", "subject": "...", "category": "work|personal|newsletter|urgent|spam|notification", "priority": "high|medium|low", "actionRequired": true/false }] }`,
    { temperature: 0.1 }
  )

  return classified ?? { classified: [], total: 0 }
}

async function actionSummarizeInbox(task: AgentTask) {
  const emailData = await actionListEmails({ ...task, payload: { count: 15 } })
  const messages  = (emailData as { messages?: unknown[] }).messages ?? []

  if (messages.length === 0) return { summary: 'Inbox is empty.', count: 0 }

  const summary = await balancedChat(
    'You are KENUXA OPS, an executive assistant. Summarize inbox concisely for a busy professional.',
    `Summarize these ${messages.length} emails into a brief executive briefing:
${JSON.stringify(messages.slice(0, 10).map((m: unknown) => {
  const msg = m as Record<string, unknown>
  return { from: msg['from'], subject: msg['subject'], preview: msg['bodyPreview'] }
}), null, 2).slice(0, 1500)}

Format: Brief paragraph summary + 3-5 bullet points for action items.`,
    { temperature: 0.2, maxTokens: 350 }
  )

  return { summary, count: messages.length, provider: getProvider(task.userId) }
}

// ── Log email actions to Supabase ──────────────────────────────────────────────

async function logEmailAction(
  userId:  string,
  action:  string,
  details: Record<string, unknown>
): Promise<void> {
  try {
    const { createServiceClient } = await import('@/lib/supabase/server')
    const supabase = await createServiceClient()
    await supabase.from('email_logs').insert({
      user_id:    userId,
      action,
      details,
      provider:   'outlook',
      created_at: new Date().toISOString(),
    })
  } catch {
    // Non-fatal — don't break execution if logging fails
  }
}

// ── Legacy API fallbacks ───────────────────────────────────────────────────────

async function legacyListEmails(userId: string, count: number): Promise<unknown> {
  try {
    const base = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3002'
    const res  = await fetch(`${base}/api/email?action=list&userId=${userId}`)
    const j    = await res.json() as { data?: unknown[] }
    return {
      messages: (j.data ?? []).slice(0, count),
      total:    j.data?.length ?? 0,
      provider: 'legacy',
    }
  } catch (e) {
    return { error: (e as Error).message, messages: [], provider: 'legacy' }
  }
}

async function legacySendEmail(
  params: { to: string; subject?: string; body: string }
): Promise<unknown> {
  try {
    const base = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3002'
    const res  = await fetch(`${base}/api/email`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ action: 'send', ...params }),
    })
    return res.ok
      ? { sent: true, to: params.to, subject: params.subject, provider: 'legacy' }
      : { error: `Email API ${res.status}`, provider: 'legacy' }
  } catch (e) {
    return { error: (e as Error).message, provider: 'legacy' }
  }
}
