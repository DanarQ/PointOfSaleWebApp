import assert from 'node:assert/strict'
import type { AddressInfo } from 'node:net'
import type { Server } from 'node:http'
import type { Express } from 'express'

process.env.AUTH_TOKEN_SECRET = 'test-secret'

type AuthUser = {
  id: number
  email: string
  password: string
  role: string
}

type StoreSetting = {
  id: number
  storeName: string
  storeAddress: string | null
  storePhone: string | null
  receiptFooter: string | null
  taxPercent: number
  currency: string
  lowStockThreshold: number
  createdAt: Date
  updatedAt: Date
}

type TestCase = {
  name: string
  run: () => Promise<void>
}

const initialDate = new Date('2026-05-02T00:00:00.000Z')

function createPrismaStub(seed?: StoreSetting) {
  let setting = seed ?? null

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
      async findUnique({ where }: { where: { email?: string; id?: number } }): Promise<AuthUser | null> {
        if (where.id === 1 || where.email === 'admin@example.com') {
          return { id: 1, email: 'admin@example.com', password: 'hash', role: 'admin' }
        }

        if (where.id === 2 || where.email === 'cashier@example.com') {
          return { id: 2, email: 'cashier@example.com', password: 'hash', role: 'user' }
        }

        return null
      },
    },
    storeSetting: {
      async findUnique({ where }: { where: { id: number } }) {
        return where.id === 1 ? setting : null
      },
      async upsert({
        where,
        create,
        update,
      }: {
        where: { id: number }
        create: Omit<StoreSetting, 'createdAt' | 'updatedAt'>
        update: Partial<Omit<StoreSetting, 'id' | 'createdAt' | 'updatedAt'>>
      }) {
        const now = new Date('2026-05-02T01:00:00.000Z')

        if (!setting || setting.id !== where.id) {
          setting = { ...create, createdAt: initialDate, updatedAt: now }
          return setting
        }

        setting = { ...setting, ...update, updatedAt: now }
        return setting
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

async function createAppWithSettings(seed?: StoreSetting) {
  const { createApp } = await import('../app.js')
  return createApp(createPrismaStub(seed))
}

const tests: TestCase[] = [
  {
    name: 'GET /settings returns default store settings before any save',
    async run() {
      const app = await createAppWithSettings()

      await withServer(app, async (baseUrl) => {
        const response = await fetch(`${baseUrl}/settings`)

        assert.equal(response.status, 200)
        assert.deepEqual(await response.json(), {
          id: 1,
          storeName: 'POS Swalayan',
          storeAddress: null,
          storePhone: null,
          receiptFooter: 'Terima kasih sudah berbelanja.',
          taxPercent: 0,
          currency: 'IDR',
          lowStockThreshold: 5,
        })
      })
    },
  },
  {
    name: 'PUT /settings lets admin persist normalized store and receipt settings',
    async run() {
      const app = await createAppWithSettings()

      await withServer(app, async (baseUrl) => {
        const response = await fetch(`${baseUrl}/settings`, {
          method: 'PUT',
          headers: {
            'content-type': 'application/json',
            authorization: `Bearer ${await getAdminToken()}`,
          },
          body: JSON.stringify({
            storeName: '  Toko Sumber Rejeki  ',
            storeAddress: '  Jl. Pasar No. 8  ',
            storePhone: '  021-555-0199  ',
            receiptFooter: '  Barang yang sudah dibeli tidak dapat ditukar.  ',
            taxPercent: 11,
            currency: 'idr',
            lowStockThreshold: 12,
          }),
        })

        assert.equal(response.status, 200)
        assert.deepEqual(await response.json(), {
          id: 1,
          storeName: 'Toko Sumber Rejeki',
          storeAddress: 'Jl. Pasar No. 8',
          storePhone: '021-555-0199',
          receiptFooter: 'Barang yang sudah dibeli tidak dapat ditukar.',
          taxPercent: 11,
          currency: 'IDR',
          lowStockThreshold: 12,
        })
      })
    },
  },
  {
    name: 'PUT /settings rejects invalid numeric settings',
    async run() {
      const app = await createAppWithSettings()

      await withServer(app, async (baseUrl) => {
        const response = await fetch(`${baseUrl}/settings`, {
          method: 'PUT',
          headers: {
            'content-type': 'application/json',
            authorization: `Bearer ${await getAdminToken()}`,
          },
          body: JSON.stringify({
            storeName: 'Toko Sumber Rejeki',
            taxPercent: 101,
            currency: 'IDR',
            lowStockThreshold: -1,
          }),
        })

        assert.equal(response.status, 400)
        assert.deepEqual(await response.json(), { error: 'taxPercent must be between 0 and 100' })
      })
    },
  },
  {
    name: 'PUT /settings rejects non-admin users',
    async run() {
      const app = await createAppWithSettings()

      await withServer(app, async (baseUrl) => {
        const response = await fetch(`${baseUrl}/settings`, {
          method: 'PUT',
          headers: {
            'content-type': 'application/json',
            authorization: `Bearer ${await getUserToken()}`,
          },
          body: JSON.stringify({
            storeName: 'Toko Sumber Rejeki',
            taxPercent: 0,
            currency: 'IDR',
            lowStockThreshold: 5,
          }),
        })

        assert.equal(response.status, 403)
        assert.deepEqual(await response.json(), { error: 'insufficient permissions' })
      })
    },
  },
]

for (const testCase of tests) {
  await runTest(testCase.name, testCase.run)
}
