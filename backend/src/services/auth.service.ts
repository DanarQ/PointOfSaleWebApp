// Auth service — handles registration, login, token verification, and token refresh.
// Password hashing uses PBKDF2 (Node built-in crypto), not bcrypt.
// Two-token scheme: short-lived access token (1 h) + long-lived refresh token (7 d).
// Both tokens are JWTs signed with the same secret; the refresh token carries
// type: 'refresh' so it can never be used as an access token and vice-versa.
import { pbkdf2Sync, randomBytes, timingSafeEqual } from 'node:crypto'
import jwt from 'jsonwebtoken'

// Full user row from the database (includes hashed password).
type AuthUserRecord = {
  id: number
  email: string
  password: string
  role: string
}

// Input shape for creating a user. role is optional — DB assigns default.
type AuthUserData = {
  email: string
  password: string
  role?: string
}

// Minimal prisma interface — only the methods this service actually calls.
// This makes it easy to mock in tests without implementing the full PrismaClient.
export type AuthPrisma = {
  auth: {
    findUnique: (
      args: { where: { email: string } } | { where: { id: number } },
    ) => Promise<AuthUserRecord | null>
    create: (args: { data: AuthUserData }) => Promise<AuthUserRecord>
  }
}

type AuthTokenPayload = {
  id: number
  email: string
  role: string
}

type RefreshTokenPayload = AuthTokenPayload & { type: 'refresh' }

// User object safe to return to the client — password is excluded.
type SafeAuthUser = {
  id: number
  email: string
  role: string
}

// Result type used by every service method — avoids throwing errors for expected failures.
// ok: true → data is present. ok: false → status code + error message.
type AuthServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: 400 | 401 | 409; error: string }

type TokenPair = { user: SafeAuthUser; token: string; refreshToken: string }

// PBKDF2 parameters. 120000 iterations is the OWASP recommended minimum for SHA-256.
const passwordIterations = 120000
const passwordKeyLength = 32
const passwordDigest = 'sha256'

// Returns the secret used to sign JWTs. Throws an error if AUTH_TOKEN_SECRET is not set.
function getTokenSecret() {
  const secret = process.env.AUTH_TOKEN_SECRET

  if (!secret) {
    throw new Error('AUTH_TOKEN_SECRET environment variable is required')
  }

  return secret
}

// Strips the password field before returning user data to the client.
function sanitizeUser(user: AuthUserRecord): SafeAuthUser {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
  }
}

// Validates that email and password are present and well-formed.
// Normalizes email to lowercase and trims whitespace.
function parseAuthBody(body: unknown): { email: string; password: string } | { error: string } {
  if (!body || typeof body !== 'object') {
    return { error: 'invalid request body' }
  }

  const { email, password } = body as { email?: unknown; password?: unknown }
  const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : ''

  if (!normalizedEmail || !normalizedEmail.includes('@')) {
    return { error: 'valid email is required' }
  }

  if (typeof password !== 'string' || password.length < 6) {
    return { error: 'password must be at least 6 characters' }
  }

  return {
    email: normalizedEmail,
    password,
  }
}

// Hashes a password using PBKDF2 with a random salt.
// Stored format: "<iterations>:<salt>:<hash>" (all base64url encoded).
// Exported so seed scripts can hash passwords for test users.
export function hashPassword(password: string) {
  const salt = randomBytes(16).toString('base64url')
  const hash = pbkdf2Sync(
    password,
    salt,
    passwordIterations,
    passwordKeyLength,
    passwordDigest,
  ).toString('base64url')

  return `${passwordIterations}:${salt}:${hash}`
}

// Verifies a plain-text password against a stored hash.
// Uses timingSafeEqual to prevent timing attacks that could reveal whether
// the hash is partially correct.
function verifyPassword(password: string, storedPassword: string) {
  const [iterationsRaw, salt, storedHash] = storedPassword.split(':')
  const iterations = Number(iterationsRaw)

  if (!Number.isInteger(iterations) || !salt || !storedHash) {
    return false
  }

  const hash = pbkdf2Sync(
    password,
    salt,
    iterations,
    passwordKeyLength,
    passwordDigest,
  )
  const storedHashBuffer = Buffer.from(storedHash, 'base64url')

  // timingSafeEqual requires both buffers to be the same length — check first to avoid throwing.
  if (hash.byteLength !== storedHashBuffer.byteLength) {
    return false
  }

  return timingSafeEqual(hash, storedHashBuffer)
}

// Signs an access token that expires in 1 hour.
// The client sends this as: Authorization: Bearer <token>
// Exported so tests can generate tokens without going through the full register/login flow.
export function createAuthToken(payload: AuthTokenPayload) {
  return jwt.sign(payload, getTokenSecret(), { expiresIn: '1h' })
}

// Signs a refresh token that expires in 7 days.
// The extra type: 'refresh' claim ensures it can never be accepted as an access token.
export function createRefreshToken(payload: AuthTokenPayload) {
  return jwt.sign({ ...payload, type: 'refresh' }, getTokenSecret(), { expiresIn: '7d' })
}

// Verifies an access token. Rejects tokens that carry type: 'refresh'.
function verifyAuthToken(token: string): AuthTokenPayload | null {
  try {
    const payload = jwt.verify(token, getTokenSecret())

    if (
      typeof payload !== 'object' ||
      !Number.isInteger(payload.id) ||
      typeof payload.email !== 'string' ||
      typeof payload.role !== 'string' ||
      (payload as { type?: unknown }).type === 'refresh'
    ) {
      return null
    }

    return {
      id: payload.id,
      email: payload.email,
      role: payload.role,
    }
  } catch {
    return null
  }
}

// Verifies a refresh token. Only succeeds when type: 'refresh' is present.
function verifyRefreshToken(token: string): RefreshTokenPayload | null {
  try {
    const payload = jwt.verify(token, getTokenSecret())

    if (
      typeof payload !== 'object' ||
      !Number.isInteger(payload.id) ||
      typeof payload.email !== 'string' ||
      typeof payload.role !== 'string' ||
      (payload as { type?: unknown }).type !== 'refresh'
    ) {
      return null
    }

    return {
      id: payload.id,
      email: payload.email,
      role: payload.role,
      type: 'refresh',
    }
  } catch {
    return null
  }
}

// Strips "Bearer " prefix from the Authorization header value.
// Returns null if the header is missing or malformed.
export function parseBearerToken(header: string | undefined) {
  if (!header?.startsWith('Bearer ')) {
    return null
  }

  return header.slice('Bearer '.length).trim() || null
}

export function createAuthService(prisma: AuthPrisma) {
  function buildTokenPair(user: AuthUserRecord): TokenPair {
    const safeUser = sanitizeUser(user)
    return {
      user: safeUser,
      token: createAuthToken(safeUser),
      refreshToken: createRefreshToken(safeUser),
    }
  }

  return {
    // Creates a new user account and returns the user + access/refresh tokens.
    // Returns 409 if the email is already registered.
    async register(body: unknown): Promise<AuthServiceResult<TokenPair>> {
      const parsedBody = parseAuthBody(body)

      if ('error' in parsedBody) {
        return { ok: false, status: 400, error: parsedBody.error }
      }

      const existingUser = await prisma.auth.findUnique({
        where: { email: parsedBody.email },
      })

      if (existingUser) {
        return { ok: false, status: 409, error: 'email already registered' }
      }

      const user = await prisma.auth.create({
        data: {
          email: parsedBody.email,
          password: hashPassword(parsedBody.password),
        },
      })

      return { ok: true, data: buildTokenPair(user) }
    },

    // Verifies credentials and returns the user + access/refresh tokens.
    // Returns 401 for both "email not found" and "wrong password" to avoid
    // leaking whether a given email is registered.
    async login(body: unknown): Promise<AuthServiceResult<TokenPair>> {
      const parsedBody = parseAuthBody(body)

      if ('error' in parsedBody) {
        return { ok: false, status: 400, error: parsedBody.error }
      }

      const user = await prisma.auth.findUnique({
        where: { email: parsedBody.email },
      })

      if (!user || !verifyPassword(parsedBody.password, user.password)) {
        return { ok: false, status: 401, error: 'invalid email or password' }
      }

      return { ok: true, data: buildTokenPair(user) }
    },

    // Issues a new access + refresh token pair from a valid refresh token.
    // The old refresh token is implicitly invalidated by token rotation (client replaces it).
    async refresh(body: unknown): Promise<AuthServiceResult<TokenPair>> {
      if (!body || typeof body !== 'object') {
        return { ok: false, status: 400, error: 'invalid request body' }
      }

      const { refreshToken } = body as { refreshToken?: unknown }

      if (typeof refreshToken !== 'string' || !refreshToken) {
        return { ok: false, status: 400, error: 'refreshToken is required' }
      }

      const payload = verifyRefreshToken(refreshToken)

      if (!payload) {
        return { ok: false, status: 401, error: 'invalid refresh token' }
      }

      const user = await prisma.auth.findUnique({ where: { id: payload.id } })

      if (!user) {
        return { ok: false, status: 401, error: 'invalid refresh token' }
      }

      return { ok: true, data: buildTokenPair(user) }
    },

    // Validates the JWT from the Authorization header and returns the current user.
    // Also does a DB lookup to confirm the user still exists (handles deleted accounts).
    async getCurrentUser(token: string | null): Promise<AuthServiceResult<{ user: SafeAuthUser }>> {
      if (!token) {
        return { ok: false, status: 401, error: 'authorization token is required' }
      }

      const payload = verifyAuthToken(token)

      if (!payload) {
        return { ok: false, status: 401, error: 'invalid authorization token' }
      }

      const user = await prisma.auth.findUnique({ where: { id: payload.id } })

      if (!user) {
        return { ok: false, status: 401, error: 'invalid authorization token' }
      }

      return { ok: true, data: { user: sanitizeUser(user) } }
    },
  }
}
