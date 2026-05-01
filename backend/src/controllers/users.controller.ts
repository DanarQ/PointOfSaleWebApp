// Users controller — validates HTTP params/query and delegates admin account logic to the service.
import type { Request, Response } from 'express'
import {
  createUsersService,
  parseUserId,
  parseUserListFilters,
  type UserPrisma,
} from '../services/users.service.js'
import { parsePagination } from '../utils/pagination.js'

export function createUsersController(prisma: UserPrisma) {
  const usersService = createUsersService(prisma)

  function getCurrentUserId(req: Request) {
    return req.user?.id ?? 0
  }

  return {
    async listUsers(req: Request, res: Response) {
      const query = req.query as Record<string, unknown>
      const filters = parseUserListFilters(query)

      if ('error' in filters) {
        res.status(400).json({ error: filters.error })
        return
      }

      const pagination = parsePagination(query)

      if ('error' in pagination) {
        res.status(400).json({ error: pagination.error })
        return
      }

      const result = await usersService.listUsers(filters.value, pagination.value)
      res.json(result)
    },

    async createUser(req: Request, res: Response) {
      const result = await usersService.createUser(req.body)

      if (!result.ok) {
        res.status(result.status).json({ error: result.error })
        return
      }

      res.status(201).json(result.data)
    },

    async updateUser(req: Request, res: Response) {
      const userId = parseUserId(req.params.id)

      if (!userId) {
        res.status(400).json({ error: 'invalid user id' })
        return
      }

      const result = await usersService.updateUser(userId, getCurrentUserId(req), req.body)

      if (!result.ok) {
        res.status(result.status).json({ error: result.error })
        return
      }

      res.json(result.data)
    },

    async resetUserPassword(req: Request, res: Response) {
      const userId = parseUserId(req.params.id)

      if (!userId) {
        res.status(400).json({ error: 'invalid user id' })
        return
      }

      const result = await usersService.resetUserPassword(userId, getCurrentUserId(req), req.body)

      if (!result.ok) {
        res.status(result.status).json({ error: result.error })
        return
      }

      res.json(result.data)
    },

    async deleteUser(req: Request, res: Response) {
      const userId = parseUserId(req.params.id)

      if (!userId) {
        res.status(400).json({ error: 'invalid user id' })
        return
      }

      const result = await usersService.deleteUser(userId, getCurrentUserId(req))

      if (!result.ok) {
        res.status(result.status).json({ error: result.error })
        return
      }

      res.json(result.data)
    },
  }
}
