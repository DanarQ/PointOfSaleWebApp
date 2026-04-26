import assert from 'node:assert/strict'
import type { AddressInfo } from 'node:net'
import type { Server } from 'node:http'
import type { Express } from 'express'

type Category = {
  id: number
  name: string
  slug: string
}

type TestCase = {
  name: string
  run: () => Promise<void>
}

function createPrismaStub(seed: Category[] = []) {
  let categories = [...seed]
  let nextId = categories.reduce((maxId, category) => Math.max(maxId, category.id), 0) + 1
  let throwUniqueOnCreate = false
  let throwUnexpectedOnCreate = false

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
    category: {
      async findMany({ skip, take }: { skip?: number; take?: number } = {}) {
        const sorted = [...categories].sort((left, right) => left.id - right.id)
        const start = skip ?? 0
        return take !== undefined ? sorted.slice(start, start + take) : sorted.slice(start)
      },
      async count() {
        return categories.length
      },
      async findUnique({ where }: { where: { id?: number; slug?: string } }) {
        if (where.id !== undefined) {
          return categories.find((category) => category.id === where.id) ?? null
        }

        if (where.slug !== undefined) {
          return categories.find((category) => category.slug === where.slug) ?? null
        }

        return null
      },
      async create({ data }: { data: { name: string; slug: string } }) {
        if (throwUnexpectedOnCreate) {
          throw new Error('database unavailable')
        }

        if (throwUniqueOnCreate) {
          throw { code: 'P2002', meta: { target: ['slug'] } }
        }

        const category = { id: nextId++, ...data }
        categories.push(category)
        return category
      },
      async update({
        where,
        data,
      }: {
        where: { id: number }
        data: { name: string; slug: string }
      }) {
        const index = categories.findIndex((category) => category.id === where.id)

        if (index === -1) {
          return null
        }

        const category = { ...categories[index], ...data }
        categories[index] = category
        return category
      },
      async delete({ where }: { where: { id: number } }) {
        const index = categories.findIndex((category) => category.id === where.id)

        if (index === -1) {
          return null
        }

        const [category] = categories.splice(index, 1)
        return category
      },
    },
    testControls: {
      throwUniqueOnCreate() {
        throwUniqueOnCreate = true
      },
      throwUnexpectedOnCreate() {
        throwUnexpectedOnCreate = true
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

const tests: TestCase[] = [
  {
    name: 'GET /categories returns categories ordered by id with pagination envelope',
    async run() {
      const { createApp } = await import('../app.js')
      const app = createApp(
        createPrismaStub([
          { id: 2, name: 'Food', slug: 'food' },
          { id: 1, name: 'Drink', slug: 'drink' },
        ]),
      )

      await withServer(app, async (baseUrl) => {
        const response = await fetch(`${baseUrl}/categories`)

        assert.equal(response.status, 200)
        const body = await response.json()
        assert.deepEqual(body.data, [
          { id: 1, name: 'Drink', slug: 'drink' },
          { id: 2, name: 'Food', slug: 'food' },
        ])
        assert.equal(body.pagination.total, 2)
      })
    },
  },
  {
    name: 'POST /categories creates a normalized category',
    async run() {
      const { createApp } = await import('../app.js')
      const app = createApp(createPrismaStub())

      await withServer(app, async (baseUrl) => {
        const response = await fetch(`${baseUrl}/categories`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ name: ' Hot Drinks ' }),
        })

        assert.equal(response.status, 201)
        assert.deepEqual(await response.json(), {
          id: 1,
          name: 'Hot Drinks',
          slug: 'hot-drinks',
        })
      })
    },
  },
  {
    name: 'POST /categories rejects duplicate slugs',
    async run() {
      const { createApp } = await import('../app.js')
      const app = createApp(createPrismaStub([{ id: 1, name: 'Hot Drinks', slug: 'hot-drinks' }]))

      await withServer(app, async (baseUrl) => {
        const response = await fetch(`${baseUrl}/categories`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ name: 'hot drinks' }),
        })

        assert.equal(response.status, 409)
        assert.deepEqual(await response.json(), { error: 'category already exists' })
      })
    },
  },
  {
    name: 'POST /categories maps database unique errors to conflict responses',
    async run() {
      const { createApp } = await import('../app.js')
      const prisma = createPrismaStub()
      prisma.testControls.throwUniqueOnCreate()
      const app = createApp(prisma)

      await withServer(app, async (baseUrl) => {
        const response = await fetch(`${baseUrl}/categories`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ name: 'Hot Drinks' }),
        })

        assert.equal(response.status, 409)
        assert.deepEqual(await response.json(), { error: 'category already exists' })
      })
    },
  },
  {
    name: 'POST /categories returns JSON for unexpected errors',
    async run() {
      const { createApp } = await import('../app.js')
      const prisma = createPrismaStub()
      prisma.testControls.throwUnexpectedOnCreate()
      const app = createApp(prisma)

      await withServer(app, async (baseUrl) => {
        const response = await fetch(`${baseUrl}/categories`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ name: 'Hot Drinks' }),
        })

        assert.equal(response.status, 500)
        assert.deepEqual(await response.json(), { error: 'internal server error' })
      })
    },
  },
  {
    name: 'PUT /categories/:id updates a category',
    async run() {
      const { createApp } = await import('../app.js')
      const app = createApp(createPrismaStub([{ id: 1, name: 'Drink', slug: 'drink' }]))

      await withServer(app, async (baseUrl) => {
        const response = await fetch(`${baseUrl}/categories/1`, {
          method: 'PUT',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ name: 'Cold Drinks' }),
        })

        assert.equal(response.status, 200)
        assert.deepEqual(await response.json(), {
          id: 1,
          name: 'Cold Drinks',
          slug: 'cold-drinks',
        })
      })
    },
  },
  {
    name: 'DELETE /categories/:id deletes a category',
    async run() {
      const { createApp } = await import('../app.js')
      const app = createApp(createPrismaStub([{ id: 1, name: 'Drink', slug: 'drink' }]))

      await withServer(app, async (baseUrl) => {
        const response = await fetch(`${baseUrl}/categories/1`, { method: 'DELETE' })

        assert.equal(response.status, 200)
        assert.deepEqual(await response.json(), { message: 'category deleted' })
      })
    },
  },
  {
    name: 'DELETE /categories/:id rejects invalid ids',
    async run() {
      const { createApp } = await import('../app.js')
      const app = createApp(createPrismaStub())

      await withServer(app, async (baseUrl) => {
        const response = await fetch(`${baseUrl}/categories/abc`, { method: 'DELETE' })

        assert.equal(response.status, 400)
        assert.deepEqual(await response.json(), { error: 'invalid category id' })
      })
    },
  },
]

for (const testCase of tests) {
  await runTest(testCase.name, testCase.run)
}
