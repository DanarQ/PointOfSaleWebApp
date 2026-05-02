// Settings service - manages the singleton store/receipt configuration row.
type StoreSettingRecord = {
  id: number
  storeName: string
  storeAddress: string | null
  storePhone: string | null
  receiptFooter: string | null
  taxPercent: number
  currency: string
  lowStockThreshold: number
  createdAt?: Date
  updatedAt?: Date
}

type PublicStoreSetting = {
  id: number
  storeName: string
  storeAddress: string | null
  storePhone: string | null
  receiptFooter: string | null
  taxPercent: number
  currency: string
  lowStockThreshold: number
}

type StoreSettingData = {
  id: number
  storeName: string
  storeAddress: string | null
  storePhone: string | null
  receiptFooter: string | null
  taxPercent: number
  currency: string
  lowStockThreshold: number
}

export type SettingsPrisma = {
  storeSetting: {
    findUnique: (args: { where: { id: number } }) => Promise<StoreSettingRecord | null>
    upsert: (args: {
      where: { id: number }
      create: StoreSettingData
      update: Omit<StoreSettingData, 'id'>
    }) => Promise<StoreSettingRecord>
  }
}

type SettingsServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: 400; error: string }

const SETTINGS_ID = 1

const defaultSettings: PublicStoreSetting = {
  id: SETTINGS_ID,
  storeName: 'POS Swalayan',
  storeAddress: null,
  storePhone: null,
  receiptFooter: 'Terima kasih sudah berbelanja.',
  taxPercent: 0,
  currency: 'IDR',
  lowStockThreshold: 5,
}

function sanitizeSetting(setting: StoreSettingRecord): PublicStoreSetting {
  return {
    id: setting.id,
    storeName: setting.storeName,
    storeAddress: setting.storeAddress,
    storePhone: setting.storePhone,
    receiptFooter: setting.receiptFooter,
    taxPercent: setting.taxPercent,
    currency: setting.currency,
    lowStockThreshold: setting.lowStockThreshold,
  }
}

function trimOptionalText(value: unknown): string | null {
  if (value === undefined || value === null) {
    return null
  }

  if (typeof value !== 'string') {
    return null
  }

  return value.trim() || null
}

function parseNumber(value: unknown, fieldName: string): SettingsServiceResult<number> {
  const numericValue = typeof value === 'number' ? value : Number(value)

  if (!Number.isFinite(numericValue)) {
    return { ok: false, status: 400, error: `${fieldName} must be a number` }
  }

  return { ok: true, data: numericValue }
}

function parseSettingsBody(body: unknown): SettingsServiceResult<StoreSettingData> {
  if (!body || typeof body !== 'object') {
    return { ok: false, status: 400, error: 'invalid request body' }
  }

  const requestBody = body as Record<string, unknown>
  const storeName = typeof requestBody.storeName === 'string' ? requestBody.storeName.trim() : ''

  if (!storeName) {
    return { ok: false, status: 400, error: 'storeName is required' }
  }

  const taxPercent = parseNumber(requestBody.taxPercent ?? defaultSettings.taxPercent, 'taxPercent')

  if (!taxPercent.ok) {
    return taxPercent
  }

  if (taxPercent.data < 0 || taxPercent.data > 100) {
    return { ok: false, status: 400, error: 'taxPercent must be between 0 and 100' }
  }

  const lowStockThreshold = parseNumber(
    requestBody.lowStockThreshold ?? defaultSettings.lowStockThreshold,
    'lowStockThreshold',
  )

  if (!lowStockThreshold.ok) {
    return lowStockThreshold
  }

  if (!Number.isInteger(lowStockThreshold.data) || lowStockThreshold.data < 0) {
    return { ok: false, status: 400, error: 'lowStockThreshold must be a non-negative integer' }
  }

  const currency = typeof requestBody.currency === 'string'
    ? requestBody.currency.trim().toUpperCase()
    : defaultSettings.currency

  if (!/^[A-Z]{3}$/.test(currency)) {
    return { ok: false, status: 400, error: 'currency must be a 3-letter code' }
  }

  return {
    ok: true,
    data: {
      id: SETTINGS_ID,
      storeName,
      storeAddress: trimOptionalText(requestBody.storeAddress),
      storePhone: trimOptionalText(requestBody.storePhone),
      receiptFooter: trimOptionalText(requestBody.receiptFooter),
      taxPercent: taxPercent.data,
      currency,
      lowStockThreshold: lowStockThreshold.data,
    },
  }
}

export function createSettingsService(prisma: SettingsPrisma) {
  return {
    async getSettings() {
      const setting = await prisma.storeSetting.findUnique({ where: { id: SETTINGS_ID } })
      return setting ? sanitizeSetting(setting) : defaultSettings
    },

    async updateSettings(body: unknown): Promise<SettingsServiceResult<PublicStoreSetting>> {
      const parsedBody = parseSettingsBody(body)

      if (!parsedBody.ok) {
        return parsedBody
      }

      const { id, ...updateData } = parsedBody.data
      const setting = await prisma.storeSetting.upsert({
        where: { id },
        create: parsedBody.data,
        update: updateData,
      })

      return { ok: true, data: sanitizeSetting(setting) }
    },
  }
}
