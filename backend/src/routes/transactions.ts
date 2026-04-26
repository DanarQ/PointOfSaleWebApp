// Transaction routes: GET /, GET /:id, POST /, POST /:id/void
// POST / creates a full transaction atomically (items, stock movements, payment in one DB transaction).
// POST /:id/void reverses a completed transaction and restores stock.
// Both write endpoints are protected by requireAuth when provided.
import { Router, type RequestHandler } from 'express'
import { createTransactionsController } from '../controllers/transactions.controller.js'
import type { TransactionPrisma } from '../services/transactions.service.js'

export function createTransactionsRouter(prisma: TransactionPrisma, requireAuth?: RequestHandler) {
  const router = Router()
  const transactionsController = createTransactionsController(prisma)

  router.get('/', transactionsController.listTransactions)

  const guard = requireAuth ? [requireAuth] : []
  // /:id/void must be registered before /:id so Express doesn't treat "void" as an ID value.
  router.post('/:id/void', ...guard, transactionsController.voidTransaction)
  router.get('/:id', transactionsController.getTransaction)
  router.post('/', ...guard, transactionsController.createTransaction)

  return router
}
