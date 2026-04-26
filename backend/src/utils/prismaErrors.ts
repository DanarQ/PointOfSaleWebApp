// Helpers for identifying specific Prisma error codes so callers can return
// meaningful HTTP responses instead of letting the error bubble up as a 500.

// P2002 = unique constraint violation (e.g. duplicate email, duplicate slug)
export function isPrismaUniqueConstraintError(error: unknown) {
  return Boolean(
    error &&
      typeof error === 'object' &&
      'code' in error &&
      error.code === 'P2002',
  )
}

// P2025 = record to update/delete was not found
export function isPrismaRecordNotFoundError(error: unknown) {
  return Boolean(
    error &&
      typeof error === 'object' &&
      'code' in error &&
      error.code === 'P2025',
  )
}
