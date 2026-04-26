// Products service — handles CRUD for products including optional category linking.
// Categories are managed via Prisma's connectOrCreate so the client only needs
// to send a category name string; the service handles slug generation and creation.

type CategoryRecord = {
  id: number
  name: string
  slug: string
}

type ProductRecord = {
  id: number
  name: string
  price: number
  sku?: string | null
  barcode?: string | null
  category?: CategoryRecord | null
  description?: string | null
  imageUrl?: string | null
  stock?: number
  unit?: string
  costPrice?: number | null
  isActive?: boolean
}

// Prisma's connectOrCreate shape — finds a category by slug or creates it.
type CategoryWriteData = {
  connectOrCreate: {
    where: { slug: string }
    create: { name: string; slug: string }
  }
}

type ProductData = {
  name: string
  price: number
  sku?: string | null
  barcode?: string | null
  category?: CategoryWriteData | null
  description?: string | null
  imageUrl?: string | null
  stock?: number
  unit?: string
  costPrice?: number | null
  isActive?: boolean
}

// All queries include category so the response always has category details.
type ProductInclude = { category: true }

// Where clause shape supported by listProducts.
// The fields are optional and combined with AND in Prisma when present.
type ProductWhereInput = {
  isActive?: boolean
  categoryId?: number
  // OR is used for the search term — matches any of name/sku/barcode (case-insensitive).
  OR?: Array<
    | { name: { contains: string; mode: 'insensitive' } }
    | { sku: { contains: string; mode: 'insensitive' } }
    | { barcode: { contains: string; mode: 'insensitive' } }
  >
}

type ProductFindManyArgs = {
  where?: ProductWhereInput
  orderBy: { id: 'asc' }
  include: ProductInclude
}

type ProductFindUniqueArgs = {
  where: { id: number }
  include: ProductInclude
}

// Create: category uses connectOrCreate (no disconnect option needed).
type ProductCreateData = Omit<ProductData, 'category'> & {
  category?: CategoryWriteData
}

// Update: category can be disconnected (set to null) by passing { disconnect: true }.
type ProductUpdateData = Omit<ProductData, 'category'> & {
  category?: CategoryWriteData | { disconnect: true }
}

// Minimal prisma interface — only the methods this service needs.
export type ProductPrisma = {
  product: {
    findMany: (args: ProductFindManyArgs) => Promise<ProductRecord[]>
    findUnique: (args: ProductFindUniqueArgs) => Promise<ProductRecord | null>
    create: (args: { data: ProductCreateData; include: ProductInclude }) => Promise<ProductRecord>
    update: (args: {
      where: { id: number }
      data: ProductUpdateData
      include: ProductInclude
    }) => Promise<ProductRecord | null>
    delete: (args: { where: { id: number } }) => Promise<ProductRecord | null>
  }
}

// Result type — avoids throwing for expected failures (not found, bad input).
type ProductServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: 400 | 404; error: string }

const productInclude = { category: true } as const

// Parses and validates a product ID from a URL param (always a string).
// Returns null for anything that isn't a positive integer.
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

// Filters accepted by listProducts. All optional — caller passes an empty object for "no filters".
export type ProductListFilters = {
  isActive?: boolean    // true → active only, false → inactive only, undefined → all
  categoryId?: number   // exact match by category ID
  search?: string       // case-insensitive substring match across name, sku, and barcode
}

// Parses query params from the request into a ProductListFilters object.
// Accepts strings (since req.query is always strings) and converts to typed values.
// Returns { error } for malformed values; otherwise { value } with the parsed filters.
export function parseProductListFilters(query: Record<string, unknown>): { value: ProductListFilters } | { error: string } {
  const filters: ProductListFilters = {}

  if (query.isActive !== undefined) {
    if (query.isActive === 'true') {
      filters.isActive = true
    } else if (query.isActive === 'false') {
      filters.isActive = false
    } else {
      return { error: 'isActive must be true or false' }
    }
  }

  if (query.categoryId !== undefined) {
    if (typeof query.categoryId !== 'string') {
      return { error: 'categoryId must be a positive integer' }
    }

    const categoryId = Number(query.categoryId)

    if (!Number.isInteger(categoryId) || categoryId <= 0) {
      return { error: 'categoryId must be a positive integer' }
    }

    filters.categoryId = categoryId
  }

  if (query.search !== undefined) {
    if (typeof query.search !== 'string') {
      return { error: 'search must be a string' }
    }

    const trimmed = query.search.trim()

    // Empty search string means "no search filter applied".
    if (trimmed) {
      filters.search = trimmed
    }
  }

  return { value: filters }
}

// Builds the Prisma where clause from the parsed filters.
// Only includes fields that were actually provided so unfiltered queries stay fast.
function buildProductWhere(filters: ProductListFilters): ProductWhereInput | undefined {
  const where: ProductWhereInput = {}

  if (filters.isActive !== undefined) {
    where.isActive = filters.isActive
  }

  if (filters.categoryId !== undefined) {
    where.categoryId = filters.categoryId
  }

  if (filters.search) {
    // Match the search term against name, sku, or barcode — useful for both
    // typed search and barcode scanner input from the POS frontend.
    where.OR = [
      { name: { contains: filters.search, mode: 'insensitive' } },
      { sku: { contains: filters.search, mode: 'insensitive' } },
      { barcode: { contains: filters.search, mode: 'insensitive' } },
    ]
  }

  return Object.keys(where).length === 0 ? undefined : where
}

// Handles optional string fields: undefined means "don't change", null means "clear the field".
// Returns { value } if present, {} if missing, or { error } if wrong type.
function parseOptionalString(
  body: Record<string, unknown>,
  fieldName: 'sku' | 'barcode' | 'description' | 'imageUrl',
): { value?: string | null } | { error: string } {
  const value = body[fieldName]

  if (value === undefined) {
    return {}
  }

  if (value === null) {
    return { value: null }
  }

  if (typeof value !== 'string') {
    return { error: `${fieldName} must be a string` }
  }

  const normalizedValue = value.trim()
  return { value: normalizedValue || null }
}

// Converts a category name to a URL-safe slug: "Fresh Produce" → "fresh-produce".
function createSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

// Converts a slug back to a display name: "fresh-produce" → "Fresh Produce".
function createCategoryName(slug: string) {
  return slug
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

// Parses the category field from the request body.
// Accepts a string (category name), null (remove category), or undefined (leave unchanged).
// Returns a Prisma connectOrCreate payload so the category is created if it doesn't exist.
function parseCategory(body: Record<string, unknown>): { value?: CategoryWriteData | null } | { error: string } {
  const value = body.category

  if (value === undefined) {
    return {}
  }

  if (value === null) {
    return { value: null }
  }

  if (typeof value !== 'string') {
    return { error: 'category must be a string' }
  }

  const slug = createSlug(value)

  // Empty string after slugifying means the name had no valid characters.
  if (!slug) {
    return { value: null }
  }

  return {
    value: {
      connectOrCreate: {
        where: { slug },
        create: {
          name: createCategoryName(slug),
          slug,
        },
      },
    },
  }
}

// Full request body validation for create and update.
// Required: name (string), price (non-negative number).
// Optional: sku, barcode, description, imageUrl, category, stock, unit, costPrice, isActive.
function parseProductBody(body: unknown): ProductServiceResult<ProductData> {
  if (!body || typeof body !== 'object') {
    return { ok: false, status: 400, error: 'invalid request body' }
  }

  const productBody = body as Record<string, unknown>
  const { name, price } = productBody
  const normalizedName = typeof name === 'string' ? name.trim() : ''

  if (!normalizedName) {
    return { ok: false, status: 400, error: 'name is required' }
  }

  if (typeof price !== 'number' || Number.isNaN(price) || price < 0) {
    return { ok: false, status: 400, error: 'price must be a non-negative number' }
  }

  const data: ProductData = {
    name: normalizedName,
    price,
  }

  for (const fieldName of ['sku', 'barcode', 'description', 'imageUrl'] as const) {
    const parsedString = parseOptionalString(productBody, fieldName)

    if ('error' in parsedString) {
      return { ok: false, status: 400, error: parsedString.error }
    }

    if ('value' in parsedString) {
      data[fieldName] = parsedString.value
    }
  }

  const parsedCategory = parseCategory(productBody)

  if ('error' in parsedCategory) {
    return { ok: false, status: 400, error: parsedCategory.error }
  }

  if ('value' in parsedCategory) {
    data.category = parsedCategory.value
  }

  if (productBody.stock !== undefined) {
    if (
      typeof productBody.stock !== 'number' ||
      !Number.isInteger(productBody.stock) ||
      productBody.stock < 0
    ) {
      return { ok: false, status: 400, error: 'stock must be a non-negative integer' }
    }

    data.stock = productBody.stock
  }

  if (productBody.unit !== undefined) {
    if (typeof productBody.unit !== 'string' || !productBody.unit.trim()) {
      return { ok: false, status: 400, error: 'unit must be a non-empty string' }
    }

    data.unit = productBody.unit.trim()
  }

  if (productBody.costPrice !== undefined) {
    if (productBody.costPrice === null) {
      data.costPrice = null
    } else if (
      typeof productBody.costPrice !== 'number' ||
      Number.isNaN(productBody.costPrice) ||
      productBody.costPrice < 0
    ) {
      return { ok: false, status: 400, error: 'costPrice must be a non-negative number' }
    } else {
      data.costPrice = productBody.costPrice
    }
  }

  if (productBody.isActive !== undefined) {
    if (typeof productBody.isActive !== 'boolean') {
      return { ok: false, status: 400, error: 'isActive must be a boolean' }
    }

    data.isActive = productBody.isActive
  }

  return {
    ok: true,
    data,
  }
}

// For create: category null means omit the field entirely (no relation to set).
function toProductCreateData(data: ProductData): ProductCreateData {
  const { category, ...productData } = data

  if (!category) {
    return productData
  }

  return { ...productData, category }
}

// For update: category undefined means don't touch the relation.
// category null means disconnect (remove) the existing category.
// category object means connect or create.
function toProductUpdateData(data: ProductData): ProductUpdateData {
  const { category, ...productData } = data

  if (category === undefined) {
    return productData
  }

  if (category === null) {
    return { ...productData, category: { disconnect: true } }
  }

  return { ...productData, category }
}

export function createProductsService(prisma: ProductPrisma) {
  return {
    // Returns all products by default. When filters are passed, the result is narrowed:
    //   - isActive: only active or only inactive products
    //   - categoryId: products in that category only
    //   - search: products whose name, sku, or barcode contains the term (case-insensitive)
    async listProducts(filters: ProductListFilters = {}) {
      const where = buildProductWhere(filters)
      return prisma.product.findMany({
        ...(where ? { where } : {}),
        orderBy: { id: 'asc' },
        include: productInclude,
      })
    },

    async getProduct(id: number): Promise<ProductServiceResult<ProductRecord>> {
      const product = await prisma.product.findUnique({
        where: { id },
        include: productInclude,
      })

      if (!product) {
        return { ok: false, status: 404, error: 'product not found' }
      }

      return { ok: true, data: product }
    },

    async createProduct(body: unknown): Promise<ProductServiceResult<ProductRecord>> {
      const parsedBody = parseProductBody(body)

      if (!parsedBody.ok) {
        return parsedBody
      }

      const product = await prisma.product.create({
        data: toProductCreateData(parsedBody.data),
        include: productInclude,
      })

      return { ok: true, data: product }
    },

    async updateProduct(id: number, body: unknown): Promise<ProductServiceResult<ProductRecord>> {
      const parsedBody = parseProductBody(body)

      if (!parsedBody.ok) {
        return parsedBody
      }

      // Check existence first to return 404 instead of letting Prisma throw P2025.
      const existingProduct = await prisma.product.findUnique({
        where: { id },
        include: productInclude,
      })

      if (!existingProduct) {
        return { ok: false, status: 404, error: 'product not found' }
      }

      const updatedProduct = await prisma.product.update({
        where: { id },
        data: toProductUpdateData(parsedBody.data),
        include: productInclude,
      })

      if (!updatedProduct) {
        return { ok: false, status: 404, error: 'product not found' }
      }

      return { ok: true, data: updatedProduct }
    },

    async deleteProduct(id: number): Promise<ProductServiceResult<{ message: string }>> {
      const existingProduct = await prisma.product.findUnique({
        where: { id },
        include: productInclude,
      })

      if (!existingProduct) {
        return { ok: false, status: 404, error: 'product not found' }
      }

      await prisma.product.delete({ where: { id } })
      return { ok: true, data: { message: 'product deleted' } }
    },
  }
}
