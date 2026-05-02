// Settings controller - keeps HTTP handling thin and delegates validation to the service.
import type { Request, Response } from 'express'
import {
  createSettingsService,
  type SettingsPrisma,
} from '../services/settings.service.js'
import { handleServiceResponse } from '../utils/serviceResponse.js'

export function createSettingsController(prisma: SettingsPrisma) {
  const settingsService = createSettingsService(prisma)

  return {
    async getSettings(_req: Request, res: Response) {
      res.json(await settingsService.getSettings())
    },

    async updateSettings(req: Request, res: Response) {
      const result = await settingsService.updateSettings(req.body)
      handleServiceResponse(res, result)
    },
  }
}
