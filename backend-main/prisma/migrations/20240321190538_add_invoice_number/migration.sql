-- DropIndex
DROP INDEX "product_sku_key";

-- AlterTable
ALTER TABLE "purchaseInvoice" ADD COLUMN     "invoiceNumber" TEXT;
