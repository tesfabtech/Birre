-- CreateEnum
CREATE TYPE "MoneySourceType" AS ENUM ('REGULAR', 'OCCASIONAL');

-- CreateEnum
CREATE TYPE "BucketType" AS ENUM ('ESSENTIAL', 'EMERGENCY', 'INVESTMENT', 'FLEXIBLE', 'BUFFER', 'UNALLOCATED', 'CUSTOM');

-- CreateEnum
CREATE TYPE "IncomeType" AS ENUM ('REGULAR', 'OCCASIONAL');

-- CreateEnum
CREATE TYPE "PeriodStatus" AS ENUM ('UPCOMING', 'ACTIVE', 'COMPLETED');

-- CreateEnum
CREATE TYPE "ExpenseType" AS ENUM ('NEED', 'WANT');

-- CreateTable
CREATE TABLE "MoneySource" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "MoneySourceType" NOT NULL,
    "defaultAmount" DECIMAL(14,2),
    "frequency" TEXT,
    "nextExpectedDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MoneySource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bucket" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "BucketType" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Bucket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AllocationPlan" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AllocationPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AllocationRule" (
    "id" TEXT NOT NULL,
    "allocationPlanId" TEXT NOT NULL,
    "bucketId" TEXT NOT NULL,
    "percentage" DECIMAL(5,2) NOT NULL,

    CONSTRAINT "AllocationRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinancialPeriod" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "moneySourceId" TEXT NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "status" "PeriodStatus" NOT NULL DEFAULT 'UPCOMING',

    CONSTRAINT "FinancialPeriod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IncomeTransaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "moneySourceId" TEXT NOT NULL,
    "periodId" TEXT,
    "allocationPlanId" TEXT,
    "amount" DECIMAL(14,2) NOT NULL,
    "type" "IncomeType" NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IncomeTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Allocation" (
    "id" TEXT NOT NULL,
    "incomeTransactionId" TEXT NOT NULL,
    "bucketId" TEXT NOT NULL,
    "percentage" DECIMAL(5,2),
    "amount" DECIMAL(14,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Allocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Expense" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bucketId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "periodId" TEXT,
    "amount" DECIMAL(14,2) NOT NULL,
    "type" "ExpenseType" NOT NULL,
    "spentAt" TIMESTAMP(3) NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transfer" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fromBucketId" TEXT NOT NULL,
    "toBucketId" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "transferredAt" TIMESTAMP(3) NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Transfer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Goal" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bucketId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "targetAmount" DECIMAL(14,2) NOT NULL,
    "targetDate" DATE,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Goal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MoneySource_userId_idx" ON "MoneySource"("userId");

-- CreateIndex
CREATE INDEX "Bucket_userId_idx" ON "Bucket"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Bucket_userId_name_key" ON "Bucket"("userId", "name");

-- CreateIndex
CREATE INDEX "AllocationPlan_userId_idx" ON "AllocationPlan"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "AllocationRule_allocationPlanId_bucketId_key" ON "AllocationRule"("allocationPlanId", "bucketId");

-- CreateIndex
CREATE INDEX "FinancialPeriod_userId_idx" ON "FinancialPeriod"("userId");

-- CreateIndex
CREATE INDEX "FinancialPeriod_moneySourceId_idx" ON "FinancialPeriod"("moneySourceId");

-- CreateIndex
CREATE UNIQUE INDEX "FinancialPeriod_userId_startDate_endDate_key" ON "FinancialPeriod"("userId", "startDate", "endDate");

-- CreateIndex
CREATE INDEX "IncomeTransaction_userId_idx" ON "IncomeTransaction"("userId");

-- CreateIndex
CREATE INDEX "IncomeTransaction_moneySourceId_idx" ON "IncomeTransaction"("moneySourceId");

-- CreateIndex
CREATE INDEX "IncomeTransaction_periodId_idx" ON "IncomeTransaction"("periodId");

-- CreateIndex
CREATE INDEX "Allocation_incomeTransactionId_idx" ON "Allocation"("incomeTransactionId");

-- CreateIndex
CREATE INDEX "Allocation_bucketId_idx" ON "Allocation"("bucketId");

-- CreateIndex
CREATE INDEX "Category_userId_idx" ON "Category"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Category_userId_name_key" ON "Category"("userId", "name");

-- CreateIndex
CREATE INDEX "Expense_userId_idx" ON "Expense"("userId");

-- CreateIndex
CREATE INDEX "Expense_bucketId_idx" ON "Expense"("bucketId");

-- CreateIndex
CREATE INDEX "Expense_categoryId_idx" ON "Expense"("categoryId");

-- CreateIndex
CREATE INDEX "Expense_periodId_idx" ON "Expense"("periodId");

-- CreateIndex
CREATE INDEX "Expense_spentAt_idx" ON "Expense"("spentAt");

-- CreateIndex
CREATE INDEX "Transfer_userId_idx" ON "Transfer"("userId");

-- CreateIndex
CREATE INDEX "Transfer_fromBucketId_idx" ON "Transfer"("fromBucketId");

-- CreateIndex
CREATE INDEX "Transfer_toBucketId_idx" ON "Transfer"("toBucketId");

-- CreateIndex
CREATE INDEX "Transfer_transferredAt_idx" ON "Transfer"("transferredAt");

-- CreateIndex
CREATE INDEX "Goal_userId_idx" ON "Goal"("userId");

-- CreateIndex
CREATE INDEX "Goal_bucketId_idx" ON "Goal"("bucketId");

-- AddForeignKey
ALTER TABLE "MoneySource" ADD CONSTRAINT "MoneySource_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bucket" ADD CONSTRAINT "Bucket_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AllocationPlan" ADD CONSTRAINT "AllocationPlan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AllocationRule" ADD CONSTRAINT "AllocationRule_allocationPlanId_fkey" FOREIGN KEY ("allocationPlanId") REFERENCES "AllocationPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AllocationRule" ADD CONSTRAINT "AllocationRule_bucketId_fkey" FOREIGN KEY ("bucketId") REFERENCES "Bucket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialPeriod" ADD CONSTRAINT "FinancialPeriod_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialPeriod" ADD CONSTRAINT "FinancialPeriod_moneySourceId_fkey" FOREIGN KEY ("moneySourceId") REFERENCES "MoneySource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncomeTransaction" ADD CONSTRAINT "IncomeTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncomeTransaction" ADD CONSTRAINT "IncomeTransaction_moneySourceId_fkey" FOREIGN KEY ("moneySourceId") REFERENCES "MoneySource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncomeTransaction" ADD CONSTRAINT "IncomeTransaction_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "FinancialPeriod"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncomeTransaction" ADD CONSTRAINT "IncomeTransaction_allocationPlanId_fkey" FOREIGN KEY ("allocationPlanId") REFERENCES "AllocationPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Allocation" ADD CONSTRAINT "Allocation_incomeTransactionId_fkey" FOREIGN KEY ("incomeTransactionId") REFERENCES "IncomeTransaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Allocation" ADD CONSTRAINT "Allocation_bucketId_fkey" FOREIGN KEY ("bucketId") REFERENCES "Bucket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_bucketId_fkey" FOREIGN KEY ("bucketId") REFERENCES "Bucket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "FinancialPeriod"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transfer" ADD CONSTRAINT "Transfer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transfer" ADD CONSTRAINT "Transfer_fromBucketId_fkey" FOREIGN KEY ("fromBucketId") REFERENCES "Bucket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transfer" ADD CONSTRAINT "Transfer_toBucketId_fkey" FOREIGN KEY ("toBucketId") REFERENCES "Bucket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Goal" ADD CONSTRAINT "Goal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Goal" ADD CONSTRAINT "Goal_bucketId_fkey" FOREIGN KEY ("bucketId") REFERENCES "Bucket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
