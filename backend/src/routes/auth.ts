// Auth routes: POST /auth/register, POST /auth/login, GET /auth/me
// Re-exports AuthPrisma, createAuthToken, and hashPassword so callers
// (e.g. seed scripts or tests) can use them without importing from the service directly.
import { Router } from 'express'
import { createAuthController } from '../controllers/auth.controller.js'
import type { AuthPrisma } from '../services/auth.service.js'

export type { AuthPrisma } from '../services/auth.service.js'
export { createAuthToken, hashPassword } from '../services/auth.service.js'

export function createAuthRouter(prisma: AuthPrisma) {
  const router = Router()
  const authController = createAuthController(prisma)

  router.post('/register', authController.register)
  router.post('/login', authController.login)
  // GET /auth/me — requires Authorization: Bearer <token> header
  router.get('/me', authController.me)

  return router
}
