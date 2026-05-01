// Users service — admin-only account management on top of the existing auth table.
import { hashPassword } from './auth.service.js'
import { isPrismaRecordNotFoundError, isPrismaUniqueConstraintError } from '../utils/prismaErrors.js'
import { buildPaginatedResponse, getPaginationArgs, type PaginationParams } from '../utils/pagination.js'

type UserRecord = {
  id: number
  email: string
  password: string
  role: string
}

type SafeUser = {
  id: number
  email: string
  role: string
}

type UserWhereInput = {
  email?: string
  id?: number
  role?: string
  OR?: Array<{ email: { contains: string; mode: 'insensitive' } }>
}

type UserData = {
  email: string
  password: string
  role: string
}

type UserUpdateData = {
  email?: string
  password?: string
  role?: string
}

export type UserPrisma = {
  auth: {
    findMany: (args: { where?: UserWhereInput; orderBy: { id: 'asc' }; skip?: number; take?: number }) => Promise<UserRecord[]>
    count: (args: { where?: UserWhereInput }) => Promise<number>
    findUnique: (
      args: { where: { email: string } } | { where: { id: number } },
    ) => Promise<UserRecord | null>
    create: (args: { data: UserData }) => Promise<UserRecord>
    update: (args: { where: { id: number }; data: UserUpdateData }) => Promise<UserRecord | null>
    delete: (args: { where: { id: number } }) => Promise<UserRecord | null>
  }
}

type UserServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: 400 | 404 | 409; error: string }

export type UserListFilters = {
  search?: string
  role?: string
}

function sanitizeUser(user: UserRecord): SafeUser {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
  }
}

export function parseUserId(rawId: unknown) {
  if (typeof rawId !== 'string') {
    return null
  }

  const id = Number(rawId)

  if (!Number.isInteger(id) || id <= 0) {
    return null
  }

  return id
}

function normalizeEmail(value: unknown): string | null {
  const email = typeof value === 'string' ? value.trim().toLowerCase() : ''

  if (!email || !email.includes('@')) {
    return null
  }

  return email
}

function normalizeRole(value: unknown): 'admin' | 'user' | null {
  if (value === 'admin' || value === 'user') {
    return value
  }

  return null
}

export function parseUserListFilters(query: Record<string, unknown>): { value: UserListFilters } | { error: string } {
  const filters: UserListFilters = {}

  if (query.search !== undefined) {
    if (typeof query.search !== 'string') {
      return { error: 'search must be a string' }
    }

    const search = query.search.trim()

    if (search) {
      filters.search = search
    }
  }

  if (query.role !== undefined) {
    const role = normalizeRole(query.role)

    if (!role) {
      return { error: 'role must be admin or user' }
    }

    filters.role = role
  }

  return { value: filters }
}

function buildUserWhere(filters: UserListFilters) {
  const where: UserWhereInput = {}

  if (filters.role) {
    where.role = filters.role
  }

  if (filters.search) {
    where.OR = [{ email: { contains: filters.search, mode: 'insensitive' } }]
  }

  return Object.keys(where).length === 0 ? undefined : where
}

function parseCreateUserBody(body: unknown): UserServiceResult<UserData> {
  if (!body || typeof body !== 'object') {
    return { ok: false, status: 400, error: 'invalid request body' }
  }

  const requestBody = body as Record<string, unknown>
  const email = normalizeEmail(requestBody.email)
  const role = normalizeRole(requestBody.role)

  if (!email) {
    return { ok: false, status: 400, error: 'valid email is required' }
  }

  if (typeof requestBody.password !== 'string' || requestBody.password.length < 6) {
    return { ok: false, status: 400, error: 'password must be at least 6 characters' }
  }

  if (!role) {
    return { ok: false, status: 400, error: 'role must be admin or user' }
  }

  return {
    ok: true,
    data: {
      email,
      password: hashPassword(requestBody.password),
      role,
    },
  }
}

function parseUpdateUserBody(body: unknown): UserServiceResult<{ email: string; role: 'admin' | 'user' }> {
  if (!body || typeof body !== 'object') {
    return { ok: false, status: 400, error: 'invalid request body' }
  }

  const requestBody = body as Record<string, unknown>
  const email = normalizeEmail(requestBody.email)
  const role = normalizeRole(requestBody.role)

  if (!email) {
    return { ok: false, status: 400, error: 'valid email is required' }
  }

  if (!role) {
    return { ok: false, status: 400, error: 'role must be admin or user' }
  }

  return { ok: true, data: { email, role } }
}

function parseResetPasswordBody(body: unknown): UserServiceResult<{ password: string }> {
  if (!body || typeof body !== 'object') {
    return { ok: false, status: 400, error: 'invalid request body' }
  }

  const { password } = body as { password?: unknown }

  if (typeof password !== 'string' || password.length < 6) {
    return { ok: false, status: 400, error: 'password must be at least 6 characters' }
  }

  return { ok: true, data: { password: hashPassword(password) } }
}

export function createUsersService(prisma: UserPrisma) {
  return {
    async listUsers(filters: UserListFilters, pagination: PaginationParams = { page: 1, limit: 20 }) {
      const where = buildUserWhere(filters)
      const { skip, take } = getPaginationArgs(pagination.page, pagination.limit)

      const [users, total] = await Promise.all([
        prisma.auth.findMany({ where, orderBy: { id: 'asc' }, skip, take }),
        prisma.auth.count({ where }),
      ])

      return buildPaginatedResponse(users.map(sanitizeUser), total, pagination.page, pagination.limit)
    },

    async createUser(body: unknown): Promise<UserServiceResult<SafeUser>> {
      const parsedBody = parseCreateUserBody(body)

      if (!parsedBody.ok) {
        return parsedBody
      }

      const existingUser = await prisma.auth.findUnique({ where: { email: parsedBody.data.email } })

      if (existingUser) {
        return { ok: false, status: 409, error: 'email already registered' }
      }

      try {
        const user = await prisma.auth.create({ data: parsedBody.data })
        return { ok: true, data: sanitizeUser(user) }
      } catch (error) {
        if (isPrismaUniqueConstraintError(error)) {
          return { ok: false, status: 409, error: 'email already registered' }
        }

        throw error
      }
    },

    async updateUser(id: number, currentUserId: number, body: unknown): Promise<UserServiceResult<SafeUser>> {
      const parsedBody = parseUpdateUserBody(body)

      if (!parsedBody.ok) {
        return parsedBody
      }

      const existingUser = await prisma.auth.findUnique({ where: { id } })

      if (!existingUser) {
        return { ok: false, status: 404, error: 'user not found' }
      }

      if (id === currentUserId && parsedBody.data.role !== 'admin') {
        return { ok: false, status: 400, error: 'cannot remove admin role from current user' }
      }

      const userWithEmail = await prisma.auth.findUnique({ where: { email: parsedBody.data.email } })

      if (userWithEmail && userWithEmail.id !== id) {
        return { ok: false, status: 409, error: 'email already registered' }
      }

      try {
        const updatedUser = await prisma.auth.update({
          where: { id },
          data: parsedBody.data,
        })

        if (!updatedUser) {
          return { ok: false, status: 404, error: 'user not found' }
        }

        return { ok: true, data: sanitizeUser(updatedUser) }
      } catch (error) {
        if (isPrismaUniqueConstraintError(error)) {
          return { ok: false, status: 409, error: 'email already registered' }
        }

        if (isPrismaRecordNotFoundError(error)) {
          return { ok: false, status: 404, error: 'user not found' }
        }

        throw error
      }
    },

    async resetUserPassword(id: number, currentUserId: number, body: unknown): Promise<UserServiceResult<{ message: string }>> {
      const parsedBody = parseResetPasswordBody(body)

      if (!parsedBody.ok) {
        return parsedBody
      }

      const existingUser = await prisma.auth.findUnique({ where: { id } })

      if (!existingUser) {
        return { ok: false, status: 404, error: 'user not found' }
      }

      if (id === currentUserId) {
        return { ok: false, status: 400, error: 'cannot reset password for current user' }
      }

      try {
        const updatedUser = await prisma.auth.update({
          where: { id },
          data: { password: parsedBody.data.password },
        })

        if (!updatedUser) {
          return { ok: false, status: 404, error: 'user not found' }
        }

        return { ok: true, data: { message: 'password updated' } }
      } catch (error) {
        if (isPrismaRecordNotFoundError(error)) {
          return { ok: false, status: 404, error: 'user not found' }
        }

        throw error
      }
    },

    async deleteUser(id: number, currentUserId: number): Promise<UserServiceResult<{ message: string }>> {
      if (id === currentUserId) {
        return { ok: false, status: 400, error: 'cannot delete current user' }
      }

      const existingUser = await prisma.auth.findUnique({ where: { id } })

      if (!existingUser) {
        return { ok: false, status: 404, error: 'user not found' }
      }

      try {
        await prisma.auth.delete({ where: { id } })
        return { ok: true, data: { message: 'user deleted' } }
      } catch (error) {
        if (isPrismaRecordNotFoundError(error)) {
          return { ok: false, status: 404, error: 'user not found' }
        }

        throw error
      }
    },
  }
}
