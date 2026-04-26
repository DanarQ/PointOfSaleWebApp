-- CreateTable
CREATE TABLE "Category" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Category_slug_key" ON "Category"("slug");

-- AlterTable
ALTER TABLE "Product" ADD COLUMN "categoryId" INTEGER;

-- Migrate existing free-text product categories into normalized categories.
WITH normalized_categories AS (
    SELECT DISTINCT
        initcap(regexp_replace(trim("category"), '\s+', ' ', 'g')) AS "name",
        btrim(regexp_replace(lower(trim("category")), '[^a-z0-9]+', '-', 'g'), '-') AS "slug"
    FROM "Product"
    WHERE "category" IS NOT NULL
      AND trim("category") <> ''
)
INSERT INTO "Category" ("name", "slug")
SELECT "name", "slug"
FROM normalized_categories
WHERE "slug" <> ''
ON CONFLICT ("slug") DO NOTHING;

UPDATE "Product"
SET "categoryId" = "Category"."id"
FROM "Category"
WHERE "Product"."category" IS NOT NULL
  AND btrim(regexp_replace(lower(trim("Product"."category")), '[^a-z0-9]+', '-', 'g'), '-') = "Category"."slug";

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- DropColumn
ALTER TABLE "Product" DROP COLUMN "category";
