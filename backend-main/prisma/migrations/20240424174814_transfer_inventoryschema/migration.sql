-- CreateTable
CREATE TABLE "transferInventory" (
    "id" SERIAL NOT NULL,
    "fromCompanyId" INTEGER NOT NULL,
    "toCompanyId" INTEGER NOT NULL,
    "productQuantity" INTEGER NOT NULL,
    "doneBy" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "productId" INTEGER,

    CONSTRAINT "transferInventory_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "transferInventory" ADD CONSTRAINT "transferInventory_fromCompanyId_fkey" FOREIGN KEY ("fromCompanyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transferInventory" ADD CONSTRAINT "transferInventory_toCompanyId_fkey" FOREIGN KEY ("toCompanyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transferInventory" ADD CONSTRAINT "transferInventory_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transferInventory" ADD CONSTRAINT "transferInventory_doneBy_fkey" FOREIGN KEY ("doneBy") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
