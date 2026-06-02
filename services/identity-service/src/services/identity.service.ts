import { IdentityStateModel } from '../models/identity-state.model.js'
import { NotFoundError }       from './auth.service.js'
import { clampScore }          from '@kenuxa/utils'
import type { IdentityState, UpdateIdentityStatePayload } from '@kenuxa/shared-types'

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
    const state = await IdentityStateModel.findByUserId(supabaseUserId)
    if (!state) throw new NotFoundError('Identity state not found')
    return mapState(state)
  }

  async updateState(supabaseUserId: string, data: UpdateIdentityStatePayload): Promise<IdentityState> {
    const existing = await IdentityStateModel.findByUserId(supabaseUserId)
    if (!existing) throw new NotFoundError('Identity state not found')

    const updated = await IdentityStateModel.update(supabaseUserId, {
      ...(data.cognitiveScore  !== undefined ? { cognitiveScore:  clampScore(data.cognitiveScore) } : {}),
      ...(data.creativeScore   !== undefined ? { creativeScore:   clampScore(data.creativeScore) } : {}),
      ...(data.socialScore     !== undefined ? { socialScore:     clampScore(data.socialScore) } : {}),
      ...(data.emotionalScore  !== undefined ? { emotionalScore:  clampScore(data.emotionalScore) } : {}),
      ...(data.practicalScore  !== undefined ? { practicalScore:  clampScore(data.practicalScore) } : {}),
      ...(data.leadershipScore !== undefined ? { leadershipScore: clampScore(data.leadershipScore) } : {}),
      ...(data.economicScore   !== undefined ? { economicScore:   clampScore(data.economicScore) } : {}),
    })

    return mapState(updated)
  }
}
