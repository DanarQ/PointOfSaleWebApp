import assert from 'node:assert/strict'
import type { AddressInfo } from 'node:net'
import type { Server } from 'node:http'
import type { Express } from 'express'

type Product = {
  id: number
  name: string
  price: number
}

type TestCase = {
  name: string
  run: () => Promise<void>
}

function createPrismaStub(seed: Product[] = []) {
  let products = [...seed]
  let nextId = products.reduce((maxId, product) => Math.max(maxId, product.id), 0) + 1

  return {
    product: {
      async findMany() {
        return [...products].sort((left, right) => left.id - right.id)
      },
      async findUnique({ where }: { where: { id: number } }) {
        return products.find((product) => product.id === where.id) ?? null
      },
      async create({ data }: { data: { name: string; price: number } }) {
        const product = { id: nextId++, ...data }
        products.push(product)
        return product
      },
      async update({
        where,
        data,
      }: {
        where: { id: number }
        data: { name: string; price: number }
      }) {
        const productIndex = products.findIndex((product) => product.id === where.id)

        if (productIndex === -1) {
          return null
        }

        const updatedProduct = { ...products[productIndex], ...data }
        products[productIndex] = updatedProduct
        return updatedProduct
      },
      async delete({ where }: { where: { id: number } }) {
        const productIndex = products.findIndex((product) => product.id === where.id)

        if (productIndex === -1) {
          return null
        }

        const [deletedProduct] = products.splice(productIndex, 1)
        return deletedProduct
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
    name: 'GET /health returns ok',
    async run() {
      const { createApp } = await import('../app.js')
      const app = createApp(createPrismaStub())
      await withServer(app, async (baseUrl) => {
        const response = await fetch(`${baseUrl}/health`)

        assert.equal(response.status, 200)
        assert.deepEqual(await response.json(), { status: 'ok' })
      })
    },
  },
  {
    name: 'GET /products returns products ordered by id',
    async run() {
      const { createApp } = await import('../app.js')
      const app = createApp(
        createPrismaStub([
          { id: 2, name: 'Tea', price: 8000 },
          { id: 1, name: 'Coffee', price: 15000 },
        ]),
      )
      await withServer(app, async (baseUrl) => {
        const response = await fetch(`${baseUrl}/products`)

        assert.equal(response.status, 200)
        assert.deepEqual(await response.json(), [
          { id: 1, name: 'Coffee', price: 15000 },
          { id: 2, name: 'Tea', price: 8000 },
        ])
      })
    },
  },
  {
    name: 'POST /products rejects an empty name',
    async run() {
      const { createApp } = await import('../app.js')
      const app = createApp(createPrismaStub())
      await withServer(app, async (baseUrl) => {
        const response = await fetch(`${baseUrl}/products`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ name: '   ', price: 10000 }),
        })

        assert.equal(response.status, 400)
        assert.deepEqual(await response.json(), { error: 'name is required' })
      })
    },
  },
  {
    name: 'POST /products rejects a negative price',
    async run() {
      const { createApp } = await import('../app.js')
      const app = createApp(createPrismaStub())
      await withServer(app, async (baseUrl) => {
        const response = await fetch(`${baseUrl}/products`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ name: 'Milk', price: -1 }),
        })

        assert.equal(response.status, 400)
        assert.deepEqual(await response.json(), { error: 'price must be a non-negative number' })
      })
    },
  },
  {
    name: 'POST /products creates a product',
    async run() {
      const { createApp } = await import('../app.js')
      const app = createApp(createPrismaStub())
      await withServer(app, async (baseUrl) => {
        const response = await fetch(`${baseUrl}/products`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ name: 'Coffee', price: 15000 }),
        })

        assert.equal(response.status, 201)
        assert.deepEqual(await response.json(), { id: 1, name: 'Coffee', price: 15000 })
      })
    },
  },
  {
    name: 'GET /products/:id rejects an invalid id',
    async run() {
      const { createApp } = await import('../app.js')
      const app = createApp(createPrismaStub())
      await withServer(app, async (baseUrl) => {
        const response = await fetch(`${baseUrl}/products/abc`)

        assert.equal(response.status, 400)
        assert.deepEqual(await response.json(), { error: 'invalid product id' })
      })
    },
  },
  {
    name: 'GET /products/:id returns 404 when missing',
    async run() {
      const { createApp } = await import('../app.js')
      const app = createApp(createPrismaStub())
      await withServer(app, async (baseUrl) => {
        const response = await fetch(`${baseUrl}/products/999`)

        assert.equal(response.status, 404)
        assert.deepEqual(await response.json(), { error: 'product not found' })
      })
    },
  },
  {
    name: 'PUT /products/:id updates a product',
    async run() {
      const { createApp } = await import('../app.js')
      const app = createApp(createPrismaStub([{ id: 1, name: 'Coffee', price: 15000 }]))
      await withServer(app, async (baseUrl) => {
        const response = await fetch(`${baseUrl}/products/1`, {
          method: 'PUT',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ name: 'Latte', price: 20000 }),
        })

        assert.equal(response.status, 200)
        assert.deepEqual(await response.json(), { id: 1, name: 'Latte', price: 20000 })
      })
    },
  },
  {
    name: 'DELETE /products/:id deletes a product',
    async run() {
      const { createApp } = await import('../app.js')
      const app = createApp(createPrismaStub([{ id: 1, name: 'Coffee', price: 15000 }]))
      await withServer(app, async (baseUrl) => {
        const response = await fetch(`${baseUrl}/products/1`, {
          method: 'DELETE',
        })

        assert.equal(response.status, 200)
        assert.deepEqual(await response.json(), { message: 'product deleted' })
      })
    },
  },
]

for (const testCase of tests) {
  await runTest(testCase.name, testCase.run)
}
