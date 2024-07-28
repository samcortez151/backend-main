-- AlterTable
ALTER TABLE "saleInvoiceProduct" ADD COLUMN     "payout" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "payoutAmount" INTEGER NOT NULL DEFAULT 0;
