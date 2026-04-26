// Product routes: full CRUD — GET /, GET /:id, POST /, PUT /:id, DELETE /:id
import { Router } from 'express'
import { createProductsController } from '../controllers/products.controller.js'
import type { ProductPrisma } from '../services/products.service.js'

export type { ProductPrisma } from '../services/products.service.js'

export function createProductsRouter(prisma: ProductPrisma) {
  const router = Router()
  const productsController = createProductsController(prisma)

  router.get('/', productsController.listProducts)
  router.get('/:id', productsController.getProduct)
  router.post('/', productsController.createProduct)
  router.put('/:id', productsController.updateProduct)
  router.delete('/:id', productsController.deleteProduct)

  return router
}
