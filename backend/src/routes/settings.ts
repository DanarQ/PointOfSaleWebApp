// Settings routes: public read, admin-only write.
import { Router, type RequestHandler } from 'express'
import { createSettingsController } from '../controllers/settings.controller.js'
import type { SettingsPrisma } from '../services/settings.service.js'

export type { SettingsPrisma } from '../services/settings.service.js'

export function createSettingsRouter(
  prisma: SettingsPrisma,
  requireAuth?: RequestHandler,
  requireAdmin?: RequestHandler,
) {
  const router = Router()
  const settingsController = createSettingsController(prisma)
  const adminGuard = requireAuth && requireAdmin ? [requireAuth, requireAdmin] : []

  router.get('/', settingsController.getSettings)
  router.put('/', ...adminGuard, settingsController.updateSettings)

  return router
}
