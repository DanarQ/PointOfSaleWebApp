import assert from 'node:assert/strict'
import type { AddressInfo } from 'node:net'
import type { Server } from 'node:http'
import type { Express } from 'express'

type Product = {
  id: number
  name: string
  price: number
  costPrice?: number | null
  stock: number
}

type Transaction = {
  id: number
  invoiceNumber: string
  cashierId?: number | null
  subtotal: number
  discount: number
  tax: number
  total: number
  paidAmount: number
  changeAmount: number
  paymentMethod: string
  status: string
  notes?: string | null
  items?: TransactionItem[]
  payments?: Payment[]
}

type TransactionItem = {
  id: number
  transactionId: number
  productId: number
  productName: string
  quantity: number
  unitPrice: number
  costPrice?: number | null
  discount: number
  subtotal: number
}

type Payment = {
  id: number
  transactionId: number
  amount: number
  method: string
  provider?: string | null
  referenceNumber?: string | null
  status: string
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

type TransactionPrismaStub = {
  product: {
    findMany: () => Promise<Product[]>
    count: () => Promise<number>
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
  transaction: {
    findMany: (args: { orderBy: { id: 'desc' }; include: TransactionInclude; skip?: number; take?: number }) => Promise<Transaction[]>
    count: () => Promise<number>
    findUnique: (args: { where: { id: number }; include: TransactionInclude }) => Promise<Transaction | null>
    create: (args: { data: TransactionCreateData }) => Promise<Transaction>
    // Widened to support invoiceNumber (create flow), status and notes (void flow).
    update: (args: {
      where: { id: number }
      data: Partial<Pick<Transaction, 'invoiceNumber' | 'status' | 'notes'>>
    }) => Promise<Transaction | null>
  }
  transactionItem: {
    create: (args: { data: Omit<TransactionItem, 'id'> }) => Promise<TransactionItem>
  }
  payment: {
    findMany: (args: { orderBy: { id: 'desc' } }) => Promise<Payment[]>
    create: (args: { data: Omit<Payment, 'id'> }) => Promise<Payment>
  }
  stockMovement: {
    findMany: (args?: { where?: { productId?: number }; orderBy?: { id: 'desc' }; skip?: number; take?: number }) => Promise<StockMovement[]>
    count: (args?: { where?: { productId?: number } }) => Promise<number>
    create: (args: { data: Omit<StockMovement, 'id'> }) => Promise<StockMovement>
  }
  $transaction: <T>(run: (tx: TransactionPrismaStub) => Promise<T>) => Promise<T>
}

type TransactionInclude = {
  items: true
  payments: true
}

type TransactionCreateData = Omit<Transaction, 'id' | 'items' | 'payments'>

function createPrismaStub(seed: {
  products?: Product[]
  transactions?: Transaction[]
  payments?: Payment[]
} = {}) {
  let products = [...(seed.products ?? [])]
  let transactions = [...(seed.transactions ?? [])]
  let transactionItems: TransactionItem[] = transactions.flatMap((transaction) => transaction.items ?? [])
  let payments = [...(seed.payments ?? transactions.flatMap((transaction) => transaction.payments ?? []))]
  let stockMovements: StockMovement[] = []
  let nextTransactionId = transactions.reduce((maxId, transaction) => Math.max(maxId, transaction.id), 0) + 1
  let nextTransactionItemId =
    transactionItems.reduce((maxId, item) => Math.max(maxId, item.id), 0) + 1
  let nextPaymentId = payments.reduce((maxId, payment) => Math.max(maxId, payment.id), 0) + 1
  let nextStockMovementId =
    stockMovements.reduce((maxId, movement) => Math.max(maxId, movement.id), 0) + 1

  function withRelations(transaction: Transaction) {
    return {
      ...transaction,
      items: transactionItems.filter((item) => item.transactionId === transaction.id),
      payments: payments.filter((payment) => payment.transactionId === transaction.id),
    }
  }

  const prisma: TransactionPrismaStub = {
    product: {
      async findMany() {
        return [...products].sort((left, right) => left.id - right.id)
      },
      async count() {
        return products.length
      },
      async findUnique({ where }) {
        return products.find((product) => product.id === where.id) ?? null
      },
      async create() {
        throw new Error('not implemented')
      },
      async update({ where, data }) {
        const index = products.findIndex((product) => product.id === where.id)

        if (index === -1) {
          return null
        }

        const stockChange = data.stock
        let stock = products[index].stock

        if (typeof stockChange === 'number') {
          stock = stockChange
        } else if (stockChange?.increment !== undefined) {
          stock += stockChange.increment
        } else if (stockChange?.decrement !== undefined) {
          stock -= stockChange.decrement
        }

        products[index] = { ...products[index], stock }
        return products[index]
      },
      async updateMany({ where, data }) {
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
    transaction: {
      async findMany({ skip, take }: { skip?: number; take?: number } = {}) {
        const sorted = [...transactions].sort((left, right) => right.id - left.id).map(withRelations)
        const start = skip ?? 0
        return take !== undefined ? sorted.slice(start, start + take) : sorted.slice(start)
      },
      async count() {
        return transactions.length
      },
      async findUnique({ where }) {
        const transaction = transactions.find((item) => item.id === where.id)
        return transaction ? withRelations(transaction) : null
      },
      async create({ data }) {
        const transaction = { id: nextTransactionId++, ...data }
        transactions.push(transaction)
        return withRelations(transaction)
      },
      async update({ where, data }) {
        const index = transactions.findIndex((transaction) => transaction.id === where.id)

        if (index === -1) {
          return null
        }

        transactions[index] = { ...transactions[index], ...data }
        return withRelations(transactions[index])
      },
    },
    transactionItem: {
      async create({ data }) {
        const item = { id: nextTransactionItemId++, ...data }
        transactionItems.push(item)
        return item
      },
    },
    payment: {
      async findMany() {
        return [...payments].sort((left, right) => right.id - left.id)
      },
      async create({ data }) {
        const payment = { id: nextPaymentId++, ...data }
        payments.push(payment)
        return payment
      },
    },
    stockMovement: {
      async findMany(args?: { skip?: number; take?: number }) {
        const sorted = [...stockMovements].sort((left, right) => right.id - left.id)
        const start = args?.skip ?? 0
        return args?.take !== undefined ? sorted.slice(start, start + args.take) : sorted.slice(start)
      },
      async count() {
        return stockMovements.length
      },
      async create({ data }) {
        const movement = { id: nextStockMovementId++, ...data }
        stockMovements.push(movement)
        return movement
      },
    },
    async $transaction<T>(run: (tx: TransactionPrismaStub) => Promise<T>) {
      return run(prisma)
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
    name: 'POST /transactions creates invoice items payment and stock movements',
    async run() {
      const { createApp } = await import('../app.js')
      const app = createApp(
        createPrismaStub({
          products: [
            { id: 1, name: 'Coffee', price: 15000, costPrice: 9000, stock: 10 },
            { id: 2, name: 'Tea', price: 8000, costPrice: 3000, stock: 5 },
          ],
        }),
      )

      await withServer(app, async (baseUrl) => {
        const response = await fetch(`${baseUrl}/transactions`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            cashierId: 7,
            items: [
              { productId: 1, quantity: 2 },
              { productId: 2, quantity: 1, discount: 1000 },
            ],
            discount: 2000,
            tax: 1000,
            paidAmount: 40000,
            paymentMethod: 'cash',
            notes: 'walk in',
          }),
        })

        assert.equal(response.status, 201)
        const body = await response.json()

        assert.equal(body.id, 1)
        assert.equal(typeof body.invoiceNumber, 'string')
        assert.equal(body.cashierId, 7)
        assert.equal(body.subtotal, 37000)
        assert.equal(body.discount, 2000)
        assert.equal(body.tax, 1000)
        assert.equal(body.total, 36000)
        assert.equal(body.paidAmount, 40000)
        assert.equal(body.changeAmount, 4000)
        assert.equal(body.paymentMethod, 'cash')
        assert.equal(body.status, 'completed')
        assert.equal(body.notes, 'walk in')
        assert.deepEqual(body.items, [
          {
            id: 1,
            transactionId: 1,
            productId: 1,
            productName: 'Coffee',
            quantity: 2,
            unitPrice: 15000,
            costPrice: 9000,
            discount: 0,
            subtotal: 30000,
          },
          {
            id: 2,
            transactionId: 1,
            productId: 2,
            productName: 'Tea',
            quantity: 1,
            unitPrice: 8000,
            costPrice: 3000,
            discount: 1000,
            subtotal: 7000,
          },
        ])
        assert.deepEqual(body.payments, [
          {
            id: 1,
            transactionId: 1,
            amount: 40000,
            method: 'cash',
            provider: null,
            referenceNumber: null,
            status: 'paid',
          },
        ])

        const transactionsResponse = await fetch(`${baseUrl}/transactions`)
        const transactions = await transactionsResponse.json()
        assert.equal(transactions.data[0].invoiceNumber, 'INV-000001')

        const stockResponse = await fetch(`${baseUrl}/stock-movements`)
        assert.deepEqual((await stockResponse.json()).data, [
          {
            id: 2,
            productId: 2,
            userId: 7,
            type: 'sale',
            quantity: 1,
            stockBefore: 5,
            stockAfter: 4,
            referenceType: 'transaction',
            referenceId: 1,
            notes: 'Sale INV-000001',
          },
          {
            id: 1,
            productId: 1,
            userId: 7,
            type: 'sale',
            quantity: 2,
            stockBefore: 10,
            stockAfter: 8,
            referenceType: 'transaction',
            referenceId: 1,
            notes: 'Sale INV-000001',
          },
        ])
      })
    },
  },
  {
    name: 'POST /transactions rejects empty item lists',
    async run() {
      const { createApp } = await import('../app.js')
      const app = createApp(createPrismaStub())

      await withServer(app, async (baseUrl) => {
        const response = await fetch(`${baseUrl}/transactions`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ items: [] }),
        })

        assert.equal(response.status, 400)
        assert.deepEqual(await response.json(), { error: 'items must contain at least one item' })
      })
    },
  },
  {
    name: 'POST /transactions rejects missing products',
    async run() {
      const { createApp } = await import('../app.js')
      const app = createApp(createPrismaStub())

      await withServer(app, async (baseUrl) => {
        const response = await fetch(`${baseUrl}/transactions`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ items: [{ productId: 99, quantity: 1 }] }),
        })

        assert.equal(response.status, 404)
        assert.deepEqual(await response.json(), { error: 'product not found' })
      })
    },
  },
  {
    name: 'POST /transactions rejects insufficient stock',
    async run() {
      const { createApp } = await import('../app.js')
      const app = createApp(createPrismaStub({ products: [{ id: 1, name: 'Coffee', price: 15000, stock: 1 }] }))

      await withServer(app, async (baseUrl) => {
        const response = await fetch(`${baseUrl}/transactions`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ items: [{ productId: 1, quantity: 2 }] }),
        })

        assert.equal(response.status, 400)
        assert.deepEqual(await response.json(), { error: 'stock cannot be negative' })
      })
    },
  },
  {
    name: 'GET /transactions returns transactions ordered newest first',
    async run() {
      const { createApp } = await import('../app.js')
      const app = createApp(
        createPrismaStub({
          transactions: [
            {
              id: 1,
              invoiceNumber: 'INV-000001',
              subtotal: 10000,
              discount: 0,
              tax: 0,
              total: 10000,
              paidAmount: 10000,
              changeAmount: 0,
              paymentMethod: 'cash',
              status: 'completed',
            },
            {
              id: 2,
              invoiceNumber: 'INV-000002',
              subtotal: 15000,
              discount: 0,
              tax: 0,
              total: 15000,
              paidAmount: 15000,
              changeAmount: 0,
              paymentMethod: 'cash',
              status: 'completed',
            },
          ],
        }),
      )

      await withServer(app, async (baseUrl) => {
        const response = await fetch(`${baseUrl}/transactions`)

        assert.equal(response.status, 200)
        const body = await response.json()
        assert.deepEqual(body.data.map((transaction: Transaction) => transaction.id), [2, 1])
      })
    },
  },
  {
    name: 'POST /transactions/:id/void marks transaction voided and restores stock',
    async run() {
      const { createApp } = await import('../app.js')
      const app = createApp(
        createPrismaStub({
          products: [{ id: 1, name: 'Coffee', price: 15000, stock: 8 }],
          transactions: [
            {
              id: 1,
              invoiceNumber: 'INV-000001',
              cashierId: 7,
              subtotal: 30000,
              discount: 0,
              tax: 0,
              total: 30000,
              paidAmount: 30000,
              changeAmount: 0,
              paymentMethod: 'cash',
              status: 'completed',
              items: [
                {
                  id: 1,
                  transactionId: 1,
                  productId: 1,
                  productName: 'Coffee',
                  quantity: 2,
                  unitPrice: 15000,
                  costPrice: 9000,
                  discount: 0,
                  subtotal: 30000,
                },
              ],
            },
          ],
        }),
      )

      await withServer(app, async (baseUrl) => {
        const response = await fetch(`${baseUrl}/transactions/1/void`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ notes: 'wrong item' }),
        })

        assert.equal(response.status, 200)
        const body = await response.json()
        assert.equal(body.status, 'voided')
        assert.equal(body.notes, 'wrong item')

        const stockResponse = await fetch(`${baseUrl}/stock-movements`)
        assert.deepEqual((await stockResponse.json()).data, [
          {
            id: 1,
            productId: 1,
            userId: 7,
            type: 'void',
            quantity: 2,
            stockBefore: 8,
            stockAfter: 10,
            referenceType: 'transaction',
            referenceId: 1,
            notes: 'Void INV-000001',
          },
        ])
      })
    },
  },
  {
    name: 'POST /transactions/:id/void rejects already voided transactions',
    async run() {
      const { createApp } = await import('../app.js')
      const app = createApp(
        createPrismaStub({
          transactions: [
            {
              id: 1,
              invoiceNumber: 'INV-000001',
              subtotal: 10000,
              discount: 0,
              tax: 0,
              total: 10000,
              paidAmount: 10000,
              changeAmount: 0,
              paymentMethod: 'cash',
              status: 'voided',
            },
          ],
        }),
      )

      await withServer(app, async (baseUrl) => {
        const response = await fetch(`${baseUrl}/transactions/1/void`, { method: 'POST' })

        assert.equal(response.status, 400)
        assert.deepEqual(await response.json(), { error: 'transaction cannot be voided' })
      })
    },
  },
  {
    name: 'POST /transactions/:id/void rejects missing transactions',
    async run() {
      const { createApp } = await import('../app.js')
      const app = createApp(createPrismaStub())

      await withServer(app, async (baseUrl) => {
        const response = await fetch(`${baseUrl}/transactions/999/void`, { method: 'POST' })

        assert.equal(response.status, 404)
        assert.deepEqual(await response.json(), { error: 'transaction not found' })
      })
    },
  },
  {
    name: 'GET /payments returns payments ordered newest first',
    async run() {
      const { createApp } = await import('../app.js')
      const app = createApp(
        createPrismaStub({
          payments: [
            { id: 1, transactionId: 1, amount: 10000, method: 'cash', status: 'paid' },
            { id: 2, transactionId: 2, amount: 15000, method: 'qris', status: 'paid' },
          ],
        }),
      )

      await withServer(app, async (baseUrl) => {
        const response = await fetch(`${baseUrl}/payments`)

        assert.equal(response.status, 200)
        assert.deepEqual(await response.json(), [
          { id: 2, transactionId: 2, amount: 15000, method: 'qris', status: 'paid' },
          { id: 1, transactionId: 1, amount: 10000, method: 'cash', status: 'paid' },
        ])
      })
    },
  },
]

for (const testCase of tests) {
  await runTest(testCase.name, testCase.run)
}
