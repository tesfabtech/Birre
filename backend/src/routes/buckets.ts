import { Router } from 'express';
import { BucketType, Prisma } from '../generated/prisma/client.js';
import prisma from '../lib/prisma.js';
import { requireAuth } from '../middleware/require-auth.js';

const router = Router();

async function findLocalUser(firebaseUid: string) {
  return prisma.user.findUnique({
    where: { firebaseUid },
    select: { id: true },
  });
}

function getCurrentBalance(
  allocations: { amount: Prisma.Decimal }[],
  expenses: { amount: Prisma.Decimal }[],
  transfersOut: { amount: Prisma.Decimal }[],
  transfersIn: { amount: Prisma.Decimal }[],
) {
  const allocated = allocations.reduce(
    (total, item) => total.plus(item.amount),
    new Prisma.Decimal(0),
  );

  const spent = expenses.reduce(
    (total, item) => total.plus(item.amount),
    new Prisma.Decimal(0),
  );

  const sent = transfersOut.reduce(
    (total, item) => total.plus(item.amount),
    new Prisma.Decimal(0),
  );

  const received = transfersIn.reduce(
    (total, item) => total.plus(item.amount),
    new Prisma.Decimal(0),
  );

  return {
    allocated,
    balance: allocated.minus(spent).minus(sent).plus(received),
  };
}

async function getBucketWithBalance(
  tx: Prisma.TransactionClient,
  userId: string,
  bucketId: string,
) {
  const bucket = await tx.bucket.findFirst({
    where: { id: bucketId, userId },
    include: {
      allocations: { select: { amount: true } },
      expensesFrom: { select: { amount: true } },
      transfersFrom: { select: { amount: true } },
      transfersTo: { select: { amount: true } },
    },
  });

  if (!bucket) {
    return null;
  }

  const { allocated, balance } = getCurrentBalance(
    bucket.allocations,
    bucket.expensesFrom,
    bucket.transfersFrom,
    bucket.transfersTo,
  );

  return { bucket, allocated, balance };
}

/**
 * Custom bucket creation is not supported.
 */
router.post('/', requireAuth, (_req, res) => {
  return res.status(409).json({
    code: 'CUSTOM_BUCKETS_UNSUPPORTED',
    message:
      'Custom buckets are not supported. Configure the predefined buckets in your allocation plan.',
  });
});

/**
 * Get the authenticated user's buckets and balances.
 * Existing buckets are returned so their balances and financial history
 * remain visible, including any legacy custom buckets.
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    const firebaseUid = req.firebaseUser?.uid;

    if (!firebaseUid) {
      return res.status(401).json({ message: 'Unauthorized.' });
    }

    const user = await findLocalUser(firebaseUid);

    if (!user) {
      return res.status(404).json({
        message: 'User profile not found. Fetch /users/me first.',
      });
    }

    const buckets = await prisma.bucket.findMany({
      where: { userId: user.id },
      include: {
        allocations: { select: { amount: true } },
        expensesFrom: { select: { amount: true } },
        transfersFrom: { select: { amount: true } },
        transfersTo: { select: { amount: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    const response = buckets.map(bucket => {
      const { allocated, balance } = getCurrentBalance(
        bucket.allocations,
        bucket.expensesFrom,
        bucket.transfersFrom,
        bucket.transfersTo,
      );

      return {
        id: bucket.id,
        name: bucket.name,
        type: bucket.type,
        isActive: bucket.isActive,
        createdAt: bucket.createdAt,
        allocatedBalance: allocated.toString(),
        currentBalance: balance.toString(),
        balance: balance.toString(),
      };
    });

    return res.json(response);
  } catch (error) {
    console.error('Failed to get buckets:', error);

    return res.status(500).json({
      message: 'Failed to retrieve buckets.',
    });
  }
});

/**
 * Activate or deactivate a recommended bucket.
 *
 * Request body: { "isActive": true | false }
 */
router.patch('/:bucketId/status', requireAuth, async (req, res) => {
  try {
    const firebaseUid = req.firebaseUser?.uid;

    if (!firebaseUid) {
      return res.status(401).json({ message: 'Unauthorized.' });
    }

    const user = await findLocalUser(firebaseUid);

    if (!user) {
      return res.status(404).json({ message: 'User profile not found.' });
    }

    const bucketId = req.params.bucketId;

    if (typeof bucketId !== 'string' || bucketId.length === 0) {
      return res.status(400).json({
        message: 'A valid bucket ID is required.',
      });
    }

    const { isActive } = req.body ?? {};

    if (typeof isActive !== 'boolean') {
      return res.status(400).json({
        message: 'isActive must be true or false.',
      });
    }

    const result = await prisma.$transaction(async tx => {
      const found = await tx.bucket.findFirst({
        where: { id: bucketId, userId: user.id },
      });

      if (!found) {
        throw new Error('BUCKET_NOT_FOUND');
      }

      if (found.type === BucketType.UNALLOCATED) {
        throw new Error('UNALLOCATED_PROTECTED');
      }

      if (found.type === BucketType.CUSTOM) {
        throw new Error('CUSTOM_STATUS_UNSUPPORTED');
      }

      if (found.isActive === isActive) {
        return found;
      }

      if (!isActive) {
        const balance = await getBucketWithBalance(
          tx,
          user.id,
          found.id,
        );

        if (balance && balance.balance.greaterThan(0)) {
          throw new Error('BUCKET_HAS_BALANCE');
        }

        const plans = await tx.allocationPlan.findMany({
          where: { userId: user.id },
          select: { id: true },
        });

        const planIds = plans.map(plan => plan.id);

        const ruleCount = await tx.allocationRule.count({
          where: {
            allocationPlanId: { in: planIds },
            bucketId: found.id,
          },
        });

        if (ruleCount > 0) {
          throw new Error('REMOVE_ALLOCATION_RULE_FIRST');
        }
      }

      return tx.bucket.update({
        where: { id: found.id },
        data: { isActive },
      });
    });

    return res.json({
      message: `Bucket ${isActive ? 'activated' : 'deactivated'} successfully.`,
      bucket: result,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'Failed to update bucket status.';

    if (message === 'BUCKET_NOT_FOUND') {
      return res.status(404).json({ message: 'Bucket not found.' });
    }

    if (message === 'UNALLOCATED_PROTECTED') {
      return res.status(400).json({
        message: 'The Unallocated bucket cannot be disabled.',
      });
    }

    if (message === 'CUSTOM_STATUS_UNSUPPORTED') {
      return res.status(400).json({
        message:
          'Existing custom buckets cannot be activated or deactivated through this endpoint.',
      });
    }

    if (message === 'BUCKET_HAS_BALANCE') {
      return res.status(409).json({
        message:
          'Transfer the remaining balance before disabling this bucket.',
      });
    }

    if (message === 'REMOVE_ALLOCATION_RULE_FIRST') {
      return res.status(409).json({
        message:
          'Remove this bucket from every allocation plan before disabling it.',
      });
    }

    console.error('Update bucket status error:', error);

    return res.status(500).json({
      message: 'Failed to update bucket status.',
    });
  }
});

/**
 * Bucket deletion is not supported.
 *
 * This endpoint intentionally performs no database operations.
 * Existing buckets, balances, financial history, and linked goals
 * are preserved.
 */
router.delete('/:bucketId', requireAuth, (_req, res) => {
  return res.status(409).json({
    code: 'BUCKET_DELETION_UNSUPPORTED',
    message:
      'Buckets cannot be deleted. Existing bucket balances and financial history are preserved.',
  });
});

export default router;