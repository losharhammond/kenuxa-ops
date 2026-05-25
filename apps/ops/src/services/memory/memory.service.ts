/**
 * KENUXA OPS — Memory Service
 * Persistent operational memory backed by Supabase
 */
import { createServiceClient } from '@/lib/supabase/server'
import { balancedChat }         from '@/lib/groq/client'
import type { MemoryEntry, MemoryType } from '@/types/ops'

// ── Save a memory entry ────────────────────────────────────────────────────────

export async function saveMemory(
  userId: string,
  params: {
    type:        MemoryType
    value:       string
    key?:        string
    importance?: number
    metadata?:   Record<string, unknown>
    expiresAt?:  string
  }
): Promise<MemoryEntry> {
  const supabase = await createServiceClient()

  // If key exists, upsert
  if (params.key) {
    const { data: existing } = await supabase
      .from('ops_memory')
      .select('id')
      .eq('user_id', userId)
      .eq('key', params.key)
      .single()

    if (existing) {
      const { data, error } = await supabase
        .from('ops_memory')
        .update({
          value:      params.value,
          importance: params.importance ?? 0.5,
          metadata:   params.metadata   ?? {},
          updated_at: new Date().toISOString(),
        })
        .eq('id', (existing as { id: string }).id)
        .select()
        .single()
      if (error) throw error
      return dbToMemory(data as Record<string, unknown>)
    }
  }

  const { data, error } = await supabase
    .from('ops_memory')
    .insert({
      user_id:    userId,
      type:       params.type,
      key:        params.key        ?? null,
      value:      params.value,
      importance: params.importance ?? 0.5,
      metadata:   params.metadata   ?? {},
      expires_at: params.expiresAt  ?? null,
    })
    .select()
    .single()

  if (error) throw error
  return dbToMemory(data as Record<string, unknown>)
}

// ── Search memory ──────────────────────────────────────────────────────────────

export async function searchMemory(
  userId: string,
  query:  string,
  limit:  number = 5
): Promise<MemoryEntry[]> {
  const supabase = await createServiceClient()

  // Text search (pg_trgm similarity)
  const { data, error } = await supabase
    .from('ops_memory')
    .select('*')
    .eq('user_id', userId)
    .or(`key.ilike.%${query}%,value.ilike.%${query}%`)
    .order('importance', { ascending: false })
    .order('access_count', { ascending: false })
    .limit(limit)

  if (error) throw error

  // Update access stats in background
  const ids = (data ?? []).map((r: Record<string, unknown>) => r['id'] as string)
  if (ids.length > 0) {
    supabase
      .from('ops_memory')
      .update({ access_count: supabase.rpc('ops_memory_increment_access'), last_accessed_at: new Date().toISOString() })
      .in('id', ids)
      .then(() => {})
  }

  return (data ?? []).map((r: Record<string, unknown>) => dbToMemory(r))
}

// ── Get recent memory ──────────────────────────────────────────────────────────

export async function getRecentMemory(
  userId: string,
  type?:  MemoryType,
  limit:  number = 20
): Promise<MemoryEntry[]> {
  const supabase = await createServiceClient()

  let q = supabase
    .from('ops_memory')
    .select('*')
    .eq('user_id', userId)
    .or('expires_at.is.null,expires_at.gt.now()')

  if (type) q = q.eq('type', type)

  const { data, error } = await q
    .order('updated_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return (data ?? []).map((r: Record<string, unknown>) => dbToMemory(r))
}

// ── Build a conversation context summary ───────────────────────────────────────

export async function buildContextSummary(
  userId: string,
  currentQuery: string
): Promise<string> {
  const memories = await searchMemory(userId, currentQuery, 10)
  if (memories.length === 0) return ''

  const memText = memories
    .map(m => `[${m.type}] ${m.key ? `${m.key}: ` : ''}${m.value}`)
    .join('\n')

  try {
    return await balancedChat(
      'You are summarizing memory context for a voice assistant.',
      `Given these memories:\n${memText}\n\nSummarize the most relevant context for: "${currentQuery}" in 1-2 sentences.`,
      { temperature: 0.1, maxTokens: 100 }
    )
  } catch {
    return memText.slice(0, 200)
  }
}

// ── Delete memory ──────────────────────────────────────────────────────────────

export async function deleteMemory(userId: string, id: string): Promise<void> {
  const supabase = await createServiceClient()
  const { error } = await supabase
    .from('ops_memory')
    .delete()
    .eq('id', id)
    .eq('user_id', userId)
  if (error) throw error
}

// ── Type map ───────────────────────────────────────────────────────────────────

function dbToMemory(row: Record<string, unknown>): MemoryEntry {
  return {
    id:              row['id']               as string,
    userId:          row['user_id']          as string,
    type:            row['type']             as MemoryType,
    key:             row['key']              as string | undefined,
    value:           row['value']            as string,
    importance:      row['importance']       as number,
    accessCount:     row['access_count']     as number,
    lastAccessedAt:  row['last_accessed_at'] as string | undefined,
    expiresAt:       row['expires_at']       as string | undefined,
    metadata:        (row['metadata'] as Record<string, unknown>) ?? {},
    createdAt:       row['created_at']       as string,
    updatedAt:       row['updated_at']       as string,
  }
}
