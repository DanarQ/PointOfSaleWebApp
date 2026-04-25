import assert from 'node:assert/strict'
import type { AddressInfo } from 'node:net'
import type { Server } from 'node:http'
import type { Express } from 'express'

type AuthUser = {
  id: number
  email: string
  password: string
  role: string
}

type TestCase = {
  name: string
  run: () => Promise<void>
}

function createAuthPrismaStub(seed: AuthUser[] = []) {
  let users = [...seed]
  let nextId = users.reduce((maxId, user) => Math.max(maxId, user.id), 0) + 1

  return {
    auth: {
      async findUnique({ where }: { where: { email?: string; id?: number } }) {
        if (where.email !== undefined) {
          return users.find((user) => user.email === where.email) ?? null
        }

        if (where.id !== undefined) {
          return users.find((user) => user.id === where.id) ?? null
        }

        return null
      },
      async create({ data }: { data: { email: string; password: string; role?: string } }) {
        const user = { id: nextId++, role: data.role ?? 'user', ...data }
        users.push(user)
        return user
      },
    },
  }
}

async function runTest(name: string, run: () => Promise<void>) {
  try {
    await run()
    console.log(`PASS ${name}`)
  } catch (error) {
    console.error(`FAIL ${name}`)
    throw error
  }
}

async function withServer(
  app: Express,
  run: (baseUrl: string) => Promise<void>,
) {
  const server = await new Promise<Server>((resolve) => {
    const instance = app.listen(0, () => resolve(instance))
  })

  const address = (server as unknown as { address: () => AddressInfo }).address()
  const baseUrl = `http://127.0.0.1:${address.port}`

  try {
    await run(baseUrl)
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error?: Error) => {
        if (error) {
          reject(error)
          return
        }

        resolve()
      })
    })
  }
}

const emptyProductPrisma = {
  product: {
    async findMany() {
      return []
    },
    async findUnique() {
      return null
    },
    async create() {
      throw new Error('not implemented')
    },
    async update() {
      throw new Error('not implemented')
    },
    async delete() {
      throw new Error('not implemented')
    },
  },
}

const tests: TestCase[] = [
  {
    name: 'POST /auth/register creates a user without returning password',
    async run() {
      const { createApp } = await import('../app.js')
      const app = createApp({ ...emptyProductPrisma, ...createAuthPrismaStub() })

      await withServer(app, async (baseUrl) => {
        const response = await fetch(`${baseUrl}/auth/register`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ email: ' Cashier@Example.com ', password: 'secret123' }),
        })

        assert.equal(response.status, 201)
        const body = await response.json()

        assert.equal(body.user.id, 1)
        assert.equal(body.user.email, 'cashier@example.com')
        assert.equal(body.user.role, 'user')
        assert.equal(body.user.password, undefined)
        assert.equal(typeof body.token, 'string')
      })
    },
  },
  {
    name: 'POST /auth/register rejects duplicate email',
    async run() {
      const { createApp } = await import('../app.js')
      const app = createApp({
        ...emptyProductPrisma,
        ...createAuthPrismaStub([
          { id: 1, email: 'cashier@example.com', password: 'hash', role: 'user' },
        ]),
      })

      await withServer(app, async (baseUrl) => {
        const response = await fetch(`${baseUrl}/auth/register`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ email: 'cashier@example.com', password: 'secret123' }),
        })

        assert.equal(response.status, 409)
        assert.deepEqual(await response.json(), { error: 'email already registered' })
      })
    },
  },
  {
    name: 'POST /auth/login returns a token for valid credentials',
    async run() {
      const { createApp } = await import('../app.js')
      const { hashPassword } = await import('../routes/auth.js')
      const app = createApp({
        ...emptyProductPrisma,
        ...createAuthPrismaStub([
          {
            id: 1,
            email: 'cashier@example.com',
            password: hashPassword('secret123'),
            role: 'admin',
          },
        ]),
      })

      await withServer(app, async (baseUrl) => {
        const response = await fetch(`${baseUrl}/auth/login`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ email: 'cashier@example.com', password: 'secret123' }),
        })

        assert.equal(response.status, 200)
        const body = await response.json()

        assert.equal(body.user.email, 'cashier@example.com')
        assert.equal(body.user.role, 'admin')
        assert.equal(body.user.password, undefined)
        assert.equal(typeof body.token, 'string')
      })
    },
  },
  {
    name: 'POST /auth/login rejects invalid credentials',
    async run() {
      const { createApp } = await import('../app.js')
      const { hashPassword } = await import('../routes/auth.js')
      const app = createApp({
        ...emptyProductPrisma,
        ...createAuthPrismaStub([
          {
            id: 1,
            email: 'cashier@example.com',
            password: hashPassword('secret123'),
            role: 'user',
          },
        ]),
      })

      await withServer(app, async (baseUrl) => {
        const response = await fetch(`${baseUrl}/auth/login`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ email: 'cashier@example.com', password: 'wrongpass' }),
        })

        assert.equal(response.status, 401)
        assert.deepEqual(await response.json(), { error: 'invalid email or password' })
      })
    },
  },
  {
    name: 'GET /auth/me returns current user from bearer token',
    async run() {
      const { createApp } = await import('../app.js')
      const { createAuthToken } = await import('../routes/auth.js')
      const app = createApp({
        ...emptyProductPrisma,
        ...createAuthPrismaStub([
          {
            id: 1,
            email: 'cashier@example.com',
            password: 'hash',
            role: 'user',
          },
        ]),
      })

      await withServer(app, async (baseUrl) => {
        const token = createAuthToken({ id: 1, email: 'cashier@example.com', role: 'user' })
        const response = await fetch(`${baseUrl}/auth/me`, {
          headers: { authorization: `Bearer ${token}` },
        })

        assert.equal(response.status, 200)
        assert.deepEqual(await response.json(), {
          user: { id: 1, email: 'cashier@example.com', role: 'user' },
        })
      })
    },
  },
]

for (const testCase of tests) {
  await runTest(testCase.name, testCase.run)
}
