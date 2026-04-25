import { createHmac, pbkdf2Sync, randomBytes, timingSafeEqual } from 'node:crypto'
import { Router } from 'express'

type AuthUserRecord = {
  id: number
  email: string
  password: string
  role: string
}

type AuthUserData = {
  email: string
  password: string
  role?: string
}

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

const passwordIterations = 120000
const passwordKeyLength = 32
const passwordDigest = 'sha256'

function getTokenSecret() {
  return process.env.AUTH_TOKEN_SECRET ?? 'point-of-sale-dev-secret'
}

function toBase64Url(value: string | Buffer) {
  return Buffer.from(value).toString('base64url')
}

function sign(value: string) {
  return createHmac('sha256', getTokenSecret()).update(value).digest('base64url')
}

function sanitizeUser(user: AuthUserRecord) {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
  }
}

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

function verifyPassword(password: string, storedPassword: string) {
  const [iterationsRaw, salt, storedHash] = storedPassword.split(':')
  const iterations = Number(iterationsRaw)

  if (!Number.isInteger(iterations) || !salt || !storedHash) {
    return false
  }

  const hash = pbkdf2Sync(password, salt, iterations, passwordKeyLength, passwordDigest)
  const storedHashBuffer = Buffer.from(storedHash, 'base64url')

  if (hash.byteLength !== storedHashBuffer.byteLength) {
    return false
  }

  return timingSafeEqual(hash, storedHashBuffer)
}

export function createAuthToken(payload: AuthTokenPayload) {
  const header = toBase64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const body = toBase64Url(JSON.stringify(payload))
  const unsignedToken = `${header}.${body}`

  return `${unsignedToken}.${sign(unsignedToken)}`
}

function verifyAuthToken(token: string): AuthTokenPayload | null {
  const [header, body, signature] = token.split('.')

  if (!header || !body || !signature) {
    return null
  }

  const unsignedToken = `${header}.${body}`

  if (signature !== sign(unsignedToken)) {
    return null
  }

  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as AuthTokenPayload

    if (
      !Number.isInteger(payload.id) ||
      typeof payload.email !== 'string' ||
      typeof payload.role !== 'string'
    ) {
      return null
    }

    return payload
  } catch {
    return null
  }
}

function parseBearerToken(header: string | undefined) {
  if (!header?.startsWith('Bearer ')) {
    return null
  }

  return header.slice('Bearer '.length).trim() || null
}

export function createAuthRouter(prisma: AuthPrisma) {
  const router = Router()

  router.post('/register', async (req, res) => {
    const parsedBody = parseAuthBody(req.body)

    if ('error' in parsedBody) {
      res.status(400).json({ error: parsedBody.error })
      return
    }

    const existingUser = await prisma.auth.findUnique({ where: { email: parsedBody.email } })

    if (existingUser) {
      res.status(409).json({ error: 'email already registered' })
      return
    }

    const user = await prisma.auth.create({
      data: {
        email: parsedBody.email,
        password: hashPassword(parsedBody.password),
      },
    })
    const safeUser = sanitizeUser(user)

    res.status(201).json({
      user: safeUser,
      token: createAuthToken(safeUser),
    })
  })

  router.post('/login', async (req, res) => {
    const parsedBody = parseAuthBody(req.body)

    if ('error' in parsedBody) {
      res.status(400).json({ error: parsedBody.error })
      return
    }

    const user = await prisma.auth.findUnique({ where: { email: parsedBody.email } })

    if (!user || !verifyPassword(parsedBody.password, user.password)) {
      res.status(401).json({ error: 'invalid email or password' })
      return
    }

    const safeUser = sanitizeUser(user)

    res.json({
      user: safeUser,
      token: createAuthToken(safeUser),
    })
  })

  router.get('/me', async (req, res) => {
    const token = parseBearerToken(req.header('authorization'))

    if (!token) {
      res.status(401).json({ error: 'authorization token is required' })
      return
    }

    const payload = verifyAuthToken(token)

    if (!payload) {
      res.status(401).json({ error: 'invalid authorization token' })
      return
    }

    const user = await prisma.auth.findUnique({ where: { id: payload.id } })

    if (!user) {
      res.status(401).json({ error: 'invalid authorization token' })
      return
    }

    res.json({ user: sanitizeUser(user) })
  })

  return router
}
