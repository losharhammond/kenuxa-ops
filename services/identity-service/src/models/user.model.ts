/**
 * User model — data access layer for AcademyUserMeta.
 * All Prisma queries for the user entity live here.
 * Services call models; models never call services.
 */
import { prisma } from '../lib/prisma.js'
import type { AcademyRole } from '@kenuxa/shared-types'

export const UserModel = {
  findBySupabaseId(supabaseUserId: string) {
    return prisma.academyUserMeta.findUnique({ where: { supabaseUserId } })
  },

  findByEmail(email: string) {
    return prisma.academyUserMeta.findFirst({ where: { email } })
  },

  create(data: { supabaseUserId: string; email: string; role?: AcademyRole }) {
    return prisma.academyUserMeta.create({
      data: {
        supabaseUserId: data.supabaseUserId,
        email:          data.email,
        role:           data.role ?? 'learner',
      },
    })
  },

  updateRole(supabaseUserId: string, role: AcademyRole) {
    return prisma.academyUserMeta.update({
      where: { supabaseUserId },
      data:  { role },
    })
  },
} as const
