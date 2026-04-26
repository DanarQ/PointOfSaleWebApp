// Category routes: GET /, POST /, PUT /:id, DELETE /:id
// No GET /:id endpoint — categories are always fetched as a full list.
import { Router } from 'express'
import { createCategoriesController } from '../controllers/categories.controller.js'
import type { CategoryPrisma } from '../services/categories.service.js'

export function createCategoriesRouter(prisma: CategoryPrisma) {
  const router = Router()
  const categoriesController = createCategoriesController(prisma)

  router.get('/', categoriesController.listCategories)
  router.post('/', categoriesController.createCategory)
  router.put('/:id', categoriesController.updateCategory)
  router.delete('/:id', categoriesController.deleteCategory)

  return router
}
