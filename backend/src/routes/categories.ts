// Category routes: GET /, POST /, PUT /:id, DELETE /:id
// Write endpoints are protected by requireAuth when provided.
import { Router, type RequestHandler } from 'express'
import { createCategoriesController } from '../controllers/categories.controller.js'
import type { CategoryPrisma } from '../services/categories.service.js'

export function createCategoriesRouter(
  prisma: CategoryPrisma,
  requireAuth?: RequestHandler,
  requireAdmin?: RequestHandler,
) {
  const router = Router()
  const categoriesController = createCategoriesController(prisma)

  router.get('/', categoriesController.listCategories)

  const guard = requireAuth ? [requireAuth] : []
  // DELETE requires admin role; create/update only require authentication.
  const adminGuard = requireAuth && requireAdmin ? [requireAuth, requireAdmin] : guard
  router.post('/', ...guard, categoriesController.createCategory)
  router.put('/:id', ...guard, categoriesController.updateCategory)
  router.delete('/:id', ...adminGuard, categoriesController.deleteCategory)

  return router
}
