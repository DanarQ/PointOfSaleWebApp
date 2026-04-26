// Categories service — manages product categories with slug-based uniqueness.
// Slugs are auto-generated from the category name and used as the unique key.
import { isPrismaUniqueConstraintError } from '../utils/prismaErrors.js'
import { getPaginationArgs, buildPaginatedResponse, type PaginationParams } from '../utils/pagination.js'

type CategoryRecord = {
  id: number
  name: string
  slug: string
}

type CategoryData = {
  name: string
  slug: string
}

// Minimal prisma interface for categories.
export type CategoryPrisma = {
  category: {
    findMany: (args: { orderBy: { id: 'asc' }; skip?: number; take?: number }) => Promise<CategoryRecord[]>
    count: (args?: Record<string, never>) => Promise<number>
    findUnique: (args: { where: { id: number } } | { where: { slug: string } }) => Promise<CategoryRecord | null>
    create: (args: { data: CategoryData }) => Promise<CategoryRecord>
    update: (args: { where: { id: number }; data: CategoryData }) => Promise<CategoryRecord | null>
    delete: (args: { where: { id: number } }) => Promise<CategoryRecord | null>
  }
}

// Result type — avoids throwing for expected failures.
export type CategoryServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: 400 | 404 | 409; error: string }

// Parses and validates a category ID from a URL param string.
export function parseCategoryId(rawId: unknown) {
  if (typeof rawId !== 'string') {
    return null
  }

  const id = Number(rawId)

  if (!Number.isInteger(id) || id <= 0) {
    return null
  }

  return id
}

// Converts a category name to a URL-safe slug: "Fresh Produce" → "fresh-produce".
function createSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

// Validates the request body and derives the slug from the name.
function parseCategoryBody(body: unknown): CategoryServiceResult<CategoryData> {
  if (!body || typeof body !== 'object') {
    return { ok: false, status: 400, error: 'invalid request body' }
  }

  const { name } = body as { name?: unknown }
  const normalizedName = typeof name === 'string' ? name.trim() : ''

  if (!normalizedName) {
    return { ok: false, status: 400, error: 'name is required' }
  }

  const slug = createSlug(normalizedName)

  if (!slug) {
    return { ok: false, status: 400, error: 'name must contain letters or numbers' }
  }

  return {
    ok: true,
    data: {
      name: normalizedName,
      slug,
    },
  }
}

export function createCategoriesService(prisma: CategoryPrisma) {
  return {
    async listCategories(pagination: PaginationParams = { page: 1, limit: 20 }) {
      const { skip, take } = getPaginationArgs(pagination.page, pagination.limit)

      const [data, total] = await Promise.all([
        prisma.category.findMany({ orderBy: { id: 'asc' }, skip, take }),
        prisma.category.count({}),
      ])

      return buildPaginatedResponse(data, total, pagination.page, pagination.limit)
    },

    async createCategory(body: unknown): Promise<CategoryServiceResult<CategoryRecord>> {
      const parsedBody = parseCategoryBody(body)

      if (!parsedBody.ok) {
        return parsedBody
      }

      // Pre-check to return a clear 409 before attempting the insert.
      const existingCategory = await prisma.category.findUnique({
        where: { slug: parsedBody.data.slug },
      })

      if (existingCategory) {
        return { ok: false, status: 409, error: 'category already exists' }
      }

      try {
        const category = await prisma.category.create({ data: parsedBody.data })
        return { ok: true, data: category }
      } catch (error) {
        // Catch race condition: another request created the same category between our check and insert.
        if (isPrismaUniqueConstraintError(error)) {
          return { ok: false, status: 409, error: 'category already exists' }
        }

        throw error
      }
    },

    async updateCategory(id: number, body: unknown): Promise<CategoryServiceResult<CategoryRecord>> {
      const parsedBody = parseCategoryBody(body)

      if (!parsedBody.ok) {
        return parsedBody
      }

      const category = await prisma.category.findUnique({ where: { id } })

      if (!category) {
        return { ok: false, status: 404, error: 'category not found' }
      }

      // Check if the new slug is already used by a *different* category.
      // It's fine if the slug belongs to the category being updated (no change in slug).
      const categoryWithSlug = await prisma.category.findUnique({
        where: { slug: parsedBody.data.slug },
      })

      if (categoryWithSlug && categoryWithSlug.id !== id) {
        return { ok: false, status: 409, error: 'category already exists' }
      }

      let updatedCategory: CategoryRecord | null

      try {
        updatedCategory = await prisma.category.update({
          where: { id },
          data: parsedBody.data,
        })
      } catch (error) {
        // Same race-condition guard as createCategory.
        if (isPrismaUniqueConstraintError(error)) {
          return { ok: false, status: 409, error: 'category already exists' }
        }

        throw error
      }

      if (!updatedCategory) {
        return { ok: false, status: 404, error: 'category not found' }
      }

      return { ok: true, data: updatedCategory }
    },

    async deleteCategory(id: number): Promise<CategoryServiceResult<{ message: string }>> {
      const category = await prisma.category.findUnique({ where: { id } })

      if (!category) {
        return { ok: false, status: 404, error: 'category not found' }
      }

      await prisma.category.delete({ where: { id } })
      return { ok: true, data: { message: 'category deleted' } }
    },
  }
}
