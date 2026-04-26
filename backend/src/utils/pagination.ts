// Shared pagination helpers used by all list endpoints.
// Parses ?page=&limit= query params, converts them to Prisma skip/take,
// and wraps the result in the standard { data, pagination } envelope.

export type PaginationParams = {
  page: number   // 1-indexed, minimum 1
  limit: number  // items per page, 1–100
}

export type PaginatedResult<T> = {
  data: T[]
  pagination: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

const DEFAULT_LIMIT = 20
const MAX_LIMIT = 100

export function parsePagination(
  query: Record<string, unknown>,
): { value: PaginationParams } | { error: string } {
  let page = 1
  let limit = DEFAULT_LIMIT

  if (query.page !== undefined) {
    if (typeof query.page !== 'string') {
      return { error: 'page must be a positive integer' }
    }

    const parsed = Number(query.page)

    if (!Number.isInteger(parsed) || parsed < 1) {
      return { error: 'page must be a positive integer' }
    }

    page = parsed
  }

  if (query.limit !== undefined) {
    if (typeof query.limit !== 'string') {
      return { error: `limit must be between 1 and ${MAX_LIMIT}` }
    }

    const parsed = Number(query.limit)

    if (!Number.isInteger(parsed) || parsed < 1 || parsed > MAX_LIMIT) {
      return { error: `limit must be between 1 and ${MAX_LIMIT}` }
    }

    limit = parsed
  }

  return { value: { page, limit } }
}

export function getPaginationArgs(page: number, limit: number) {
  return {
    skip: (page - 1) * limit,
    take: limit,
  }
}

export function buildPaginatedResponse<T>(
  data: T[],
  total: number,
  page: number,
  limit: number,
): PaginatedResult<T> {
  return {
    data,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  }
}
