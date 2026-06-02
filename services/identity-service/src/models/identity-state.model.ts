/**
 * IdentityState model — data access layer for academy_identity_states.
 */
import { prisma } from '../lib/prisma.js'

export type ScoreUpdateData = {
  cognitiveScore?:  number
  creativeScore?:   number
  socialScore?:     number
  emotionalScore?:  number
  practicalScore?:  number
  leadershipScore?: number
  economicScore?:   number
}

export const IdentityStateModel = {
  findByUserId(supabaseUserId: string) {
    return prisma.identityState.findUnique({ where: { supabaseUserId } })
  },

  create(supabaseUserId: string) {
    return prisma.identityState.create({ data: { supabaseUserId } })
  },

  update(supabaseUserId: string, data: ScoreUpdateData) {
    return prisma.identityState.update({
      where: { supabaseUserId },
      data,
    })
  },
} as const
