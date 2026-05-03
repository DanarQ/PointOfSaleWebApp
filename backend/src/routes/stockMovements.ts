// Two separate routers for stock movements:
//   - createStockMovementsRouter: mounted at /stock-movements (global list + create)
//   - createProductStockMovementsRouter: mounted at /products/:id/stock-movements (per-product list)
// POST /stock-movements is admin-only when auth guards are provided.
import { Router, type RequestHandler } from 'express'
import { createStockMovementsController } from '../controllers/stockMovements.controller.js'
import type { StockMovementPrisma } from '../services/stockMovements.service.js'

export function createStockMovementsRouter(
  prisma: StockMovementPrisma,
  requireAuth?: RequestHandler,
  requireAdmin?: RequestHandler,
) {
  const router = Router()
  const stockMovementsController = createStockMovementsController(prisma)

  router.get('/', stockMovementsController.listStockMovements)

  const guard = requireAuth && requireAdmin ? [requireAuth, requireAdmin] : []
  router.post('/', ...guard, stockMovementsController.createStockMovement)

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
