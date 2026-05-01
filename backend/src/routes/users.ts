// User routes: admin-only account management.
import { Router, type RequestHandler } from 'express'
import { createUsersController } from '../controllers/users.controller.js'
import type { UserPrisma } from '../services/users.service.js'

export type { UserPrisma } from '../services/users.service.js'

export function createUsersRouter(
  prisma: UserPrisma,
  requireAuth: RequestHandler,
  requireAdmin: RequestHandler,
) {
  const router = Router()
  const usersController = createUsersController(prisma)
  const adminGuard = [requireAuth, requireAdmin]

  router.get('/', ...adminGuard, usersController.listUsers)
  router.post('/', ...adminGuard, usersController.createUser)
  router.put('/:id/password', ...adminGuard, usersController.resetUserPassword)
  router.put('/:id', ...adminGuard, usersController.updateUser)
  router.delete('/:id', ...adminGuard, usersController.deleteUser)

  return router
}
