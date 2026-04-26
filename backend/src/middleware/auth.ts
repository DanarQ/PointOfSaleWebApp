// Auth middleware factory.
// Returns an Express middleware that:
//   1. Reads the Authorization header
//   2. Verifies the JWT signature
//   3. Looks up the user in the DB to confirm they still exist
//   4. Attaches { id, email, role } to req.user, then calls next()
// On any failure, responds 401 immediately and does NOT call next().
import type { Request, Response, NextFunction, RequestHandler } from 'express'
import {
  createAuthService,
  parseBearerToken,
  type AuthPrisma,
} from '../services/auth.service.js'

// Augment Express's Request type so route handlers can access req.user with proper typing.
declare module 'express-serve-static-core' {
  interface Request {
    user?: {
      id: number
      email: string
      role: string
    }
  }
}

// Creates the requireAuth middleware bound to a prisma client.
// Reuses authService.getCurrentUser so the verification logic stays in one place.
export function createAuthMiddleware(prisma: AuthPrisma): RequestHandler {
  const authService = createAuthService(prisma)

  return async (req: Request, res: Response, next: NextFunction) => {
    const token = parseBearerToken(req.header('authorization'))
    const result = await authService.getCurrentUser(token)

    if (!result.ok) {
      res.status(result.status).json({ error: result.error })
      return
    }

    req.user = result.data.user
    next()
  }
}

// Optional middleware factory for role-based access control.
// Use after requireAuth to restrict an endpoint to specific roles.
// Example: router.delete('/:id', requireAuth, requireRole('admin'), handler)
export function requireRole(...allowedRoles: string[]): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json({ error: 'authorization token is required' })
      return
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({ error: 'insufficient permissions' })
      return
    }

    next()
  }
}
