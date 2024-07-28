-- DropIndex
DROP INDEX "customer_email_key";

-- AlterTable
ALTER TABLE "customer" ADD COLUMN     "companyName" TEXT;
