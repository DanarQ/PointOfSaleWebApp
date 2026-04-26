// Auth service — handles registration, login, and token verification.
// Password hashing uses PBKDF2 (Node built-in crypto), not bcrypt.
// JWT is used for stateless session tokens.
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

// PBKDF2 parameters. 120000 iterations is the OWASP recommended minimum for SHA-256.
const passwordIterations = 120000
const passwordKeyLength = 32
const passwordDigest = 'sha256'

// Falls back to a dev-only secret if AUTH_TOKEN_SECRET is not set.
// Always set AUTH_TOKEN_SECRET in production.
function getTokenSecret() {
  return process.env.AUTH_TOKEN_SECRET ?? 'point-of-sale-dev-secret'
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

// Signs a JWT that expires in 8 hours. The client sends this as: Authorization: Bearer <token>
// Exported so tests can generate tokens without going through the full register/login flow.
export function createAuthToken(payload: AuthTokenPayload) {
  return jwt.sign(payload, getTokenSecret(), { expiresIn: '8h' })
}

// Verifies the JWT signature and returns the payload, or null if invalid/expired.
function verifyAuthToken(token: string): AuthTokenPayload | null {
  try {
    const payload = jwt.verify(token, getTokenSecret())

    // Guard against a valid JWT that doesn't contain the expected fields.
    if (
      typeof payload !== 'object' ||
      !Number.isInteger(payload.id) ||
      typeof payload.email !== 'string' ||
      typeof payload.role !== 'string'
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

// Strips "Bearer " prefix from the Authorization header value.
// Returns null if the header is missing or malformed.
export function parseBearerToken(header: string | undefined) {
  if (!header?.startsWith('Bearer ')) {
    return null
  }

  return header.slice('Bearer '.length).trim() || null
}

export function createAuthService(prisma: AuthPrisma) {
  return {
    // Creates a new user account and returns the user + a JWT token.
    // Returns 409 if the email is already registered.
    async register(body: unknown): Promise<AuthServiceResult<{ user: SafeAuthUser; token: string }>> {
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
      const safeUser = sanitizeUser(user)

      return {
        ok: true,
        data: {
          user: safeUser,
          token: createAuthToken(safeUser),
        },
      }
    },

    // Verifies credentials and returns the user + a new JWT token.
    // Returns 401 for both "email not found" and "wrong password" to avoid
    // leaking whether a given email is registered.
    async login(body: unknown): Promise<AuthServiceResult<{ user: SafeAuthUser; token: string }>> {
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

      const safeUser = sanitizeUser(user)

      return {
        ok: true,
        data: {
          user: safeUser,
          token: createAuthToken(safeUser),
        },
      }
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
