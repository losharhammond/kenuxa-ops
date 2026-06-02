// ─── Pagination helpers ─────────────────────────────────────

export interface PaginationInput {
  page?:  number
  limit?: number
}

export interface PaginationMeta {
  page:    number
  limit:   number
  offset:  number
  hasMore: boolean
  total:   number
}

export function parsePagination(input: PaginationInput, total: number): PaginationMeta {
  const page  = Math.max(1, input.page  ?? 1)
  const limit = Math.min(100, Math.max(1, input.limit ?? 20))
  const offset = (page - 1) * limit
  return {
    page,
    limit,
    offset,
    total,
    hasMore: offset + limit < total,
  }
}
