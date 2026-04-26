// Products controller — validates route params and delegates to the service.
// parseProductId converts the raw string ":id" param to a positive integer,
// returning null if the value is invalid so we can 400 before hitting the DB.
import type { Request, Response } from 'express'
import {
  createProductsService,
  parseProductId,
  type ProductPrisma,
} from '../services/products.service.js'

export function createProductsController(prisma: ProductPrisma) {
  const productsService = createProductsService(prisma)

  return {
    async listProducts(_req: Request, res: Response) {
      const products = await productsService.listProducts()
      res.json(products)
    },

    async getProduct(req: Request, res: Response) {
      const productId = parseProductId(req.params.id)

      if (!productId) {
        res.status(400).json({ error: 'invalid product id' })
        return
      }

      const result = await productsService.getProduct(productId)

      if (!result.ok) {
        res.status(result.status).json({ error: result.error })
        return
      }

      res.json(result.data)
    },

    async createProduct(req: Request, res: Response) {
      const result = await productsService.createProduct(req.body)

      if (!result.ok) {
        res.status(result.status).json({ error: result.error })
        return
      }

      res.status(201).json(result.data)
    },

    async updateProduct(req: Request, res: Response) {
      const productId = parseProductId(req.params.id)

      if (!productId) {
        res.status(400).json({ error: 'invalid product id' })
        return
      }

      const result = await productsService.updateProduct(productId, req.body)

      if (!result.ok) {
        res.status(result.status).json({ error: result.error })
        return
      }

      res.json(result.data)
    },

    async deleteProduct(req: Request, res: Response) {
      const productId = parseProductId(req.params.id)

      if (!productId) {
        res.status(400).json({ error: 'invalid product id' })
        return
      }

      const result = await productsService.deleteProduct(productId)

      if (!result.ok) {
        res.status(result.status).json({ error: result.error })
        return
      }

      res.json(result.data)
    },
  }
}
