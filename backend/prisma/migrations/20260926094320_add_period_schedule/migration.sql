-- CreateEnum
CREATE TYPE "PeriodFrequency" AS ENUM ('WEEKLY', 'BIWEEKLY', 'TWICE_MONTHLY', 'MONTHLY', 'CUSTOM');

-- CreateTable
CREATE TABLE "FinancialPeriodSchedule" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "moneySourceId" TEXT,
    "frequency" "PeriodFrequency" NOT NULL,
    "startDate" DATE NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinancialPeriodSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FinancialPeriodSchedule_userId_idx" ON "FinancialPeriodSchedule"("userId");

-- CreateIndex
CREATE INDEX "FinancialPeriodSchedule_moneySourceId_idx" ON "FinancialPeriodSchedule"("moneySourceId");

-- AddForeignKey
ALTER TABLE "FinancialPeriodSchedule" ADD CONSTRAINT "FinancialPeriodSchedule_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialPeriodSchedule" ADD CONSTRAINT "FinancialPeriodSchedule_moneySourceId_fkey" FOREIGN KEY ("moneySourceId") REFERENCES "MoneySource"("id") ON DELETE SET NULL ON UPDATE CASCADE;
