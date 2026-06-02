/**
 * Profile model — data access layer for academy_profiles.
 */
import { prisma } from '../lib/prisma.js'

export type ProfileUpdateData = {
  fullName?:  string
  bio?:       string | null
  avatarUrl?: string | null
  location?:  string | null
  interests?: string[]
  goals?:     string[]
  metadata?:  object
}

export const ProfileModel = {
  findByUserId(supabaseUserId: string) {
    return prisma.profile.findUnique({ where: { supabaseUserId } })
  },

  create(supabaseUserId: string, fullName: string) {
    return prisma.profile.create({
      data: { supabaseUserId, fullName },
    })
  },

  update(supabaseUserId: string, data: ProfileUpdateData) {
    return prisma.profile.update({
      where: { supabaseUserId },
      data,
    })
  },
} as const
