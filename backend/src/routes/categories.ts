// Category routes: GET /, POST /, PUT /:id, DELETE /:id
// Write endpoints are protected by requireAuth when provided.
import { Router, type RequestHandler } from 'express'
import { createCategoriesController } from '../controllers/categories.controller.js'
import type { CategoryPrisma } from '../services/categories.service.js'

export function createCategoriesRouter(prisma: CategoryPrisma, requireAuth?: RequestHandler) {
  const router = Router()
  const categoriesController = createCategoriesController(prisma)

  router.get('/', categoriesController.listCategories)

  const guard = requireAuth ? [requireAuth] : []
  router.post('/', ...guard, categoriesController.createCategory)
  router.put('/:id', ...guard, categoriesController.updateCategory)
  router.delete('/:id', ...guard, categoriesController.deleteCategory)

  return router
}
