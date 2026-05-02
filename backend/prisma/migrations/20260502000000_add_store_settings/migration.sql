CREATE TABLE "store_settings" (
    "id" INTEGER NOT NULL,
    "storeName" TEXT NOT NULL DEFAULT 'POS Swalayan',
    "storeAddress" TEXT,
    "storePhone" TEXT,
    "receiptFooter" TEXT DEFAULT 'Terima kasih sudah berbelanja.',
    "taxPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'IDR',
    "lowStockThreshold" INTEGER NOT NULL DEFAULT 5,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "store_settings_pkey" PRIMARY KEY ("id")
);
