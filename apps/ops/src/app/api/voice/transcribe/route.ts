/**
 * POST /api/voice/transcribe
 * Transcribes audio using Groq Whisper API
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient }              from '@/lib/supabase/server'
import { transcribeAudio }           from '@/lib/groq/client'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const formData = await req.formData()
    const audio    = formData.get('audio') as File | null

    if (!audio) return NextResponse.json({ error: 'No audio file provided' }, { status: 400 })
    if (audio.size > 25 * 1024 * 1024) return NextResponse.json({ error: 'File too large (max 25MB)' }, { status: 413 })

    const text = await transcribeAudio(audio, audio.name || 'audio.wav')

    return NextResponse.json({ text, provider: 'groq-whisper' })
  } catch (err) {
    console.error('[voice/transcribe]', err)
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
