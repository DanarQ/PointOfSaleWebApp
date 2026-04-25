import { Router } from 'express'

type ProductRecord = {
  id: number
  name: string
  price: number
  sku?: string | null
  barcode?: string | null
  category?: string | null
  description?: string | null
  imageUrl?: string | null
  stock?: number
  unit?: string
  costPrice?: number | null
  isActive?: boolean
}

type ProductData = {
  name: string
  price: number
  sku?: string | null
  barcode?: string | null
  category?: string | null
  description?: string | null
  imageUrl?: string | null
  stock?: number
  unit?: string
  costPrice?: number | null
  isActive?: boolean
}

export type ProductPrisma = {
  product: {
    findMany: (args: { orderBy: { id: 'asc' } }) => Promise<ProductRecord[]>
    findUnique: (args: { where: { id: number } }) => Promise<ProductRecord | null>
    create: (args: { data: ProductData }) => Promise<ProductRecord>
    update: (args: { where: { id: number }; data: ProductData }) => Promise<ProductRecord | null>
    delete: (args: { where: { id: number } }) => Promise<ProductRecord | null>
  }
}

function parseProductId(rawId: string) {
  const id = Number(rawId)

  if (!Number.isInteger(id) || id <= 0) {
    return null
  }

  return id
}

function parseOptionalString(
  body: Record<string, unknown>,
  fieldName: 'sku' | 'barcode' | 'category' | 'description' | 'imageUrl',
): { value?: string | null } | { error: string } {
  const value = body[fieldName]

  if (value === undefined) {
    return {}
  }

  if (value === null) {
    return { value: null }
  }

  if (typeof value !== 'string') {
    return { error: `${fieldName} must be a string` }
  }

  const normalizedValue = value.trim()
  return { value: normalizedValue || null }
}

function parseProductBody(body: unknown): { data: ProductData } | { error: string } {
  if (!body || typeof body !== 'object') {
    return { error: 'invalid request body' }
  }

  const productBody = body as Record<string, unknown>
  const { name, price } = productBody
  const normalizedName = typeof name === 'string' ? name.trim() : ''

  if (!normalizedName) {
    return { error: 'name is required' }
  }

  if (typeof price !== 'number' || Number.isNaN(price) || price < 0) {
    return { error: 'price must be a non-negative number' }
  }

  const data: ProductData = {
    name: normalizedName,
    price,
  }

  for (const fieldName of ['sku', 'barcode', 'category', 'description', 'imageUrl'] as const) {
    const parsedString = parseOptionalString(productBody, fieldName)

    if ('error' in parsedString) {
      return { error: parsedString.error }
    }

    if ('value' in parsedString) {
      data[fieldName] = parsedString.value
    }
  }

  if (productBody.stock !== undefined) {
    if (
      typeof productBody.stock !== 'number' ||
      !Number.isInteger(productBody.stock) ||
      productBody.stock < 0
    ) {
      return { error: 'stock must be a non-negative integer' }
    }

    data.stock = productBody.stock
  }

  if (productBody.unit !== undefined) {
    if (typeof productBody.unit !== 'string' || !productBody.unit.trim()) {
      return { error: 'unit must be a non-empty string' }
    }

    data.unit = productBody.unit.trim()
  }

  if (productBody.costPrice !== undefined) {
    if (productBody.costPrice === null) {
      data.costPrice = null
    } else if (
      typeof productBody.costPrice !== 'number' ||
      Number.isNaN(productBody.costPrice) ||
      productBody.costPrice < 0
    ) {
      return { error: 'costPrice must be a non-negative number' }
    } else {
      data.costPrice = productBody.costPrice
    }
  }

  if (productBody.isActive !== undefined) {
    if (typeof productBody.isActive !== 'boolean') {
      return { error: 'isActive must be a boolean' }
    }

    data.isActive = productBody.isActive
  }

  return {
    data,
  }
}

export function createProductsRouter(prisma: ProductPrisma) {
  const router = Router()

  router.get('/', async (_req, res) => {
    const products = await prisma.product.findMany({ orderBy: { id: 'asc' } })
    res.json(products)
  })

  router.get('/:id', async (req, res) => {
    const productId = parseProductId(req.params.id)

    if (!productId) {
      res.status(400).json({ error: 'invalid product id' })
      return
    }

    const product = await prisma.product.findUnique({ where: { id: productId } })

    if (!product) {
      res.status(404).json({ error: 'product not found' })
      return
    }

    res.json(product)
  })

  router.post('/', async (req, res) => {
    const parsedBody = parseProductBody(req.body)

    if ('error' in parsedBody) {
      res.status(400).json({ error: parsedBody.error })
      return
    }

    const product = await prisma.product.create({ data: parsedBody.data })
    res.status(201).json(product)
  })

  router.put('/:id', async (req, res) => {
    const productId = parseProductId(req.params.id)

    if (!productId) {
      res.status(400).json({ error: 'invalid product id' })
      return
    }

    const parsedBody = parseProductBody(req.body)

    if ('error' in parsedBody) {
      res.status(400).json({ error: parsedBody.error })
      return
    }

    const existingProduct = await prisma.product.findUnique({ where: { id: productId } })

    if (!existingProduct) {
      res.status(404).json({ error: 'product not found' })
      return
    }

    const updatedProduct = await prisma.product.update({
      where: { id: productId },
      data: parsedBody.data,
    })

    res.json(updatedProduct)
  })

  router.delete('/:id', async (req, res) => {
    const productId = parseProductId(req.params.id)

    if (!productId) {
      res.status(400).json({ error: 'invalid product id' })
      return
    }

    const existingProduct = await prisma.product.findUnique({ where: { id: productId } })

    if (!existingProduct) {
      res.status(404).json({ error: 'product not found' })
      return
    }

    await prisma.product.delete({ where: { id: productId } })
    res.json({ message: 'product deleted' })
  })

  return router
}
