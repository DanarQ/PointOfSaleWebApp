import assert from 'node:assert/strict'
import type { AddressInfo } from 'node:net'
import type { Server } from 'node:http'
import type { Express } from 'express'

type Product = {
  id: number
  name: string
  price: number
  sku?: string | null
  barcode?: string | null
  category?: Category | null
  description?: string | null
  imageUrl?: string | null
  stock?: number
  unit?: string
  costPrice?: number | null
  isActive?: boolean
}

type Category = {
  id: number
  name: string
  slug: string
}

type ProductData = Omit<Product, 'id' | 'category'> & {
  category?:
    | { connectOrCreate: { where: { slug: string }; create: { name: string; slug: string } } }
    | { disconnect: true }
}

type TestCase = {
  name: string
  run: () => Promise<void>
}

type ProductWhereInput = {
  isActive?: boolean
  categoryId?: number
  OR?: Array<
    | { name: { contains: string; mode: 'insensitive' } }
    | { sku: { contains: string; mode: 'insensitive' } }
    | { barcode: { contains: string; mode: 'insensitive' } }
  >
}

function matchesWhere(product: Product & { categoryId?: number | null }, where: ProductWhereInput | undefined): boolean {
  if (!where) return true

  if (where.isActive !== undefined && product.isActive !== where.isActive) {
    return false
  }

  if (where.categoryId !== undefined) {
    const categoryId = product.category?.id ?? product.categoryId ?? null
    if (categoryId !== where.categoryId) return false
  }

  if (where.OR) {
    const matched = where.OR.some((clause) => {
      if ('name' in clause) {
        return product.name.toLowerCase().includes(clause.name.contains.toLowerCase())
      }
      if ('sku' in clause) {
        return Boolean(product.sku?.toLowerCase().includes(clause.sku.contains.toLowerCase()))
      }
      if ('barcode' in clause) {
        return Boolean(product.barcode?.toLowerCase().includes(clause.barcode.contains.toLowerCase()))
      }
      return false
    })
    if (!matched) return false
  }

  return true
}

function createPrismaStub(seed: Product[] = []) {
  let products = [...seed]
  const categories: Category[] = seed.flatMap((product) => product.category ? [product.category] : [])
  let nextId = products.reduce((maxId, product) => Math.max(maxId, product.id), 0) + 1
  let nextCategoryId =
    categories.reduce((maxId, category) => Math.max(maxId, category.id), 0) + 1

  function resolveProductData(data: ProductData) {
    const { category, ...productData } = data

    if (!category) {
      return productData
    }

    if ('disconnect' in category) {
      return { ...productData, category: null }
    }

    const categorySlug = category.connectOrCreate.where.slug
    let resolvedCategory = categories.find((item) => item.slug === categorySlug)

    if (!resolvedCategory) {
      resolvedCategory = { id: nextCategoryId++, ...category.connectOrCreate.create }
      categories.push(resolvedCategory)
    }

    return { ...productData, category: resolvedCategory }
  }

  return {
    product: {
      async findMany({ where }: { where?: ProductWhereInput } = {}) {
        return [...products]
          .filter((product) => matchesWhere(product, where))
          .sort((left, right) => left.id - right.id)
      },
      async findUnique({ where }: { where: { id: number } }) {
        return products.find((product) => product.id === where.id) ?? null
      },
      async create({ data }: { data: ProductData }) {
        const product = { id: nextId++, ...resolveProductData(data) }
        products.push(product)
        return product
      },
      async update({
        where,
        data,
      }: {
        where: { id: number }
        data: ProductData
      }) {
        const productIndex = products.findIndex((product) => product.id === where.id)

        if (productIndex === -1) {
          return null
        }

        const updatedProduct = { ...products[productIndex], ...resolveProductData(data) }
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
    name: 'POST /products creates a product with optional fields',
    async run() {
      const { createApp } = await import('../app.js')
      const app = createApp(createPrismaStub())
      await withServer(app, async (baseUrl) => {
        const response = await fetch(`${baseUrl}/products`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            name: ' Coffee Beans ',
            price: 75000,
            sku: '  BEAN-001  ',
            barcode: '8991234567890',
            category: 'Beverage',
            description: 'Arabica blend',
            imageUrl: 'https://example.com/coffee.jpg',
            stock: 12,
            unit: 'pack',
            costPrice: 50000,
            isActive: false,
          }),
        })

        assert.equal(response.status, 201)
        assert.deepEqual(await response.json(), {
          id: 1,
          name: 'Coffee Beans',
          price: 75000,
          sku: 'BEAN-001',
          barcode: '8991234567890',
          category: { id: 1, name: 'Beverage', slug: 'beverage' },
          description: 'Arabica blend',
          imageUrl: 'https://example.com/coffee.jpg',
          stock: 12,
          unit: 'pack',
          costPrice: 50000,
          isActive: false,
        })
      })
    },
  },
  {
    name: 'POST /products normalizes matching category names',
    async run() {
      const { createApp } = await import('../app.js')
      const app = createApp(createPrismaStub())
      await withServer(app, async (baseUrl) => {
        const firstResponse = await fetch(`${baseUrl}/products`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ name: 'Mie Goreng', price: 12000, category: ' mie ' }),
        })
        const secondResponse = await fetch(`${baseUrl}/products`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ name: 'Mie Rebus', price: 11000, category: 'MIE' }),
        })

        assert.equal(firstResponse.status, 201)
        assert.equal(secondResponse.status, 201)

        const firstProduct = await firstResponse.json()
        const secondProduct = await secondResponse.json()

        assert.deepEqual(firstProduct.category, { id: 1, name: 'Mie', slug: 'mie' })
        assert.deepEqual(secondProduct.category, { id: 1, name: 'Mie', slug: 'mie' })
      })
    },
  },
  {
    name: 'POST /products rejects negative stock',
    async run() {
      const { createApp } = await import('../app.js')
      const app = createApp(createPrismaStub())
      await withServer(app, async (baseUrl) => {
        const response = await fetch(`${baseUrl}/products`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ name: 'Milk', price: 10000, stock: -1 }),
        })

        assert.equal(response.status, 400)
        assert.deepEqual(await response.json(), { error: 'stock must be a non-negative integer' })
      })
    },
  },
  {
    name: 'POST /products rejects invalid isActive',
    async run() {
      const { createApp } = await import('../app.js')
      const app = createApp(createPrismaStub())
      await withServer(app, async (baseUrl) => {
        const response = await fetch(`${baseUrl}/products`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ name: 'Milk', price: 10000, isActive: 'yes' }),
        })

        assert.equal(response.status, 400)
        assert.deepEqual(await response.json(), { error: 'isActive must be a boolean' })
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
    name: 'PUT /products/:id updates optional product fields',
    async run() {
      const { createApp } = await import('../app.js')
      const app = createApp(createPrismaStub([{ id: 1, name: 'Coffee', price: 15000 }]))
      await withServer(app, async (baseUrl) => {
        const response = await fetch(`${baseUrl}/products/1`, {
          method: 'PUT',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            name: 'Latte',
            price: 20000,
            stock: 5,
            unit: 'cup',
            costPrice: 12000,
            isActive: true,
          }),
        })

        assert.equal(response.status, 200)
        assert.deepEqual(await response.json(), {
          id: 1,
          name: 'Latte',
          price: 20000,
          stock: 5,
          unit: 'cup',
          costPrice: 12000,
          isActive: true,
        })
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
  {
    name: 'GET /products?isActive=true returns only active products',
    async run() {
      const { createApp } = await import('../app.js')
      const app = createApp(
        createPrismaStub([
          { id: 1, name: 'Coffee', price: 15000, isActive: true },
          { id: 2, name: 'Discontinued Tea', price: 8000, isActive: false },
        ]),
      )
      await withServer(app, async (baseUrl) => {
        const response = await fetch(`${baseUrl}/products?isActive=true`)

        assert.equal(response.status, 200)
        const body = await response.json()
        assert.equal(body.length, 1)
        assert.equal(body[0].id, 1)
      })
    },
  },
  {
    name: 'GET /products?isActive=false returns only inactive products',
    async run() {
      const { createApp } = await import('../app.js')
      const app = createApp(
        createPrismaStub([
          { id: 1, name: 'Coffee', price: 15000, isActive: true },
          { id: 2, name: 'Discontinued Tea', price: 8000, isActive: false },
        ]),
      )
      await withServer(app, async (baseUrl) => {
        const response = await fetch(`${baseUrl}/products?isActive=false`)

        assert.equal(response.status, 200)
        const body = await response.json()
        assert.equal(body.length, 1)
        assert.equal(body[0].id, 2)
      })
    },
  },
  {
    name: 'GET /products?isActive=invalid returns 400',
    async run() {
      const { createApp } = await import('../app.js')
      const app = createApp(createPrismaStub())
      await withServer(app, async (baseUrl) => {
        const response = await fetch(`${baseUrl}/products?isActive=maybe`)

        assert.equal(response.status, 400)
        assert.deepEqual(await response.json(), { error: 'isActive must be true or false' })
      })
    },
  },
  {
    name: 'GET /products?search=foo matches by name',
    async run() {
      const { createApp } = await import('../app.js')
      const app = createApp(
        createPrismaStub([
          { id: 1, name: 'Coffee Latte', price: 15000 },
          { id: 2, name: 'Tea', price: 8000 },
          { id: 3, name: 'Cold Brew Coffee', price: 18000 },
        ]),
      )
      await withServer(app, async (baseUrl) => {
        const response = await fetch(`${baseUrl}/products?search=coffee`)

        assert.equal(response.status, 200)
        const body = await response.json()
        assert.deepEqual(body.map((p: Product) => p.id), [1, 3])
      })
    },
  },
  {
    name: 'GET /products?search=BARCODE matches by barcode for scanner integration',
    async run() {
      const { createApp } = await import('../app.js')
      const app = createApp(
        createPrismaStub([
          { id: 1, name: 'Coffee', price: 15000, barcode: '8991234567890' },
          { id: 2, name: 'Tea', price: 8000, barcode: '8990000000001' },
        ]),
      )
      await withServer(app, async (baseUrl) => {
        const response = await fetch(`${baseUrl}/products?search=8991234567890`)

        assert.equal(response.status, 200)
        const body = await response.json()
        assert.equal(body.length, 1)
        assert.equal(body[0].id, 1)
      })
    },
  },
  {
    name: 'GET /products?categoryId=1 filters by category',
    async run() {
      const { createApp } = await import('../app.js')
      const app = createApp(
        createPrismaStub([
          {
            id: 1,
            name: 'Coffee',
            price: 15000,
            category: { id: 1, name: 'Beverage', slug: 'beverage' },
          },
          {
            id: 2,
            name: 'Chips',
            price: 5000,
            category: { id: 2, name: 'Snack', slug: 'snack' },
          },
        ]),
      )
      await withServer(app, async (baseUrl) => {
        const response = await fetch(`${baseUrl}/products?categoryId=1`)

        assert.equal(response.status, 200)
        const body = await response.json()
        assert.equal(body.length, 1)
        assert.equal(body[0].id, 1)
      })
    },
  },
  {
    name: 'GET /products?categoryId=abc returns 400',
    async run() {
      const { createApp } = await import('../app.js')
      const app = createApp(createPrismaStub())
      await withServer(app, async (baseUrl) => {
        const response = await fetch(`${baseUrl}/products?categoryId=abc`)

        assert.equal(response.status, 400)
        assert.deepEqual(await response.json(), { error: 'categoryId must be a positive integer' })
      })
    },
  },
]

for (const testCase of tests) {
  await runTest(testCase.name, testCase.run)
}
