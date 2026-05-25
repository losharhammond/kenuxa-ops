/**
 * /api/email — Email operations
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient }              from '@/lib/supabase/server'
import { sendEmail, draftEmail, summarizeThreads } from '@/services/email/email.service'
import type { EmailThread }          from '@/types/ops'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body   = await req.json() as { action?: string; [key: string]: unknown }
    const action = body.action ?? 'send'

    // ── Send email ────────────────────────────────────────────────────────────
    if (action === 'send') {
      const from     = process.env.RESEND_FROM_EMAIL ?? `ops@${process.env.EMAIL_DOMAIN ?? 'kenuxa.io'}`
      const result   = await sendEmail(from, {
        to:      body['to']      as string,
        subject: body['subject'] as string ?? '(no subject)',
        body:    body['body']    as string ?? '',
        cc:      body['cc']      as string[] | undefined,
      })
      return NextResponse.json({ data: result })
    }

    // ── Read emails (cached from DB) ──────────────────────────────────────────
    if (action === 'read') {
      const count  = Number(body['count'] ?? 5)
      const filter = body['filter'] as string | undefined

      let q = supabase
        .from('ops_email_threads')
        .select('*')
        .eq('user_id', user.id)
        .order('last_message_at', { ascending: false })
        .limit(count)

      if (filter === 'unread')    q = q.eq('is_read', false)
      if (filter === 'important') q = q.eq('is_important', true)

      const { data, error } = await q
      if (error) throw error

      const threads = (data ?? []) as EmailThread[]
      const { summarizeThreads: summarize } = await import('@/services/email/email.service')
      const summary = await summarize(threads)

      return NextResponse.json({ data: { emails: threads, summary } })
    }

    // ── Summarize ─────────────────────────────────────────────────────────────
    if (action === 'summarize') {
      const { data, error } = await supabase
        .from('ops_email_threads')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_read', false)
        .order('last_message_at', { ascending: false })
        .limit(20)

      if (error) throw error
      const summary = await summarizeThreads((data ?? []) as EmailThread[])
      return NextResponse.json({ data: { summary } })
    }

    // ── Search ────────────────────────────────────────────────────────────────
    if (action === 'search') {
      const query = body['query'] as string
      const { data, count, error } = await supabase
        .from('ops_email_threads')
        .select('*', { count: 'exact' })
        .eq('user_id', user.id)
        .or(`subject.ilike.%${query}%,snippet.ilike.%${query}%`)
        .limit(10)

      if (error) throw error
      return NextResponse.json({ data: { threads: data, count } })
    }

    // ── Draft reply ───────────────────────────────────────────────────────────
    if (action === 'draft_reply') {
      const draft = await draftEmail({
        to:          body['to']          as string ?? '',
        instruction: body['instruction'] as string,
        subject:     body['subject']     as string | undefined,
      })
      return NextResponse.json({ data: { draft } })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (err) {
    console.error('[email]', err)
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
