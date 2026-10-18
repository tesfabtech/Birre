import { BucketType, Prisma } from '../generated/prisma/client.js';
import prisma from '../lib/prisma.js';

const DEFAULT_PLAN_NAME = 'Default Plan';

const DEFAULT_ALLOCATIONS: Partial<Record<BucketType, number>> = {
  [BucketType.ESSENTIAL]: 50,
  [BucketType.FLEXIBLE]: 25,
  [BucketType.INVESTMENT]: 10,
  [BucketType.EMERGENCY]: 10,
  [BucketType.BUFFER]: 5,
};

const ALLOCATION_BUCKET_TYPES: BucketType[] = [
  BucketType.ESSENTIAL,
  BucketType.FLEXIBLE,
  BucketType.INVESTMENT,
  BucketType.EMERGENCY,
  BucketType.BUFFER,
];

export interface CurrentAllocationPlanResponse {
  id: string;
  name: string;
  buckets: {
    id: string;
    name: string;
    type: BucketType;
    isActive: boolean;
    createdAt: string;
    percentage: string | null;
  }[];
}

async function findOrCreateCurrentPlan(
  tx: Prisma.TransactionClient,
  userId: string,
) {
  let plan = await tx.allocationPlan.findFirst({
    where: { userId },
    orderBy: { createdAt: 'asc' },
  });

  if (!plan) {
    plan = await tx.allocationPlan.create({
      data: {
        userId,
        name: DEFAULT_PLAN_NAME,
      },
    });
  }

  return plan;
}

async function initializeDefaultRulesIfMissing(
  tx: Prisma.TransactionClient,
  planId: string,
  userId: string,
) {
  const existingRules = await tx.allocationRule.count({
    where: { allocationPlanId: planId },
  });

  // Preserve any existing allocation plan configuration.
  if (existingRules > 0) {
    return;
  }

  const buckets = await tx.bucket.findMany({
    where: {
      userId,
      type: { in: ALLOCATION_BUCKET_TYPES },
    },
    orderBy: { createdAt: 'asc' },
  });

  const bucketByType = new Map(
    buckets.map(bucket => [bucket.type, bucket]),
  );

  const hasAllRecommendedBuckets = ALLOCATION_BUCKET_TYPES.every(type =>
    bucketByType.has(type),
  );

  if (!hasAllRecommendedBuckets) {
    return;
  }

  const defaultRules = ALLOCATION_BUCKET_TYPES.flatMap(type => {
    const bucket = bucketByType.get(type);
    const percentage = DEFAULT_ALLOCATIONS[type];

    if (!bucket || percentage === undefined) {
      return [];
    }

    return [
      {
        allocationPlanId: planId,
        bucketId: bucket.id,
        percentage: new Prisma.Decimal(percentage),
      },
    ];
  });

  await tx.allocationRule.createMany({
    data: defaultRules,
    skipDuplicates: true,
  });
}

export async function getCurrentAllocationPlan(
  userId: string,
): Promise<CurrentAllocationPlanResponse> {
  return prisma.$transaction(async tx => {
    const plan = await findOrCreateCurrentPlan(tx, userId);

    await initializeDefaultRulesIfMissing(tx, plan.id, userId);

    const [buckets, rules] = await Promise.all([
      tx.bucket.findMany({
        where: {
          userId,
          type: {
            in: [...ALLOCATION_BUCKET_TYPES, BucketType.UNALLOCATED],
          },
        },
        orderBy: { createdAt: 'asc' },
      }),
      tx.allocationRule.findMany({
        where: { allocationPlanId: plan.id },
      }),
    ]);

    const ruleMap = new Map(
      rules.map(rule => [
        rule.bucketId,
        rule.percentage.toString(),
      ]),
    );

    return {
      id: plan.id,
      name: plan.name,
      buckets: buckets.map(bucket => ({
        id: bucket.id,
        name: bucket.name,
        type: bucket.type,
        isActive: bucket.isActive,
        createdAt: bucket.createdAt.toISOString(),
        percentage:
          bucket.type === BucketType.UNALLOCATED
            ? null
            : ruleMap.get(bucket.id) ?? '0',
      })),
    };
  });
}