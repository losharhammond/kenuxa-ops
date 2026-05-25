/**
 * /api/automation — Workflow CRUD and execution
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient }              from '@/lib/supabase/server'
import { executeWorkflow, getUserWorkflows } from '@/services/automation/automation.service'
import type { Workflow }             from '@/types/ops'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = req.nextUrl
    const workflowId = searchParams.get('workflow_id')

    if (workflowId) {
      // Get runs for a specific workflow
      const { data } = await supabase
        .from('ops_workflow_runs')
        .select('*')
        .eq('workflow_id', workflowId)
        .eq('user_id', user.id)
        .order('started_at', { ascending: false })
        .limit(10)
      return NextResponse.json({ data: data ?? [] })
    }

    const workflows = await getUserWorkflows(user.id)
    return NextResponse.json({ data: workflows })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body   = await req.json() as { action?: string; [key: string]: unknown }
    const action = body.action ?? 'create'

    if (action === 'create') {
      const { data, error } = await supabase.from('ops_workflows').insert({
        user_id:       user.id,
        name:          body['name']           as string,
        description:   body['description']   as string | undefined,
        trigger_type:  body['trigger_type']  as string,
        trigger_config: body['trigger_config'] ?? {},
        steps:         body['steps']         ?? [],
        is_active:     body['is_active']     ?? true,
        tags:          body['tags']          ?? [],
      }).select().single()

      if (error) throw error
      return NextResponse.json({ data }, { status: 201 })
    }

    if (action === 'run') {
      const workflowId = body['workflow_id'] as string
      const { data: wfData, error } = await supabase
        .from('ops_workflows')
        .select('*')
        .eq('id', workflowId)
        .eq('user_id', user.id)
        .single()

      if (error || !wfData) return NextResponse.json({ error: 'Workflow not found' }, { status: 404 })

      const workflow = wfData as unknown as Workflow
      const run = await executeWorkflow(workflow, user.id, { trigger: 'manual' })
      return NextResponse.json({ data: run })
    }

    if (action === 'toggle') {
      const workflowId = body['workflow_id'] as string
      const isActive   = Boolean(body['is_active'])

      const { data, error } = await supabase
        .from('ops_workflows')
        .update({ is_active: isActive, updated_at: new Date().toISOString() })
        .eq('id', workflowId)
        .eq('user_id', user.id)
        .select()
        .single()

      if (error) throw error
      return NextResponse.json({ data })
    }

    if (action === 'delete') {
      const { error } = await supabase
        .from('ops_workflows')
        .delete()
        .eq('id', body['workflow_id'] as string)
        .eq('user_id', user.id)
      if (error) throw error
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (err) {
    console.error('[automation]', err)
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
