import assert from 'node:assert/strict'
import type { AddressInfo } from 'node:net'
import type { Server } from 'node:http'
import type { Express } from 'express'

type Product = {
  id: number
  name: string
  price: number
  stock: number
}

type StockMovement = {
  id: number
  productId: number
  userId?: number | null
  type: string
  quantity: number
  stockBefore: number
  stockAfter: number
  referenceType?: string | null
  referenceId?: number | null
  notes?: string | null
}

type TestCase = {
  name: string
  run: () => Promise<void>
}

type StockPrismaStub = {
  product: {
    findMany: () => Promise<Product[]>
    findUnique: (args: { where: { id: number } }) => Promise<Product | null>
    create: () => Promise<never>
    update: (args: {
      where: { id: number }
      data: { stock?: number | { increment?: number; decrement?: number } }
    }) => Promise<Product | null>
    updateMany: (args: {
      where: { id: number; stock?: { gte: number } }
      data: { stock: { decrement: number } }
    }) => Promise<{ count: number }>
    delete: () => Promise<never>
  }
  stockMovement: {
    findMany: (args?: { where?: { productId?: number }; orderBy?: { id: 'desc' } }) => Promise<StockMovement[]>
    create: (args: { data: Omit<StockMovement, 'id'> }) => Promise<StockMovement>
  }
  $transaction: <T>(run: (tx: StockPrismaStub) => Promise<T>) => Promise<T>
  testControls: {
    getDirectStockNumberUpdates: () => number
  }
}

function createPrismaStub(seed: { products?: Product[]; stockMovements?: StockMovement[] } = {}) {
  let products = [...(seed.products ?? [])]
  let stockMovements = [...(seed.stockMovements ?? [])]
  let nextStockMovementId =
    stockMovements.reduce((maxId, movement) => Math.max(maxId, movement.id), 0) + 1
  let directStockNumberUpdates = 0

  const prisma: StockPrismaStub = {
    product: {
      async findMany() {
        return [...products].sort((left, right) => left.id - right.id)
      },
      async findUnique({ where }: { where: { id: number } }) {
        return products.find((product) => product.id === where.id) ?? null
      },
      async create() {
        throw new Error('not implemented')
      },
      async update({
        where,
        data,
      }: {
        where: { id: number }
        data: { stock?: number | { increment?: number; decrement?: number } }
      }) {
        const index = products.findIndex((product) => product.id === where.id)

        if (index === -1) {
          return null
        }

        const stockChange = data.stock
        let nextStock = products[index].stock

        if (typeof stockChange === 'number') {
          directStockNumberUpdates++
          nextStock = stockChange
        } else if (stockChange?.increment !== undefined) {
          nextStock += stockChange.increment
        } else if (stockChange?.decrement !== undefined) {
          nextStock -= stockChange.decrement
        }

        const product = { ...products[index], stock: nextStock }
        products[index] = product
        return product
      },
      async updateMany({
        where,
        data,
      }: {
        where: { id: number; stock?: { gte: number } }
        data: { stock: { decrement: number } }
      }) {
        const index = products.findIndex((product) => {
          if (product.id !== where.id) {
            return false
          }

          return where.stock?.gte === undefined || product.stock >= where.stock.gte
        })

        if (index === -1) {
          return { count: 0 }
        }

        products[index] = {
          ...products[index],
          stock: products[index].stock - data.stock.decrement,
        }

        return { count: 1 }
      },
      async delete() {
        throw new Error('not implemented')
      },
    },
    stockMovement: {
      async findMany(args?: { where?: { productId?: number }; orderBy?: { id: 'desc' } }) {
        const filtered =
          args?.where?.productId === undefined
            ? stockMovements
            : stockMovements.filter((movement) => movement.productId === args.where?.productId)

        return [...filtered].sort((left, right) => right.id - left.id)
      },
      async create({ data }: { data: Omit<StockMovement, 'id'> }) {
        const movement = { id: nextStockMovementId++, ...data }
        stockMovements.push(movement)
        return movement
      },
    },
    async $transaction<T>(run: (tx: typeof prisma) => Promise<T>) {
      return run(prisma)
    },
    testControls: {
      getDirectStockNumberUpdates() {
        return directStockNumberUpdates
      },
    },
  }

  return prisma
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
    name: 'GET /stock-movements returns movements ordered newest first',
    async run() {
      const { createApp } = await import('../app.js')
      const app = createApp(
        createPrismaStub({
          stockMovements: [
            { id: 1, productId: 1, type: 'in', quantity: 5, stockBefore: 0, stockAfter: 5 },
            { id: 2, productId: 1, type: 'out', quantity: 2, stockBefore: 5, stockAfter: 3 },
          ],
        }),
      )

      await withServer(app, async (baseUrl) => {
        const response = await fetch(`${baseUrl}/stock-movements`)

        assert.equal(response.status, 200)
        assert.deepEqual(await response.json(), [
          { id: 2, productId: 1, type: 'out', quantity: 2, stockBefore: 5, stockAfter: 3 },
          { id: 1, productId: 1, type: 'in', quantity: 5, stockBefore: 0, stockAfter: 5 },
        ])
      })
    },
  },
  {
    name: 'POST /stock-movements increases product stock and records movement',
    async run() {
      const { createApp } = await import('../app.js')
      const app = createApp(createPrismaStub({ products: [{ id: 1, name: 'Coffee', price: 15000, stock: 3 }] }))

      await withServer(app, async (baseUrl) => {
        const response = await fetch(`${baseUrl}/stock-movements`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ productId: 1, type: 'in', quantity: 4, notes: 'Restock' }),
        })

        assert.equal(response.status, 201)
        assert.deepEqual(await response.json(), {
          id: 1,
          productId: 1,
          userId: null,
          type: 'in',
          quantity: 4,
          stockBefore: 3,
          stockAfter: 7,
          referenceType: null,
          referenceId: null,
          notes: 'Restock',
        })
      })
    },
  },
  {
    name: 'POST /stock-movements changes stock with atomic updates',
    async run() {
      const { createApp } = await import('../app.js')
      const prisma = createPrismaStub({ products: [{ id: 1, name: 'Coffee', price: 15000, stock: 8 }] })
      const app = createApp(prisma)

      await withServer(app, async (baseUrl) => {
        const response = await fetch(`${baseUrl}/stock-movements`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ productId: 1, type: 'out', quantity: 3 }),
        })

        assert.equal(response.status, 201)
        assert.equal(prisma.testControls.getDirectStockNumberUpdates(), 0)
        assert.deepEqual(await response.json(), {
          id: 1,
          productId: 1,
          userId: null,
          type: 'out',
          quantity: 3,
          stockBefore: 8,
          stockAfter: 5,
          referenceType: null,
          referenceId: null,
          notes: null,
        })
      })
    },
  },
  {
    name: 'POST /stock-movements rejects insufficient stock for out movements',
    async run() {
      const { createApp } = await import('../app.js')
      const app = createApp(createPrismaStub({ products: [{ id: 1, name: 'Coffee', price: 15000, stock: 3 }] }))

      await withServer(app, async (baseUrl) => {
        const response = await fetch(`${baseUrl}/stock-movements`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ productId: 1, type: 'out', quantity: 4 }),
        })

        assert.equal(response.status, 400)
        assert.deepEqual(await response.json(), { error: 'stock cannot be negative' })
      })
    },
  },
  {
    name: 'POST /stock-movements rejects missing products',
    async run() {
      const { createApp } = await import('../app.js')
      const app = createApp(createPrismaStub())

      await withServer(app, async (baseUrl) => {
        const response = await fetch(`${baseUrl}/stock-movements`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ productId: 99, type: 'in', quantity: 4 }),
        })

        assert.equal(response.status, 404)
        assert.deepEqual(await response.json(), { error: 'product not found' })
      })
    },
  },
  {
    name: 'GET /products/:id/stock-movements returns product movements',
    async run() {
      const { createApp } = await import('../app.js')
      const app = createApp(
        createPrismaStub({
          products: [{ id: 1, name: 'Coffee', price: 15000, stock: 3 }],
          stockMovements: [
            { id: 1, productId: 1, type: 'in', quantity: 5, stockBefore: 0, stockAfter: 5 },
            { id: 2, productId: 2, type: 'in', quantity: 2, stockBefore: 0, stockAfter: 2 },
          ],
        }),
      )

      await withServer(app, async (baseUrl) => {
        const response = await fetch(`${baseUrl}/products/1/stock-movements`)

        assert.equal(response.status, 200)
        assert.deepEqual(await response.json(), [
          { id: 1, productId: 1, type: 'in', quantity: 5, stockBefore: 0, stockAfter: 5 },
        ])
      })
    },
  },
  {
    name: 'GET /products/:id/stock-movements rejects invalid ids',
    async run() {
      const { createApp } = await import('../app.js')
      const app = createApp(createPrismaStub())

      await withServer(app, async (baseUrl) => {
        const response = await fetch(`${baseUrl}/products/abc/stock-movements`)

        assert.equal(response.status, 400)
        assert.deepEqual(await response.json(), { error: 'invalid product id' })
      })
    },
  },
]

for (const testCase of tests) {
  await runTest(testCase.name, testCase.run)
}
