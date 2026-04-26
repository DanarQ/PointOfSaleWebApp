// Auth routes: POST /auth/register, POST /auth/login, GET /auth/me, POST /auth/refresh
// Re-exports AuthPrisma, createAuthToken, and hashPassword so callers
// (e.g. seed scripts or tests) can use them without importing from the service directly.
import { Router } from 'express'
import { createAuthController } from '../controllers/auth.controller.js'
import type { AuthPrisma } from '../services/auth.service.js'

export type { AuthPrisma } from '../services/auth.service.js'
export { createAuthToken, createRefreshToken, hashPassword } from '../services/auth.service.js'

export function createAuthRouter(prisma: AuthPrisma) {
  const router = Router()
  const authController = createAuthController(prisma)

  router.post('/register', authController.register)
  router.post('/login', authController.login)
  // POST /auth/refresh — body: { refreshToken }, returns new access + refresh token pair
  router.post('/refresh', authController.refresh)
  // GET /auth/me — requires Authorization: Bearer <token> header
  router.get('/me', authController.me)

  return router
}
