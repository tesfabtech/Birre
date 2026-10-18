import { Router } from 'express';
import { BucketType, Prisma } from '../generated/prisma/client.js';
import prisma from '../lib/prisma.js';
import { requireAuth } from '../middleware/require-auth.js';
import {
  normalizeAllocationRules,
  validateAllocationTotal,
  toPercentage,
} from '../utils/allocation-plan-validation.js';
import { getCurrentAllocationPlan } from '../services/allocation-plan-service.js';

const router = Router();

async function findLocalUser(firebaseUid: string) {
  return prisma.user.findUnique({
    where: { firebaseUid },
    select: { id: true },
  });
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : 'Failed to save allocation plan.';
}

const RECOMMENDED_BUCKET_TYPES: BucketType[] = [
  BucketType.ESSENTIAL,
  BucketType.FLEXIBLE,
  BucketType.INVESTMENT,
  BucketType.EMERGENCY,
  BucketType.BUFFER,
];

router.use(requireAuth);

router.post('/', async (req, res) => {
  try {
    const firebaseUid = req.firebaseUser?.uid;
    if (!firebaseUid) {
      return res.status(401).json({ message: 'Unauthorized.' });
    }

    const user = await findLocalUser(firebaseUid);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const name =
      typeof req.body.name === 'string' ? req.body.name.trim() : '';

    if (name.length < 2 || name.length > 60) {
      return res.status(400).json({
        message: 'Plan name must be between 2 and 60 characters.',
      });
    }

    const plan = await prisma.allocationPlan.create({
      data: { userId: user.id, name },
    });

    return res.status(201).json(plan);
  } catch (error) {
    console.error('Create allocation plan error:', error);
    return res.status(500).json({
      message: 'Failed to create allocation plan.',
    });
  }
});

router.get('/', async (req, res) => {
  try {
    const firebaseUid = req.firebaseUser?.uid;
    if (!firebaseUid) {
      return res.status(401).json({ message: 'Unauthorized.' });
    }

    const user = await findLocalUser(firebaseUid);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const plans = await prisma.allocationPlan.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'asc' },
      include: { rules: { include: { bucket: true } } },
    });

    return res.json(plans);
  } catch (error) {
    console.error('List allocation plans error:', error);
    return res.status(500).json({
      message: 'Failed to load allocation plans.',
    });
  }
});

router.get('/current', async (req, res) => {
  try {
    const firebaseUid = req.firebaseUser?.uid;
    if (!firebaseUid) {
      return res.status(401).json({ message: 'Unauthorized.' });
    }

    const user = await findLocalUser(firebaseUid);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const plan = await getCurrentAllocationPlan(user.id);
    return res.json(plan);
  } catch (error) {
    console.error('Get current allocation plan error:', error);
    return res.status(500).json({
      message: 'Failed to load current allocation plan.',
    });
  }
});

router.put('/current', async (req, res) => {
  try {
    const firebaseUid = req.firebaseUser?.uid;
    if (!firebaseUid) {
      return res.status(401).json({ message: 'Unauthorized.' });
    }

    const user = await findLocalUser(firebaseUid);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    if (
      !Array.isArray(req.body.activeBucketIds) ||
      !req.body.activeBucketIds.every(
        (id: unknown) => typeof id === 'string' && id.trim().length > 0,
      ) ||
      new Set(req.body.activeBucketIds).size !==
        req.body.activeBucketIds.length
    ) {
      return res.status(400).json({
        message: 'Provide a valid list of active bucket IDs.',
      });
    }

    const activeBucketIds = req.body.activeBucketIds as string[];

    const normalized = normalizeAllocationRules(req.body.rules);
    if (!normalized.valid) {
      return res.status(400).json({ message: normalized.message });
    }

    const totalValidation = validateAllocationTotal(normalized.rules);

    if (!totalValidation.valid) {
      return res.status(400).json({
        message: totalValidation.message,
        totalPercentage: (
          totalValidation.totalHundredths / 100
        ).toFixed(2),
      });
    }

    const submittedRuleIds = new Set(
      normalized.rules.map(rule => rule.bucketId),
    );
    const requestedActiveIds = new Set(activeBucketIds);

    if (
      submittedRuleIds.size !== requestedActiveIds.size ||
      [...requestedActiveIds].some(id => !submittedRuleIds.has(id))
    ) {
      return res.status(400).json({
        message:
          'The active buckets and allocation rules must match exactly.',
      });
    }

    const result = await prisma.$transaction(async tx => {
      const allBuckets = await tx.bucket.findMany({
        where: { userId: user.id },
        select: {
          id: true,
          name: true,
          type: true,
          isActive: true,
        },
      });

      const bucketById = new Map(
        allBuckets.map(bucket => [bucket.id, bucket]),
      );

      // Only predefined allocation buckets can be submitted.
      for (const rule of normalized.rules) {
        const bucket = bucketById.get(rule.bucketId);

        if (!bucket) {
          throw new Error(
            'One or more selected buckets do not belong to your account.',
          );
        }

        if (!RECOMMENDED_BUCKET_TYPES.includes(bucket.type)) {
          throw new Error(
            'Only predefined allocation buckets can have allocation rules.',
          );
        }
      }

      for (const id of activeBucketIds) {
        const bucket = bucketById.get(id);

        if (!bucket) {
          throw new Error(
            'One or more selected buckets do not belong to your account.',
          );
        }

        if (!RECOMMENDED_BUCKET_TYPES.includes(bucket.type)) {
          throw new Error(
            'Only predefined allocation buckets can be activated or deactivated here.',
          );
        }
      }

      const activeRecommendedBuckets = allBuckets.filter(
        bucket =>
          bucket.isActive &&
          RECOMMENDED_BUCKET_TYPES.includes(bucket.type),
      );

      const deactivatedBuckets = activeRecommendedBuckets.filter(
        bucket => !requestedActiveIds.has(bucket.id),
      );

      for (const bucket of deactivatedBuckets) {
        const [allocations, expenses, transfersOut, transfersIn] =
          await Promise.all([
            tx.allocation.aggregate({
              where: { bucketId: bucket.id },
              _sum: { amount: true },
            }),
            tx.expense.aggregate({
              where: { bucketId: bucket.id },
              _sum: { amount: true },
            }),
            tx.transfer.aggregate({
              where: { fromBucketId: bucket.id },
              _sum: { amount: true },
            }),
            tx.transfer.aggregate({
              where: { toBucketId: bucket.id },
              _sum: { amount: true },
            }),
          ]);

        const allocated = allocations._sum.amount ?? new Prisma.Decimal(0);
        const spent = expenses._sum.amount ?? new Prisma.Decimal(0);
        const sent = transfersOut._sum.amount ?? new Prisma.Decimal(0);
        const received = transfersIn._sum.amount ?? new Prisma.Decimal(0);

        const balance = allocated
          .minus(spent)
          .minus(sent)
          .plus(received);

        if (!balance.isZero()) {
          throw new Error(
            `"${bucket.name}" must have a zero balance before it can be turned off. Transfer or otherwise resolve its remaining balance first.`,
          );
        }
      }

      let plan = await tx.allocationPlan.findFirst({
        where: { userId: user.id },
        orderBy: { createdAt: 'asc' },
      });

      if (!plan) {
        plan = await tx.allocationPlan.create({
          data: {
            userId: user.id,
            name: 'Default Plan',
          },
        });
      }

      // Update recommended bucket status and rules atomically.
      await tx.bucket.updateMany({
        where: {
          userId: user.id,
          type: { in: RECOMMENDED_BUCKET_TYPES },
          isActive: true,
          id: { notIn: activeBucketIds },
        },
        data: { isActive: false },
      });

      if (activeBucketIds.length > 0) {
        await tx.bucket.updateMany({
          where: {
            userId: user.id,
            id: { in: activeBucketIds },
            type: { in: RECOMMENDED_BUCKET_TYPES },
          },
          data: { isActive: true },
        });
      }

      await tx.allocationRule.deleteMany({
        where: { allocationPlanId: plan.id },
      });

      const rulesToCreate = normalized.rules.map(rule => ({
        allocationPlanId: plan.id,
        bucketId: rule.bucketId,
        percentage: toPercentage(rule.percentageHundredths),
      }));

      await tx.allocationRule.createMany({
        data: rulesToCreate,
      });

      return plan;
    });

    const updatedPlan = await getCurrentAllocationPlan(user.id);

    return res.json({
      message: 'Allocation plan saved successfully.',
      plan: {
        ...updatedPlan,
        id: result.id,
        name: result.name,
      },
    });
  } catch (error) {
    const message = getErrorMessage(error);

    if (
      message.toLowerCase().includes('bucket') ||
      message.toLowerCase().includes('balance') ||
      message.toLowerCase().includes('active buckets') ||
      message.toLowerCase().includes('selected buckets')
    ) {
      return res.status(400).json({ message });
    }

    console.error('Update current allocation plan error:', error);
    return res.status(500).json({
      message: 'Failed to save allocation plan.',
    });
  }
});

router.post('/:planId/rules', async (_req, res) => {
  return res.status(409).json({
    message:
      'Update allocation rules through the full allocation plan editor.',
  });
});

export default router;