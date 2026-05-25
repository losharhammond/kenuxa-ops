/**
 * /api/memory — Memory CRUD + task creation
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient }              from '@/lib/supabase/server'
import { saveMemory, searchMemory, getRecentMemory, deleteMemory } from '@/services/memory/memory.service'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = req.nextUrl
    const q    = searchParams.get('q')
    const type = searchParams.get('type') as 'fact' | 'preference' | null

    if (q) {
      const entries = await searchMemory(user.id, q)
      return NextResponse.json({ data: entries })
    }

    const entries = await getRecentMemory(user.id, type ?? undefined)
    return NextResponse.json({ data: entries })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json() as { action?: string; [key: string]: unknown }
    const action = body.action ?? 'save'

    if (action === 'save') {
      const entry = await saveMemory(user.id, {
        type:       (body['type'] as 'fact' | 'preference' | 'context' | 'entity' | 'workflow' | 'contact') ?? 'fact',
        key:        body['key']        as string | undefined,
        value:      body['value']      as string,
        importance: body['importance'] as number | undefined,
        metadata:   body['metadata']   as Record<string, unknown> | undefined,
        expiresAt:  body['expires_at'] as string | undefined,
      })
      return NextResponse.json({ data: entry })
    }

    if (action === 'search') {
      const entries = await searchMemory(user.id, body['query'] as string)
      return NextResponse.json({ data: { entries } })
    }

    if (action === 'delete') {
      await deleteMemory(user.id, body['id'] as string)
      return NextResponse.json({ ok: true })
    }

    if (action === 'create_task') {
      const { error, data } = await supabase.from('ops_tasks').insert({
        user_id:     user.id,
        title:       body['title']    as string,
        description: body['description'] as string | undefined,
        priority:    body['priority'] as string ?? 'medium',
        source:      'voice',
      }).select().single()

      if (error) throw error
      return NextResponse.json({ data })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = req.nextUrl
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    await deleteMemory(user.id, id)
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
