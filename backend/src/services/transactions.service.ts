// Transactions service — handles the full checkout flow.
// Creating a transaction is one atomic DB operation that:
//   1. Resolves product prices and validates stock
//   2. Calculates subtotals, total, change
//   3. Creates the transaction record (initial invoice number based on timestamp)
//   4. Updates the invoice number to INV-XXXXXX using the real DB-assigned ID
//   5. Decrements stock for each item (using updateMany to prevent negatives)
//   6. Creates a TransactionItem and StockMovement record per line item
//   7. Creates a Payment record
// If any step fails, the entire transaction is rolled back.

type ProductRecord = {
  id: number
  name: string
  price: number
  costPrice?: number | null
  stock?: number | null
}

type TransactionRecord = {
  id: number
  invoiceNumber: string
  cashierId?: number | null
  subtotal: number
  discount: number
  tax: number
  total: number
  paidAmount: number
  changeAmount: number
  paymentMethod: string
  status: string
  notes?: string | null
  items?: TransactionItemRecord[]
  payments?: PaymentRecord[]
}

// Snapshot of the product at time of sale — stored so history is accurate even if product changes later.
type TransactionItemRecord = {
  id: number
  transactionId: number
  productId: number
  productName: string   // snapshot of name at time of sale
  quantity: number
  unitPrice: number     // snapshot of price at time of sale
  costPrice?: number | null
  discount: number
  subtotal: number
}

type PaymentRecord = {
  id: number
  transactionId: number
  amount: number
  method: string
  provider?: string | null          // e.g. "GoPay", "OVO"
  referenceNumber?: string | null   // payment gateway reference
  status: string
}

type StockMovementRecord = {
  id: number
  productId: number
  userId?: number | null
  type: string
  quantity: number
  stockBefore: number
  stockAfter: number
  referenceType?: string | null
  referenceId?: number | null
  notes?: string | null
}

// Always fetch items and payments together so the response is complete.
type TransactionInclude = {
  items: true
  payments: true
}

type TransactionCreateData = Omit<TransactionRecord, 'id' | 'items' | 'payments'>

// Prisma methods used *inside* the $transaction callback.
type TransactionPrismaClient = {
  product: {
    findUnique: (args: { where: { id: number } }) => Promise<ProductRecord | null>
    // updateMany with conditional WHERE to decrement stock atomically.
    updateMany: (args: {
      where: { id: number; stock: { gte: number } }
      data: { stock: { decrement: number } }
    }) => Promise<{ count: number }>
  }
  transaction: {
    findMany: (args: { orderBy: { id: 'desc' }; include: TransactionInclude }) => Promise<TransactionRecord[]>
    findUnique: (args: { where: { id: number }; include: TransactionInclude }) => Promise<TransactionRecord | null>
    create: (args: { data: TransactionCreateData }) => Promise<TransactionRecord>
    update: (args: {
      where: { id: number }
      data: { invoiceNumber: string }
    }) => Promise<TransactionRecord | null>
  }
  transactionItem: {
    create: (args: { data: Omit<TransactionItemRecord, 'id'> }) => Promise<TransactionItemRecord>
  }
  payment: {
    create: (args: { data: Omit<PaymentRecord, 'id'> }) => Promise<PaymentRecord>
  }
  stockMovement: {
    create: (args: { data: Omit<StockMovementRecord, 'id'> }) => Promise<StockMovementRecord>
  }
}

export type TransactionPrisma = TransactionPrismaClient & {
  $transaction: <T>(run: (tx: TransactionPrismaClient) => Promise<T>) => Promise<T>
}

// Validated per-item data from the request body.
type ParsedTransactionItem = {
  productId: number
  quantity: number
  discount: number  // per-item discount amount
}

// Validated full request body.
type ParsedTransactionBody = {
  cashierId: number | null
  items: ParsedTransactionItem[]
  discount: number         // order-level discount amount
  tax: number              // order-level tax amount
  paidAmount?: number      // optional — defaults to exact total if omitted
  paymentMethod: string
  paymentProvider: string | null
  paymentReferenceNumber: string | null
  notes: string | null
}

// Result type — avoids throwing for expected failures.
type TransactionServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: 400 | 404; error: string }

const transactionInclude = { items: true, payments: true } as const

// Parses and validates a transaction ID from a URL param string.
export function parseTransactionId(rawId: unknown) {
  if (typeof rawId !== 'string') {
    return null
  }

  const id = Number(rawId)

  if (!Number.isInteger(id) || id <= 0) {
    return null
  }

  return id
}

// Validates that a value is a positive integer.
function parsePositiveInteger(value: unknown, fieldName: string): { value: number } | { error: string } {
  if (typeof value !== 'number' || !Number.isInteger(value) || value <= 0) {
    return { error: `${fieldName} must be a positive integer` }
  }

  return { value }
}

// Treats undefined/null as "not provided" (returns null).
function parseOptionalPositiveInteger(
  body: Record<string, unknown>,
  fieldName: 'cashierId',
): { value: number | null } | { error: string } {
  const value = body[fieldName]

  if (value === undefined || value === null) {
    return { value: null }
  }

  return parsePositiveInteger(value, fieldName)
}

// Validates that a value is a number >= 0 (used for prices, discounts, taxes).
function parseNonNegativeNumber(value: unknown, fieldName: string): { value: number } | { error: string } {
  if (typeof value !== 'number' || Number.isNaN(value) || value < 0) {
    return { error: `${fieldName} must be a non-negative number` }
  }

  return { value }
}

// Treats undefined/null as "not provided" (returns null). Trims empty strings to null.
function parseOptionalString(
  body: Record<string, unknown>,
  fieldName: 'paymentMethod' | 'paymentProvider' | 'paymentReferenceNumber' | 'notes',
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

// Validates the full transaction request body.
// Required: items (array, min 1).
// Optional: cashierId, discount, tax, paidAmount, paymentMethod, paymentProvider, paymentReferenceNumber, notes.
function parseTransactionBody(body: unknown): TransactionServiceResult<ParsedTransactionBody> {
  if (!body || typeof body !== 'object') {
    return { ok: false, status: 400, error: 'invalid request body' }
  }

  const transactionBody = body as Record<string, unknown>

  if (!Array.isArray(transactionBody.items) || transactionBody.items.length === 0) {
    return { ok: false, status: 400, error: 'items must contain at least one item' }
  }

  const cashierId = parseOptionalPositiveInteger(transactionBody, 'cashierId')

  if ('error' in cashierId) {
    return { ok: false, status: 400, error: cashierId.error }
  }

  // Default discount and tax to 0 if not provided.
  const discount = parseNonNegativeNumber(transactionBody.discount ?? 0, 'discount')

  if ('error' in discount) {
    return { ok: false, status: 400, error: discount.error }
  }

  const tax = parseNonNegativeNumber(transactionBody.tax ?? 0, 'tax')

  if ('error' in tax) {
    return { ok: false, status: 400, error: tax.error }
  }

  const paymentMethod = parseOptionalString(transactionBody, 'paymentMethod')

  if ('error' in paymentMethod) {
    return { ok: false, status: 400, error: paymentMethod.error }
  }

  const paymentProvider = parseOptionalString(transactionBody, 'paymentProvider')

  if ('error' in paymentProvider) {
    return { ok: false, status: 400, error: paymentProvider.error }
  }

  const paymentReferenceNumber = parseOptionalString(transactionBody, 'paymentReferenceNumber')

  if ('error' in paymentReferenceNumber) {
    return { ok: false, status: 400, error: paymentReferenceNumber.error }
  }

  const notes = parseOptionalString(transactionBody, 'notes')

  if ('error' in notes) {
    return { ok: false, status: 400, error: notes.error }
  }

  let paidAmount: number | undefined

  if (transactionBody.paidAmount !== undefined) {
    const parsedPaidAmount = parseNonNegativeNumber(transactionBody.paidAmount, 'paidAmount')

    if ('error' in parsedPaidAmount) {
      return { ok: false, status: 400, error: parsedPaidAmount.error }
    }

    paidAmount = parsedPaidAmount.value
  }

  // Validate each item in the items array.
  const items: ParsedTransactionItem[] = []

  for (const rawItem of transactionBody.items) {
    if (!rawItem || typeof rawItem !== 'object') {
      return { ok: false, status: 400, error: 'items must contain valid objects' }
    }

    const item = rawItem as Record<string, unknown>
    const productId = parsePositiveInteger(item.productId, 'productId')

    if ('error' in productId) {
      return { ok: false, status: 400, error: productId.error }
    }

    const quantity = parsePositiveInteger(item.quantity, 'quantity')

    if ('error' in quantity) {
      return { ok: false, status: 400, error: quantity.error }
    }

    const itemDiscount = parseNonNegativeNumber(item.discount ?? 0, 'item discount')

    if ('error' in itemDiscount) {
      return { ok: false, status: 400, error: itemDiscount.error }
    }

    items.push({
      productId: productId.value,
      quantity: quantity.value,
      discount: itemDiscount.value,
    })
  }

  return {
    ok: true,
    data: {
      cashierId: cashierId.value,
      items,
      discount: discount.value,
      tax: tax.value,
      paidAmount,
      // Default payment method to 'cash' if not specified.
      paymentMethod: paymentMethod.value ?? 'cash',
      paymentProvider: paymentProvider.value,
      paymentReferenceNumber: paymentReferenceNumber.value,
      notes: notes.value,
    },
  }
}

// Formats the invoice number as INV-000001 using the transaction's DB-assigned ID.
// Zero-padded to 6 digits to sort correctly as a string.
function createInvoiceNumber(nextId: number) {
  return `INV-${String(nextId).padStart(6, '0')}`
}

export function createTransactionsService(prisma: TransactionPrisma) {
  return {
    // GET /transactions — all transactions with items and payments, newest first.
    async listTransactions() {
      return prisma.transaction.findMany({
        orderBy: { id: 'desc' },
        include: transactionInclude,
      })
    },

    async getTransaction(id: number): Promise<TransactionServiceResult<TransactionRecord>> {
      const transaction = await prisma.transaction.findUnique({
        where: { id },
        include: transactionInclude,
      })

      if (!transaction) {
        return { ok: false, status: 404, error: 'transaction not found' }
      }

      return { ok: true, data: transaction }
    },

    // POST /transactions — the full checkout flow inside a single DB transaction.
    async createTransaction(body: unknown): Promise<TransactionServiceResult<TransactionRecord>> {
      const parsedBody = parseTransactionBody(body)

      if (!parsedBody.ok) {
        return parsedBody
      }

      return prisma.$transaction(async (tx) => {
        // Cache fetched products to avoid duplicate DB calls when the same product
        // appears in multiple line items.
        const products = new Map<number, ProductRecord>()
        const resolvedItems: Array<ParsedTransactionItem & { product: ProductRecord; subtotal: number }> = []

        // Step 1: resolve each item to its product and compute item subtotals.
        for (const item of parsedBody.data.items) {
          const product = products.get(item.productId) ?? await tx.product.findUnique({
            where: { id: item.productId },
          })

          if (!product) {
            return { ok: false, status: 404, error: 'product not found' }
          }

          products.set(item.productId, product)

          // subtotal = (unit price × qty) − item-level discount
          const subtotal = product.price * item.quantity - item.discount

          if (subtotal < 0) {
            return { ok: false, status: 400, error: 'item subtotal cannot be negative' }
          }

          resolvedItems.push({ ...item, product, subtotal })
        }

        // Step 2: compute order-level totals.
        const subtotal = resolvedItems.reduce((sum, item) => sum + item.subtotal, 0)
        const total = subtotal - parsedBody.data.discount + parsedBody.data.tax

        if (total < 0) {
          return { ok: false, status: 400, error: 'total cannot be negative' }
        }

        // If paidAmount was not provided, default to exact total (no change).
        const paidAmount = parsedBody.data.paidAmount ?? total

        if (paidAmount < total) {
          return { ok: false, status: 400, error: 'paidAmount must cover total' }
        }

        // Step 3: create the transaction record.
        // Use Date.now() as a temporary invoice number — will be replaced in step 4.
        const transaction = await tx.transaction.create({
          data: {
            invoiceNumber: createInvoiceNumber(Date.now()),
            cashierId: parsedBody.data.cashierId,
            subtotal,
            discount: parsedBody.data.discount,
            tax: parsedBody.data.tax,
            total,
            paidAmount,
            changeAmount: paidAmount - total,
            paymentMethod: parsedBody.data.paymentMethod,
            status: 'completed',
            notes: parsedBody.data.notes,
          },
        })

        // Step 4: replace the temp invoice number with one based on the actual DB ID.
        // This two-step approach is necessary because the ID is only known after insert.
        const invoiceNumber = createInvoiceNumber(transaction.id)
        await tx.transaction.update({
          where: { id: transaction.id },
          data: { invoiceNumber },
        })

        // Step 5: for each line item — decrement stock, create TransactionItem, create StockMovement.
        for (const item of resolvedItems) {
          // Use updateMany with a conditional WHERE to atomically prevent stock going negative.
          // If count === 0, either the product doesn't exist or stock is insufficient.
          const updatedProducts = await tx.product.updateMany({
            where: {
              id: item.productId,
              stock: { gte: item.quantity },
            },
            data: { stock: { decrement: item.quantity } },
          })

          if (updatedProducts.count === 0) {
            return { ok: false, status: 400, error: 'stock cannot be negative' }
          }

          const updatedProduct = await tx.product.findUnique({
            where: { id: item.productId },
          })
          const stockAfter = updatedProduct?.stock ?? 0
          const stockBefore = stockAfter + item.quantity

          // Snapshot product name and price at time of sale so the record stays accurate
          // even if the product is edited or deleted later.
          await tx.transactionItem.create({
            data: {
              transactionId: transaction.id,
              productId: item.productId,
              productName: item.product.name,
              quantity: item.quantity,
              unitPrice: item.product.price,
              costPrice: item.product.costPrice ?? null,
              discount: item.discount,
              subtotal: item.subtotal,
            },
          })

          // Record the stock change linked back to this transaction for audit purposes.
          await tx.stockMovement.create({
            data: {
              productId: item.productId,
              userId: parsedBody.data.cashierId,
              type: 'sale',
              quantity: item.quantity,
              stockBefore,
              stockAfter,
              referenceType: 'transaction',
              referenceId: transaction.id,
              notes: `Sale ${invoiceNumber}`,
            },
          })
        }

        // Step 6: create the payment record.
        await tx.payment.create({
          data: {
            transactionId: transaction.id,
            amount: paidAmount,
            method: parsedBody.data.paymentMethod,
            provider: parsedBody.data.paymentProvider,
            referenceNumber: parsedBody.data.paymentReferenceNumber,
            status: 'paid',
          },
        })

        // Fetch the completed transaction with all relations for the response.
        const createdTransaction = await tx.transaction.findUnique({
          where: { id: transaction.id },
          include: transactionInclude,
        })

        if (!createdTransaction) {
          return { ok: false, status: 404, error: 'transaction not found' }
        }

        // Override invoiceNumber in the response — the DB record was already updated above.
        return { ok: true, data: { ...createdTransaction, invoiceNumber } }
      })
    },
  }
}
