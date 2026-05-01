// Products controller — validates route params and delegates to the service.
// parseProductId converts the raw string ":id" param to a positive integer,
// returning null if the value is invalid so we can 400 before hitting the DB.
import type { Request, Response } from 'express'
import {
  createProductsService,
  parseProductId,
  parseProductListFilters,
  type ProductPrisma,
} from '../services/products.service.js'
import { parsePagination } from '../utils/pagination.js'
import { handleServiceResponse } from '../utils/serviceResponse.js'

export function createProductsController(prisma: ProductPrisma) {
  const productsService = createProductsService(prisma)

  return {
    // GET /products — supports ?isActive=true|false&search=foo&categoryId=1&page=1&limit=20
    async listProducts(req: Request, res: Response) {
      const query = req.query as Record<string, unknown>
      const filters = parseProductListFilters(query)

      if ('error' in filters) {
        res.status(400).json({ error: filters.error })
        return
      }

      const pagination = parsePagination(query)

      if ('error' in pagination) {
        res.status(400).json({ error: pagination.error })
        return
      }

      const result = await productsService.listProducts(filters.value, pagination.value)
      res.json(result)
    },

    async getProduct(req: Request, res: Response) {
      const productId = parseProductId(req.params.id)

      if (!productId) {
        res.status(400).json({ error: 'invalid product id' })
        return
      }

      const result = await productsService.getProduct(productId)
      handleServiceResponse(res, result)
    },

    async createProduct(req: Request, res: Response) {
      const result = await productsService.createProduct(req.body)
      handleServiceResponse(res, result, 201)
    },

    async updateProduct(req: Request, res: Response) {
      const productId = parseProductId(req.params.id)

      if (!productId) {
        res.status(400).json({ error: 'invalid product id' })
        return
      }

      const result = await productsService.updateProduct(productId, req.body)
      handleServiceResponse(res, result)
    },

    async deleteProduct(req: Request, res: Response) {
      const productId = parseProductId(req.params.id)

      if (!productId) {
        res.status(400).json({ error: 'invalid product id' })
        return
      }

      const result = await productsService.deleteProduct(productId)
      handleServiceResponse(res, result)
    },
  }
}
