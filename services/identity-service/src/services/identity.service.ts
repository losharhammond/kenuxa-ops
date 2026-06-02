import { prisma } from '../lib/prisma.js'
import { NotFoundError } from './auth.service.js'
import type { IdentityState, UpdateIdentityStatePayload } from '@kenuxa/shared-types'

function clamp(v: number): number {
  return Math.max(0, Math.min(100, v))
}

function mapState(s: {
  id: string
  supabaseUserId: string
  cognitiveScore: number
  creativeScore: number
  socialScore: number
  emotionalScore: number
  practicalScore: number
  leadershipScore: number
  economicScore: number
  metadata: unknown
  updatedAt: Date
}): IdentityState {
  return {
    id:              s.id,
    userId:          s.supabaseUserId,
    cognitiveScore:  s.cognitiveScore,
    creativeScore:   s.creativeScore,
    socialScore:     s.socialScore,
    emotionalScore:  s.emotionalScore,
    practicalScore:  s.practicalScore,
    leadershipScore: s.leadershipScore,
    economicScore:   s.economicScore,
    metadata:        (s.metadata ?? {}) as Record<string, unknown>,
    updatedAt:       s.updatedAt.toISOString(),
  }
}

export class IdentityService {
  async getState(supabaseUserId: string): Promise<IdentityState> {
    const state = await prisma.identityState.findUnique({ where: { supabaseUserId } })
    if (!state) throw new NotFoundError('Identity state not found')
    return mapState(state)
  }

  async updateState(supabaseUserId: string, data: UpdateIdentityStatePayload): Promise<IdentityState> {
    const existing = await prisma.identityState.findUnique({ where: { supabaseUserId } })
    if (!existing) throw new NotFoundError('Identity state not found')

    const updated = await prisma.identityState.update({
      where: { supabaseUserId },
      data: {
        ...(data.cognitiveScore  !== undefined ? { cognitiveScore:  clamp(data.cognitiveScore) } : {}),
        ...(data.creativeScore   !== undefined ? { creativeScore:   clamp(data.creativeScore) } : {}),
        ...(data.socialScore     !== undefined ? { socialScore:     clamp(data.socialScore) } : {}),
        ...(data.emotionalScore  !== undefined ? { emotionalScore:  clamp(data.emotionalScore) } : {}),
        ...(data.practicalScore  !== undefined ? { practicalScore:  clamp(data.practicalScore) } : {}),
        ...(data.leadershipScore !== undefined ? { leadershipScore: clamp(data.leadershipScore) } : {}),
        ...(data.economicScore   !== undefined ? { economicScore:   clamp(data.economicScore) } : {}),
      },
    })

    return mapState(updated)
  }
}
