// Transactions controller — validates the /:id param and delegates to the service.
import type { Request, Response } from 'express'
import {
  createTransactionsService,
  parseTransactionId,
  type TransactionPrisma,
} from '../services/transactions.service.js'
import { parsePagination } from '../utils/pagination.js'
import { handleServiceResponse } from '../utils/serviceResponse.js'

export function createTransactionsController(prisma: TransactionPrisma) {
  const transactionsService = createTransactionsService(prisma)

  return {
    // GET /transactions — paginated, newest first. Supports ?page=&limit=
    async listTransactions(req: Request, res: Response) {
      const pagination = parsePagination(req.query as Record<string, unknown>)

      if ('error' in pagination) {
        res.status(400).json({ error: pagination.error })
        return
      }

      const result = await transactionsService.listTransactions(pagination.value)
      res.json(result)
    },

    async getTransaction(req: Request, res: Response) {
      const transactionId = parseTransactionId(req.params.id)

      if (!transactionId) {
        res.status(400).json({ error: 'invalid transaction id' })
        return
      }

      const result = await transactionsService.getTransaction(transactionId)
      handleServiceResponse(res, result)
    },

    // POST /transactions — full checkout: validates stock, records items, payment, and stock movements atomically.
    async createTransaction(req: Request, res: Response) {
      const result = await transactionsService.createTransaction(req.body)
      handleServiceResponse(res, result, 201)
    },

    // POST /transactions/:id/void — marks a transaction as voided and restores product stock.
    // Optional body: { notes: string } to record a reason for the void.
    async voidTransaction(req: Request, res: Response) {
      const transactionId = parseTransactionId(req.params.id)

      if (!transactionId) {
        res.status(400).json({ error: 'invalid transaction id' })
        return
      }

      const result = await transactionsService.voidTransaction(transactionId, req.body)
      handleServiceResponse(res, result)
    },
  }
}
