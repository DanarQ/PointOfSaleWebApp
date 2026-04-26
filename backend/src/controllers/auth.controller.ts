// Auth controller — thin layer between HTTP and the auth service.
// All business logic (validation, hashing, JWT) lives in the service.
// Controllers only translate service results into HTTP responses.
import type { Request, Response } from 'express'
import { createAuthService, parseBearerToken, type AuthPrisma } from '../services/auth.service.js'

export function createAuthController(prisma: AuthPrisma) {
  const authService = createAuthService(prisma)

  return {
    async register(req: Request, res: Response) {
      const result = await authService.register(req.body)

      if (!result.ok) {
        res.status(result.status).json({ error: result.error })
        return
      }

      // 201 Created — returns the new user (without password) and a JWT token.
      res.status(201).json(result.data)
    },

    async login(req: Request, res: Response) {
      const result = await authService.login(req.body)

      if (!result.ok) {
        res.status(result.status).json({ error: result.error })
        return
      }

      res.json(result.data)
    },

    async me(req: Request, res: Response) {
      // parseBearerToken strips "Bearer " from the Authorization header value.
      const result = await authService.getCurrentUser(parseBearerToken(req.header('authorization')))

      if (!result.ok) {
        res.status(result.status).json({ error: result.error })
        return
      }

      res.json(result.data)
    },

    // POST /auth/refresh — accepts { refreshToken } and returns a new token pair.
    async refresh(req: Request, res: Response) {
      const result = await authService.refresh(req.body)

      if (!result.ok) {
        res.status(result.status).json({ error: result.error })
        return
      }

      res.json(result.data)
    },
  }
}
