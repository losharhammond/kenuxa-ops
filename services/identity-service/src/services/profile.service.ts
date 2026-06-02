import { prisma } from '../lib/prisma.js'
import { NotFoundError } from './auth.service.js'
import type { AcademyProfile, UpdateProfilePayload } from '@kenuxa/shared-types'

function mapProfile(p: {
  id: string
  supabaseUserId: string
  fullName: string
  bio: string | null
  avatarUrl: string | null
  location: string | null
  interests: string[]
  goals: string[]
  metadata: unknown
  createdAt: Date
  updatedAt: Date
}): AcademyProfile {
  return {
    id:        p.id,
    userId:    p.supabaseUserId,
    fullName:  p.fullName,
    bio:       p.bio,
    avatarUrl: p.avatarUrl,
    location:  p.location,
    interests: p.interests,
    goals:     p.goals,
    metadata:  (p.metadata ?? {}) as Record<string, unknown>,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  }
}

export class ProfileService {
  async getProfile(supabaseUserId: string): Promise<AcademyProfile> {
    const profile = await prisma.profile.findUnique({ where: { supabaseUserId } })
    if (!profile) throw new NotFoundError('Profile not found')
    return mapProfile(profile)
  }

  async updateProfile(supabaseUserId: string, data: UpdateProfilePayload): Promise<AcademyProfile> {
    const existing = await prisma.profile.findUnique({ where: { supabaseUserId } })
    if (!existing) throw new NotFoundError('Profile not found')

    const updated = await prisma.profile.update({
      where: { supabaseUserId },
      data: {
        ...(data.fullName  !== undefined ? { fullName:  data.fullName } : {}),
        ...(data.bio       !== undefined ? { bio:       data.bio } : {}),
        ...(data.avatarUrl !== undefined ? { avatarUrl: data.avatarUrl } : {}),
        ...(data.location  !== undefined ? { location:  data.location } : {}),
        ...(data.interests !== undefined ? { interests: data.interests } : {}),
        ...(data.goals     !== undefined ? { goals:     data.goals } : {}),
        ...(data.metadata  !== undefined ? { metadata:  data.metadata as object } : {}),
      },
    })

    return mapProfile(updated)
  }
}
