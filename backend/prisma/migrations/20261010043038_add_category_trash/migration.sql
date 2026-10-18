-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Category_isActive_deletedAt_idx" ON "Category"("isActive", "deletedAt");
