// Product routes: full CRUD — GET /, GET /:id, POST /, PUT /:id, DELETE /:id
// Write endpoints (POST, PUT, DELETE) are protected by requireAuth when provided.
// GET /supports query params: ?isActive=true|false&search=foo&categoryId=1
import { Router, type RequestHandler } from 'express'
import { createProductsController } from '../controllers/products.controller.js'
import type { ProductPrisma } from '../services/products.service.js'

export type { ProductPrisma } from '../services/products.service.js'

export function createProductsRouter(prisma: ProductPrisma, requireAuth?: RequestHandler) {
  const router = Router()
  const productsController = createProductsController(prisma)

  // Read endpoints — open by default. Add requireAuth here too if you want fully-locked APIs.
  router.get('/', productsController.listProducts)
  router.get('/:id', productsController.getProduct)

  // Spread into the route signature: if no middleware was provided, no extra handlers are added.
  const guard = requireAuth ? [requireAuth] : []
  router.post('/', ...guard, productsController.createProduct)
  router.put('/:id', ...guard, productsController.updateProduct)
  router.delete('/:id', ...guard, productsController.deleteProduct)

  return router
}
