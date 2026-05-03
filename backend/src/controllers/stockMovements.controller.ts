// Stock movements controller.
// parseProductId is used here for the nested route /products/:id/stock-movements
// where req.params.id is the product id (available because mergeParams: true on the router).
import type { Request, Response } from 'express'
import {
  createStockMovementsService,
  parseProductId,
  parseStockMovementListFilters,
  type StockMovementPrisma,
} from '../services/stockMovements.service.js'
import { parsePagination } from '../utils/pagination.js'
import { handleServiceResponse } from '../utils/serviceResponse.js'

export function createStockMovementsController(prisma: StockMovementPrisma) {
  const stockMovementsService = createStockMovementsService(prisma)

  return {
    // GET /stock-movements — paginated, newest first. Supports ?page=&limit=
    async listStockMovements(req: Request, res: Response) {
      const pagination = parsePagination(req.query as Record<string, unknown>)

      if ('error' in pagination) {
        res.status(400).json({ error: pagination.error })
        return
      }

      const filters = parseStockMovementListFilters(req.query as Record<string, unknown>)

      if ('error' in filters) {
        res.status(400).json({ error: filters.error })
        return
      }

      const result = await stockMovementsService.listStockMovements(filters.value, pagination.value)
      res.json(result)
    },

    // POST /stock-movements — manually record a stock-in or stock-out.
    async createStockMovement(req: Request, res: Response) {
      const result = await stockMovementsService.createStockMovement(req.body, req.user?.id ?? null)
      handleServiceResponse(res, result, 201)
    },

    // GET /products/:id/stock-movements — movements for a specific product only.
    async listProductStockMovements(req: Request, res: Response) {
      const productId = parseProductId(req.params.id)

      if (!productId) {
        res.status(400).json({ error: 'invalid product id' })
        return
      }

      const result = await stockMovementsService.listProductStockMovements(productId)
      handleServiceResponse(res, result)
    },
  }
}
