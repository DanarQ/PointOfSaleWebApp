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

type AuthUserWhere = {
  email?: string
  id?: number
  OR?: Array<{ email: { contains: string; mode: 'insensitive' } }>
  role?: string
}

type TestCase = {
  name: string
  run: () => Promise<void>
}

function matchesWhere(user: AuthUser, where: AuthUserWhere | undefined) {
  if (!where) return true

  if (where.email !== undefined && user.email !== where.email) {
    return false
  }

  if (where.id !== undefined && user.id !== where.id) {
    return false
  }

  if (where.role !== undefined && user.role !== where.role) {
    return false
  }

  if (where.OR) {
    const matched = where.OR.some((clause) =>
      user.email.toLowerCase().includes(clause.email.contains.toLowerCase()),
    )

    if (!matched) return false
  }

  return true
}

function createPrismaStub(seed: AuthUser[] = []) {
  let users = [...seed]
  let nextId = users.reduce((maxId, user) => Math.max(maxId, user.id), 0) + 1

  return {
    product: {
      async findMany() {
        return []
      },
      async count() {
        return 0
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
    auth: {
      async findMany({
        where,
        skip,
        take,
      }: {
        where?: AuthUserWhere
        skip?: number
        take?: number
      } = {}) {
        const filtered = users
          .filter((user) => matchesWhere(user, where))
          .sort((left, right) => left.id - right.id)
        const start = skip ?? 0
        return take !== undefined ? filtered.slice(start, start + take) : filtered.slice(start)
      },
      async count({ where }: { where?: AuthUserWhere } = {}) {
        return users.filter((user) => matchesWhere(user, where)).length
      },
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
      async update({
        where,
        data,
      }: {
        where: { id: number }
        data: Partial<Pick<AuthUser, 'email' | 'password' | 'role'>>
      }) {
        const userIndex = users.findIndex((user) => user.id === where.id)

        if (userIndex === -1) {
          return null
        }

        const updatedUser = { ...users[userIndex], ...data }
        users[userIndex] = updatedUser
        return updatedUser
      },
      async delete({ where }: { where: { id: number } }) {
        const userIndex = users.findIndex((user) => user.id === where.id)

        if (userIndex === -1) {
          return null
        }

        const [deletedUser] = users.splice(userIndex, 1)
        return deletedUser
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

async function getAdminToken() {
  const { createAuthToken } = await import('../routes/auth.js')
  return createAuthToken({ id: 1, email: 'admin@example.com', role: 'admin' })
}

async function getUserToken() {
  const { createAuthToken } = await import('../routes/auth.js')
  return createAuthToken({ id: 2, email: 'cashier@example.com', role: 'user' })
}

async function createAppWithUsers(seed: AuthUser[]) {
  const { createApp } = await import('../app.js')
  return createApp(createPrismaStub(seed))
}

const tests: TestCase[] = [
  {
    name: 'GET /users returns paginated users with search and role filters',
    async run() {
      const app = await createAppWithUsers([
        { id: 1, email: 'admin@example.com', password: 'hash', role: 'admin' },
        { id: 2, email: 'cashier@example.com', password: 'hash', role: 'user' },
        { id: 3, email: 'shift.lead@example.com', password: 'hash', role: 'admin' },
      ])

      await withServer(app, async (baseUrl) => {
        const response = await fetch(`${baseUrl}/users?search=lead&role=admin`, {
          headers: { authorization: `Bearer ${await getAdminToken()}` },
        })

        assert.equal(response.status, 200)
        assert.deepEqual(await response.json(), {
          data: [{ id: 3, email: 'shift.lead@example.com', role: 'admin' }],
          pagination: { total: 1, page: 1, limit: 20, totalPages: 1 },
        })
      })
    },
  },
  {
    name: 'POST /users creates a role-selected user without returning password',
    async run() {
      const app = await createAppWithUsers([
        { id: 1, email: 'admin@example.com', password: 'hash', role: 'admin' },
      ])

      await withServer(app, async (baseUrl) => {
        const response = await fetch(`${baseUrl}/users`, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            authorization: `Bearer ${await getAdminToken()}`,
          },
          body: JSON.stringify({ email: ' New.Cashier@Example.com ', password: 'secret123', role: 'user' }),
        })

        assert.equal(response.status, 201)
        const body = await response.json() as { id: number; email: string; role: string; password?: string }

        assert.deepEqual(body, { id: 2, email: 'new.cashier@example.com', role: 'user' })
        assert.equal(body.password, undefined)
      })
    },
  },
  {
    name: 'PUT /users/:id updates another user email and role',
    async run() {
      const app = await createAppWithUsers([
        { id: 1, email: 'admin@example.com', password: 'hash', role: 'admin' },
        { id: 2, email: 'cashier@example.com', password: 'hash', role: 'user' },
      ])

      await withServer(app, async (baseUrl) => {
        const response = await fetch(`${baseUrl}/users/2`, {
          method: 'PUT',
          headers: {
            'content-type': 'application/json',
            authorization: `Bearer ${await getAdminToken()}`,
          },
          body: JSON.stringify({ email: 'Lead@Example.com', role: 'admin' }),
        })

        assert.equal(response.status, 200)
        assert.deepEqual(await response.json(), { id: 2, email: 'lead@example.com', role: 'admin' })
      })
    },
  },
  {
    name: 'PUT /users/:id/password lets admin reset another user password',
    async run() {
      const { hashPassword } = await import('../routes/auth.js')
      const app = await createAppWithUsers([
        { id: 1, email: 'admin@example.com', password: 'hash', role: 'admin' },
        { id: 2, email: 'cashier@example.com', password: hashPassword('oldpass123'), role: 'user' },
      ])

      await withServer(app, async (baseUrl) => {
        const resetResponse = await fetch(`${baseUrl}/users/2/password`, {
          method: 'PUT',
          headers: {
            'content-type': 'application/json',
            authorization: `Bearer ${await getAdminToken()}`,
          },
          body: JSON.stringify({ password: 'newpass123' }),
        })

        assert.equal(resetResponse.status, 200)
        assert.deepEqual(await resetResponse.json(), { message: 'password updated' })

        const loginResponse = await fetch(`${baseUrl}/auth/login`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ email: 'cashier@example.com', password: 'newpass123' }),
        })

        assert.equal(loginResponse.status, 200)
      })
    },
  },
  {
    name: 'DELETE /users/:id deletes another user',
    async run() {
      const app = await createAppWithUsers([
        { id: 1, email: 'admin@example.com', password: 'hash', role: 'admin' },
        { id: 2, email: 'cashier@example.com', password: 'hash', role: 'user' },
      ])

      await withServer(app, async (baseUrl) => {
        const response = await fetch(`${baseUrl}/users/2`, {
          method: 'DELETE',
          headers: { authorization: `Bearer ${await getAdminToken()}` },
        })

        assert.equal(response.status, 200)
        assert.deepEqual(await response.json(), { message: 'user deleted' })
      })
    },
  },
  {
    name: 'GET /users with non-admin token returns 403',
    async run() {
      const app = await createAppWithUsers([
        { id: 1, email: 'admin@example.com', password: 'hash', role: 'admin' },
        { id: 2, email: 'cashier@example.com', password: 'hash', role: 'user' },
      ])

      await withServer(app, async (baseUrl) => {
        const response = await fetch(`${baseUrl}/users`, {
          headers: { authorization: `Bearer ${await getUserToken()}` },
        })

        assert.equal(response.status, 403)
        assert.deepEqual(await response.json(), { error: 'insufficient permissions' })
      })
    },
  },
  {
    name: 'DELETE /users/:id rejects self-delete',
    async run() {
      const app = await createAppWithUsers([
        { id: 1, email: 'admin@example.com', password: 'hash', role: 'admin' },
      ])

      await withServer(app, async (baseUrl) => {
        const response = await fetch(`${baseUrl}/users/1`, {
          method: 'DELETE',
          headers: { authorization: `Bearer ${await getAdminToken()}` },
        })

        assert.equal(response.status, 400)
        assert.deepEqual(await response.json(), { error: 'cannot delete current user' })
      })
    },
  },
  {
    name: 'PUT /users/:id rejects self-demotion',
    async run() {
      const app = await createAppWithUsers([
        { id: 1, email: 'admin@example.com', password: 'hash', role: 'admin' },
      ])

      await withServer(app, async (baseUrl) => {
        const response = await fetch(`${baseUrl}/users/1`, {
          method: 'PUT',
          headers: {
            'content-type': 'application/json',
            authorization: `Bearer ${await getAdminToken()}`,
          },
          body: JSON.stringify({ email: 'admin@example.com', role: 'user' }),
        })

        assert.equal(response.status, 400)
        assert.deepEqual(await response.json(), { error: 'cannot remove admin role from current user' })
      })
    },
  },
]

for (const testCase of tests) {
  await runTest(testCase.name, testCase.run)
}
