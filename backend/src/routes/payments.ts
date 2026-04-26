// Payment routes: GET / only — payments are created automatically when a transaction is created.
import { Router } from 'express'
import { createPaymentsController } from '../controllers/payments.controller.js'
import type { PaymentPrisma } from '../services/payments.service.js'

export function createPaymentsRouter(prisma: PaymentPrisma) {
  const router = Router()
  const paymentsController = createPaymentsController(prisma)

  router.get('/', paymentsController.listPayments)

  return router
}
