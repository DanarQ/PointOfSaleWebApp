// Stock movements service — tracks every stock change (in/out) for each product.
// Creating a movement also updates product.stock atomically inside a DB transaction.
import { isPrismaRecordNotFoundError } from '../utils/prismaErrors.js'

type ProductStockRecord = {
  id: number
  stock?: number | null
}

// Full stock movement record as stored in the DB.
type StockMovementRecord = {
  id: number
  productId: number
  userId?: number | null
  type: string
  quantity: number
  stockBefore: number
  stockAfter: number
  referenceType?: string | null  // e.g. "transaction", "adjustment"
  referenceId?: number | null    // e.g. transaction ID
  notes?: string | null
}

type StockMovementCreateData = Omit<StockMovementRecord, 'id'>

// Subset of prisma used *inside* a $transaction callback — no findMany and no $transaction.
type StockMovementTransactionPrisma = {
  product: {
    findUnique: (args: { where: { id: number } }) => Promise<ProductStockRecord | null>
    update: (args: {
      where: { id: number }
      data: { stock: { increment: number } }
    }) => Promise<ProductStockRecord | null>
    // updateMany with a conditional WHERE is used for atomic stock decrement
    // to prevent stock going negative without needing a SELECT-then-UPDATE.
    updateMany: (args: {
      where: { id: number; stock: { gte: number } }
      data: { stock: { decrement: number } }
    }) => Promise<{ count: number }>
  }
  stockMovement: {
    create: (args: { data: StockMovementCreateData }) => Promise<StockMovementRecord>
  }
}

// Full prisma interface including findMany (for listing) and $transaction.
export type StockMovementPrisma = StockMovementTransactionPrisma & {
  stockMovement: StockMovementTransactionPrisma['stockMovement'] & {
    findMany: (args: {
      where?: { productId: number }
      orderBy: { id: 'desc' }
    }) => Promise<StockMovementRecord[]>
  }
  $transaction: <T>(run: (tx: StockMovementTransactionPrisma) => Promise<T>) => Promise<T>
}

// Validated input from the request body before it hits the DB.
type StockMovementBodyData = {
  productId: number
  userId: number | null
  type: 'in' | 'out'
  quantity: number
  referenceType: string | null
  referenceId: number | null
  notes: string | null
}

// Result type — avoids throwing for expected failures.
export type StockMovementServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: 400 | 404; error: string }

// Parses and validates a product ID from a URL param string.
export function parseProductId(rawId: unknown) {
  if (typeof rawId !== 'string') {
    return null
  }

  const id = Number(rawId)

  if (!Number.isInteger(id) || id <= 0) {
    return null
  }

  return id
}

// Validates that a value is a positive integer (used for productId, quantity, userId, referenceId).
function parsePositiveInteger(value: unknown, fieldName: string): { value: number } | { error: string } {
  if (typeof value !== 'number' || !Number.isInteger(value) || value <= 0) {
    return { error: `${fieldName} must be a positive integer` }
  }

  return { value }
}

// Same as above but treats undefined/null as "not provided" (returns null, not an error).
function parseOptionalPositiveInteger(
  body: Record<string, unknown>,
  fieldName: 'userId' | 'referenceId',
): { value: number | null } | { error: string } {
  const value = body[fieldName]

  if (value === undefined || value === null) {
    return { value: null }
  }

  return parsePositiveInteger(value, fieldName)
}

// Treats undefined/null as "not provided" (returns null). Trims empty strings to null.
function parseOptionalString(
  body: Record<string, unknown>,
  fieldName: 'referenceType' | 'notes',
): { value: string | null } | { error: string } {
  const value = body[fieldName]

  if (value === undefined || value === null) {
    return { value: null }
  }

  if (typeof value !== 'string') {
    return { error: `${fieldName} must be a string` }
  }

  return { value: value.trim() || null }
}

// Full request body validation for creating a stock movement.
// Required: productId, quantity, type ('in' | 'out').
// Optional: userId, referenceType, referenceId, notes.
function parseStockMovementBody(body: unknown): StockMovementServiceResult<StockMovementBodyData> {
  if (!body || typeof body !== 'object') {
    return { ok: false, status: 400, error: 'invalid request body' }
  }

  const stockBody = body as Record<string, unknown>
  const productId = parsePositiveInteger(stockBody.productId, 'productId')

  if ('error' in productId) {
    return { ok: false, status: 400, error: productId.error }
  }

  const quantity = parsePositiveInteger(stockBody.quantity, 'quantity')

  if ('error' in quantity) {
    return { ok: false, status: 400, error: quantity.error }
  }

  if (stockBody.type !== 'in' && stockBody.type !== 'out') {
    return { ok: false, status: 400, error: 'type must be in or out' }
  }

  const userId = parseOptionalPositiveInteger(stockBody, 'userId')

  if ('error' in userId) {
    return { ok: false, status: 400, error: userId.error }
  }

  const referenceId = parseOptionalPositiveInteger(stockBody, 'referenceId')

  if ('error' in referenceId) {
    return { ok: false, status: 400, error: referenceId.error }
  }

  const referenceType = parseOptionalString(stockBody, 'referenceType')

  if ('error' in referenceType) {
    return { ok: false, status: 400, error: referenceType.error }
  }

  const notes = parseOptionalString(stockBody, 'notes')

  if ('error' in notes) {
    return { ok: false, status: 400, error: notes.error }
  }

  return {
    ok: true,
    data: {
      productId: productId.value,
      userId: userId.value,
      type: stockBody.type,
      quantity: quantity.value,
      referenceType: referenceType.value,
      referenceId: referenceId.value,
      notes: notes.value,
    },
  }
}

export function createStockMovementsService(prisma: StockMovementPrisma) {
  return {
    // GET /stock-movements — all movements, newest first.
    async listStockMovements() {
      return prisma.stockMovement.findMany({ orderBy: { id: 'desc' } })
    },

    // GET /products/:id/stock-movements — confirms the product exists first.
    async listProductStockMovements(productId: number): Promise<StockMovementServiceResult<StockMovementRecord[]>> {
      const product = await prisma.product.findUnique({ where: { id: productId } })

      if (!product) {
        return { ok: false, status: 404, error: 'product not found' }
      }

      const movements = await prisma.stockMovement.findMany({
        where: { productId },
        orderBy: { id: 'desc' },
      })

      return { ok: true, data: movements }
    },

    // POST /stock-movements — records a movement and updates product.stock in one DB transaction.
    async createStockMovement(body: unknown): Promise<StockMovementServiceResult<StockMovementRecord>> {
      const parsedBody = parseStockMovementBody(body)

      if (!parsedBody.ok) {
        return parsedBody
      }

      return prisma.$transaction(async (tx) => {
        let stockBefore: number
        let stockAfter: number

        if (parsedBody.data.type === 'in') {
          // stock-in: use increment so concurrent requests don't overwrite each other.
          try {
            const product = await tx.product.update({
              where: { id: parsedBody.data.productId },
              data: { stock: { increment: parsedBody.data.quantity } },
            })

            if (!product) {
              return { ok: false, status: 404, error: 'product not found' }
            }

            stockAfter = product.stock ?? 0
            stockBefore = stockAfter - parsedBody.data.quantity
          } catch (error) {
            // Prisma throws P2025 when the record to update doesn't exist.
            if (isPrismaRecordNotFoundError(error)) {
              return { ok: false, status: 404, error: 'product not found' }
            }

            throw error
          }
        } else {
          // stock-out: use updateMany with WHERE stock >= quantity.
          // If count === 0 the product either doesn't exist or has insufficient stock.
          // This avoids a separate SELECT-then-UPDATE race condition.
          const updatedProducts = await tx.product.updateMany({
            where: {
              id: parsedBody.data.productId,
              stock: { gte: parsedBody.data.quantity },
            },
            data: { stock: { decrement: parsedBody.data.quantity } },
          })

          if (updatedProducts.count === 0) {
            // Distinguish between "product not found" and "insufficient stock".
            const product = await tx.product.findUnique({
              where: { id: parsedBody.data.productId },
            })

            if (!product) {
              return { ok: false, status: 404, error: 'product not found' }
            }

            return { ok: false, status: 400, error: 'stock cannot be negative' }
          }

          const product = await tx.product.findUnique({
            where: { id: parsedBody.data.productId },
          })

          stockAfter = product?.stock ?? 0
          stockBefore = stockAfter + parsedBody.data.quantity
        }

        const movement = await tx.stockMovement.create({
          data: {
            productId: parsedBody.data.productId,
            userId: parsedBody.data.userId,
            type: parsedBody.data.type,
            quantity: parsedBody.data.quantity,
            stockBefore,
            stockAfter,
            referenceType: parsedBody.data.referenceType,
            referenceId: parsedBody.data.referenceId,
            notes: parsedBody.data.notes,
          },
        })

        return { ok: true, data: movement }
      })
    },
  }
}
