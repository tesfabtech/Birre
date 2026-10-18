import { BucketType, IncomeType, Prisma } from '../generated/prisma/client.js';
import prisma from '../lib/prisma.js';

type TransactionClient = Prisma.TransactionClient;

const ALLOWED_ALLOCATION_BUCKET_TYPES: BucketType[] = [
  BucketType.ESSENTIAL,
  BucketType.FLEXIBLE,
  BucketType.INVESTMENT,
  BucketType.EMERGENCY,
  BucketType.BUFFER,
];

export class IncomeServiceError extends Error {
  constructor(
    public readonly code: string,
    message = code,
  ) {
    super(message);
    this.name = 'IncomeServiceError';
  }
}

async function getRegularAllocationRules(
  tx: TransactionClient,
  userId: string,
  planId?: string,
) {
  const plan = await tx.allocationPlan.findFirst({
    where: planId
      ? { id: planId, userId }
      : { userId },
    orderBy: { createdAt: 'asc' },
    include: {
      rules: {
        include: { bucket: true },
        orderBy: { id: 'asc' },
      },
    },
  });

  if (!plan || plan.rules.length === 0) {
    throw new IncomeServiceError(
      planId
        ? 'ALLOCATION_PLAN_NOT_FOUND'
        : 'DEFAULT_ALLOCATION_PLAN_MISSING',
    );
  }

  const totalPercentage = plan.rules.reduce(
    (total, rule) => total.plus(rule.percentage),
    new Prisma.Decimal(0),
  );

  if (!totalPercentage.equals(new Prisma.Decimal(100))) {
    throw new IncomeServiceError('ALLOCATION_PLAN_MUST_TOTAL_100');
  }

  const hasInvalidBucket = plan.rules.some(rule => {
    const bucket = rule.bucket;

    return (
      bucket.userId !== userId ||
      !bucket.isActive ||
      !ALLOWED_ALLOCATION_BUCKET_TYPES.includes(bucket.type)
    );
  });

  if (hasInvalidBucket) {
    throw new IncomeServiceError('ALLOCATION_PLAN_HAS_INVALID_BUCKET');
  }

  return plan;
}

export async function createAutomaticAllocations(
  tx: TransactionClient,
  input: {
    userId: string;
    incomeId: string;
    amount: Prisma.Decimal;
    type: IncomeType;
  },
) {
  // Occasional income always goes to Unallocated.
  if (input.type === IncomeType.OCCASIONAL) {
    const bucket = await tx.bucket.findFirst({
      where: {
        userId: input.userId,
        type: BucketType.UNALLOCATED,
        isActive: true,
      },
    });

    if (!bucket) {
      throw new IncomeServiceError('UNALLOCATED_BUCKET_MISSING');
    }

    await tx.allocation.create({
      data: {
        incomeTransactionId: input.incomeId,
        bucketId: bucket.id,
        percentage: null,
        amount: input.amount,
      },
    });

    return { allocationPlanId: null };
  }

  // Regular income uses only the user's valid predefined allocation rules.
  const plan = await getRegularAllocationRules(tx, input.userId);

  let allocatedSoFar = new Prisma.Decimal(0);

  for (let i = 0; i < plan.rules.length; i++) {
    const rule = plan.rules[i]!;

    const allocationAmount =
      i === plan.rules.length - 1
        ? input.amount.minus(allocatedSoFar).toDecimalPlaces(2)
        : input.amount
            .mul(rule.percentage)
            .div(100)
            .toDecimalPlaces(2);

    await tx.allocation.create({
      data: {
        incomeTransactionId: input.incomeId,
        bucketId: rule.bucketId,
        percentage: rule.percentage,
        amount: allocationAmount,
      },
    });

    allocatedSoFar = allocatedSoFar.plus(allocationAmount);
  }

  return { allocationPlanId: plan.id };
}

export async function manuallyAllocateIncome(
  userId: string,
  incomeId: string,
  allocationPlanId: string,
) {
  return prisma.$transaction(async tx => {
    const income = await tx.incomeTransaction.findFirst({
      where: { id: incomeId, userId },
      include: { allocations: true },
    });

    if (!income) {
      throw new IncomeServiceError('INCOME_NOT_FOUND');
    }

    if (income.allocations.length > 0) {
      throw new IncomeServiceError('INCOME_ALREADY_ALLOCATED');
    }

    if (income.type === IncomeType.OCCASIONAL) {
      throw new IncomeServiceError('OCCASIONAL_INCOME_CANNOT_USE_PLAN');
    }

    const plan = await getRegularAllocationRules(
      tx,
      userId,
      allocationPlanId,
    );

    let allocatedSoFar = new Prisma.Decimal(0);

    const allocations = [];

    for (let i = 0; i < plan.rules.length; i++) {
      const rule = plan.rules[i]!;

      const allocationAmount =
        i === plan.rules.length - 1
          ? new Prisma.Decimal(income.amount)
              .minus(allocatedSoFar)
              .toDecimalPlaces(2)
          : new Prisma.Decimal(income.amount)
              .mul(rule.percentage)
              .div(100)
              .toDecimalPlaces(2);

      const allocation = await tx.allocation.create({
        data: {
          incomeTransactionId: income.id,
          bucketId: rule.bucketId,
          percentage: rule.percentage,
          amount: allocationAmount,
        },
        include: { bucket: true },
      });

      allocations.push(allocation);
      allocatedSoFar = allocatedSoFar.plus(allocationAmount);
    }

    await tx.incomeTransaction.update({
      where: { id: income.id },
      data: { allocationPlanId: plan.id },
    });

    return {
      incomeId: income.id,
      allocationPlanId: plan.id,
      allocations,
    };
  });
}