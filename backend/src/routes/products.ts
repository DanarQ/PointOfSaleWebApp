// Product routes: full CRUD — GET /, GET /:id, POST /, PUT /:id, DELETE /:id
// Write endpoints (POST, PUT, DELETE) are protected by requireAuth when provided.
// GET /supports query params: ?isActive=true|false&search=foo&categoryId=1
import { Router, type RequestHandler } from 'express'
import { createProductsController } from '../controllers/products.controller.js'
import type { ProductPrisma } from '../services/products.service.js'

export type { ProductPrisma } from '../services/products.service.js'

export function createProductsRouter(
  prisma: ProductPrisma,
  requireAuth?: RequestHandler,
  requireAdmin?: RequestHandler,
) {
  const router = Router()
  const productsController = createProductsController(prisma)

  // Read endpoints — open by default.
  router.get('/', productsController.listProducts)
  router.get('/:id', productsController.getProduct)

  const guard = requireAuth ? [requireAuth] : []
  // DELETE requires admin role; create/update only require authentication.
  const adminGuard = requireAuth && requireAdmin ? [requireAuth, requireAdmin] : guard
  router.post('/', ...guard, productsController.createProduct)
  router.put('/:id', ...guard, productsController.updateProduct)
  router.delete('/:id', ...adminGuard, productsController.deleteProduct)

  return router
}
