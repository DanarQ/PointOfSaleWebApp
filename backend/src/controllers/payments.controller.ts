// Payments controller — read-only. Payments are created automatically inside createTransaction.
import type { Request, Response } from 'express'
import { createPaymentsService, type PaymentPrisma } from '../services/payments.service.js'

export function createPaymentsController(prisma: PaymentPrisma) {
  const paymentsService = createPaymentsService(prisma)

  return {
    // GET /payments — all payments, newest first.
    async listPayments(_req: Request, res: Response) {
      const payments = await paymentsService.listPayments()
      res.json(payments)
    },
  }
}
