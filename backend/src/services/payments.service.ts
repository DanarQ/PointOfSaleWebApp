// Payments service — read-only. Payments are created automatically inside createTransaction.

type PaymentRecord = {
  id: number
  transactionId: number
  amount: number
  method: string
  provider?: string | null          // e.g. "GoPay", "OVO", "DANA"
  referenceNumber?: string | null   // payment gateway reference number
  status: string
}

// Minimal prisma interface — only findMany is needed since this service is read-only.
export type PaymentPrisma = {
  payment: {
    findMany: (args: { orderBy: { id: 'desc' } }) => Promise<PaymentRecord[]>
  }
}

export function createPaymentsService(prisma: PaymentPrisma) {
  return {
    // GET /payments — all payments, newest first.
    async listPayments() {
      return prisma.payment.findMany({ orderBy: { id: 'desc' } })
    },
  }
}
