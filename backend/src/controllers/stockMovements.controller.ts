// Stock movements controller.
// parseProductId is used here for the nested route /products/:id/stock-movements
// where req.params.id is the product id (available because mergeParams: true on the router).
import type { Request, Response } from 'express'
import {
  createStockMovementsService,
  parseProductId,
  type StockMovementPrisma,
} from '../services/stockMovements.service.js'

export function createStockMovementsController(prisma: StockMovementPrisma) {
  const stockMovementsService = createStockMovementsService(prisma)

  return {
    // GET /stock-movements — all movements across all products, newest first.
    async listStockMovements(_req: Request, res: Response) {
      const stockMovements = await stockMovementsService.listStockMovements()
      res.json(stockMovements)
    },

    // POST /stock-movements — manually record a stock-in or stock-out.
    async createStockMovement(req: Request, res: Response) {
      const result = await stockMovementsService.createStockMovement(req.body)

      if (!result.ok) {
        res.status(result.status).json({ error: result.error })
        return
      }

      res.status(201).json(result.data)
    },

    // GET /products/:id/stock-movements — movements for a specific product only.
    async listProductStockMovements(req: Request, res: Response) {
      const productId = parseProductId(req.params.id)

      if (!productId) {
        res.status(400).json({ error: 'invalid product id' })
        return
      }

      const result = await stockMovementsService.listProductStockMovements(productId)

      if (!result.ok) {
        res.status(result.status).json({ error: result.error })
        return
      }

      res.json(result.data)
    },
  }
}
