// Transactions controller — validates the /:id param and delegates to the service.
import type { Request, Response } from 'express'
import {
  createTransactionsService,
  parseTransactionId,
  type TransactionPrisma,
} from '../services/transactions.service.js'

export function createTransactionsController(prisma: TransactionPrisma) {
  const transactionsService = createTransactionsService(prisma)

  return {
    // GET /transactions — all transactions with items and payments, newest first.
    async listTransactions(_req: Request, res: Response) {
      const transactions = await transactionsService.listTransactions()
      res.json(transactions)
    },

    async getTransaction(req: Request, res: Response) {
      const transactionId = parseTransactionId(req.params.id)

      if (!transactionId) {
        res.status(400).json({ error: 'invalid transaction id' })
        return
      }

      const result = await transactionsService.getTransaction(transactionId)

      if (!result.ok) {
        res.status(result.status).json({ error: result.error })
        return
      }

      res.json(result.data)
    },

    // POST /transactions — full checkout: validates stock, records items, payment, and stock movements atomically.
    async createTransaction(req: Request, res: Response) {
      const result = await transactionsService.createTransaction(req.body)

      if (!result.ok) {
        res.status(result.status).json({ error: result.error })
        return
      }

      res.status(201).json(result.data)
    },
  }
}
