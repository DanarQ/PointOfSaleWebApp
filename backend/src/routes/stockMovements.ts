// Two separate routers for stock movements:
//   - createStockMovementsRouter: mounted at /stock-movements (global list + create)
//   - createProductStockMovementsRouter: mounted at /products/:id/stock-movements (per-product list)
import { Router } from 'express'
import { createStockMovementsController } from '../controllers/stockMovements.controller.js'
import type { StockMovementPrisma } from '../services/stockMovements.service.js'

export function createStockMovementsRouter(prisma: StockMovementPrisma) {
  const router = Router()
  const stockMovementsController = createStockMovementsController(prisma)

  router.get('/', stockMovementsController.listStockMovements)
  router.post('/', stockMovementsController.createStockMovement)

  return router
}

export function createProductStockMovementsRouter(prisma: StockMovementPrisma) {
  // mergeParams: true is required so req.params.id from the parent route
  // (/products/:id) is accessible inside this nested router.
  const router = Router({ mergeParams: true })
  const stockMovementsController = createStockMovementsController(prisma)

  router.get('/', stockMovementsController.listProductStockMovements)

  return router
}
