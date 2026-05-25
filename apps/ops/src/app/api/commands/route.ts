/**
 * POST /api/commands — Execute and log commands
 * GET  /api/commands — Get command history
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient }              from '@/lib/supabase/server'
import { parseIntent }               from '@/services/ai/brain.service'
import type { OpsCommand }           from '@/types/ops'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = req.nextUrl
    const action = searchParams.get('action')

    if (action === 'search_files') {
      const query = searchParams.get('q') ?? ''
      // Basic file listing — in production use Electron IPC or OS file API
      return NextResponse.json({ files: [], message: 'File search requires desktop mode' })
    }

    if (action === 'get_page_content') {
      return NextResponse.json({ content: '', message: 'Page reading requires desktop mode or browser extension' })
    }

    // Default: command history
    const limit = Number(searchParams.get('limit')) || 20
    const { data, error } = await supabase
      .from('ops_commands')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error
    return NextResponse.json({ data: data ?? [] })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json() as { action?: string; rawText?: string; command?: Partial<OpsCommand>; intent?: unknown }
    const action = body.action ?? 'execute'

    // Just log a pre-executed command
    if (action === 'log' && body.command) {
      const { error } = await supabase.from('ops_commands').insert({
        user_id:      user.id,
        raw_text:     body.command.rawText ?? '',
        intent:       body.command.intent,
        confidence:   body.command.confidence,
        entities:     body.command.entities   ?? {},
        handler:      body.command.handler,
        status:       body.command.status     ?? 'completed',
        result:       body.command.result,
        speak_text:   body.command.speakText,
        error:        body.command.error,
        execution_ms: body.command.executionMs,
        source:       body.command.source     ?? 'voice',
      })
      if (error) throw error
      return NextResponse.json({ ok: true })
    }

    // Parse intent (API-driven, not browser)
    if (action === 'execute' && body.rawText) {
      const intent = await parseIntent(body.rawText)

      // Log the command
      const { data: cmd } = await supabase.from('ops_commands').insert({
        user_id:    user.id,
        raw_text:   body.rawText,
        intent:     intent.intent,
        confidence: intent.confidence,
        entities:   intent.entities,
        status:     'completed',
        speak_text: intent.speak_text,
        source:     'api',
      }).select().single()

      return NextResponse.json({ data: cmd, intent })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (err) {
    console.error('[commands POST]', err)
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
