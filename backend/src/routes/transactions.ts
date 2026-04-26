// Transaction routes: GET /, GET /:id, POST /
// POST / creates a full transaction atomically (items, stock movements, payment in one DB transaction).
import { Router } from 'express'
import { createTransactionsController } from '../controllers/transactions.controller.js'
import type { TransactionPrisma } from '../services/transactions.service.js'

export function createTransactionsRouter(prisma: TransactionPrisma) {
  const router = Router()
  const transactionsController = createTransactionsController(prisma)

  router.get('/', transactionsController.listTransactions)
  router.get('/:id', transactionsController.getTransaction)
  router.post('/', transactionsController.createTransaction)

  return router
}
