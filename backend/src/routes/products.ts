import { Router } from 'express'

type ProductRecord = {
  id: number
  name: string
  price: number
}

type ProductData = {
  name: string
  price: number
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

function parseProductBody(body: unknown): { data: ProductData } | { error: string } {
  if (!body || typeof body !== 'object') {
    return { error: 'invalid request body' }
  }

  const { name, price } = body as { name?: unknown; price?: unknown }
  const normalizedName = typeof name === 'string' ? name.trim() : ''

  if (!normalizedName) {
    return { error: 'name is required' }
  }

  if (typeof price !== 'number' || Number.isNaN(price) || price < 0) {
    return { error: 'price must be a non-negative number' }
  }

  return {
    data: {
      name: normalizedName,
      price,
    },
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
