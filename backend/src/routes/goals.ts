import { Router } from 'express';

import { BucketType, Prisma } from '../generated/prisma/client.js';

import prisma from '../lib/prisma.js';

import { requireAuth } from '../middleware/require-auth.js';

const router = Router();

const MAX_NAME_LENGTH = 80;

async function findLocalUser(firebaseUid: string) {
  return prisma.user.findUnique({
    where: { firebaseUid },
    select: { id: true },
  });
}

function normalizeDate(value: string): Date {
  const parts = value.split('-');

  if (parts.length !== 3) {
    return new Date(Number.NaN);
  }

  const year = Number(parts[0]);
  const month = Number(parts[1]);
  const day = Number(parts[2]);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day) ||
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return new Date(Number.NaN);
  }

  return date;
}

function parseTargetAmount(value: unknown): Prisma.Decimal | null {
  if (
    (typeof value !== 'string' && typeof value !== 'number') ||
    (typeof value === 'string' && !value.trim())
  ) {
    return null;
  }

  const raw = String(value).trim();

  // Positive amounts with at most two decimal places.
  if (!/^\d{1,12}(\.\d{1,2})?$/.test(raw)) {
    return null;
  }

  const amount = new Prisma.Decimal(raw);

  return amount.greaterThan(0) ? amount : null;
}

function parseTargetDate(value: unknown): Date | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  if (typeof value !== 'string') return undefined;

  const date = normalizeDate(value);

  return Number.isNaN(date.getTime()) ? undefined : date;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : '';
}

function isTransactionConflict(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2034'
  );
}

async function getBucketBalance(
  tx: Prisma.TransactionClient,
  userId: string,
  bucketId: string,
) {
  const [allocations, expenses, transfersIn, transfersOut] =
    await Promise.all([
      tx.allocation.aggregate({
        where: {
          bucketId,
          incomeTransaction: { userId },
        },
        _sum: { amount: true },
      }),
      tx.expense.aggregate({
        where: { bucketId, userId },
        _sum: { amount: true },
      }),
      tx.transfer.aggregate({
        where: { toBucketId: bucketId, userId },
        _sum: { amount: true },
      }),
      tx.transfer.aggregate({
        where: { fromBucketId: bucketId, userId },
        _sum: { amount: true },
      }),
    ]);

  return (allocations._sum.amount ?? new Prisma.Decimal(0))
    .minus(expenses._sum.amount ?? new Prisma.Decimal(0))
    .plus(transfersIn._sum.amount ?? new Prisma.Decimal(0))
    .minus(transfersOut._sum.amount ?? new Prisma.Decimal(0));
}

async function assertEligibleBucket(
  tx: Prisma.TransactionClient,
  userId: string,
  bucketId: string,
  goalId?: string,
) {
  const bucket = await tx.bucket.findFirst({
    where: { id: bucketId, userId },
  });

  if (!bucket) {
    throw new Error('BUCKET_NOT_FOUND');
  }

  if (!bucket.isActive) {
    throw new Error('BUCKET_INACTIVE');
  }

  if (bucket.type === BucketType.UNALLOCATED) {
    throw new Error('UNALLOCATED_BUCKET');
  }

  const existingGoal = await tx.goal.findFirst({
    where: {
      userId,
      bucketId,
      isActive: true,
      ...(goalId ? { id: { not: goalId } } : {}),
    },
    select: { id: true },
  });

  if (existingGoal) {
    throw new Error('BUCKET_ALREADY_ASSIGNED');
  }

  return bucket;
}

async function serializeGoal(
  tx: Prisma.TransactionClient,
  userId: string,
  goal: {
    id: string;
    userId: string;
    bucketId: string;
    name: string;
    targetAmount: Prisma.Decimal;
    targetDate: Date | null;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    bucket: {
      id: string;
      name: string;
      type: BucketType;
      isActive: boolean;
    };
  },
) {
  const savedAmount = await getBucketBalance(
    tx,
    userId,
    goal.bucketId,
  );

  const progress = goal.targetAmount.greaterThan(0)
    ? Math.min(
        100,
        Math.max(
          0,
          savedAmount.dividedBy(goal.targetAmount).times(100).toNumber(),
        ),
      )
    : 0;

  return {
    id: goal.id,
    name: goal.name,
    bucketId: goal.bucketId,
    bucket: goal.bucket,
    targetAmount: goal.targetAmount.toFixed(2),
    targetDate: goal.targetDate
      ? goal.targetDate.toISOString().slice(0, 10)
      : null,
    isActive: goal.isActive,
    savedAmount: savedAmount.toFixed(2),
    progress: Math.round(progress * 100) / 100,
    createdAt: goal.createdAt,
    updatedAt: goal.updatedAt,
  };
}

/**
 * List the authenticated user's goals, including current bucket balances.
 * Query parameter: ?includeInactive=true
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    const user = await findLocalUser(req.firebaseUser!.uid);

    if (!user) {
      return res.status(404).json({
        message: 'User profile not found. Fetch /users/me first.',
      });
    }

    const includeInactive = req.query.includeInactive === 'true';

    const goals = await prisma.goal.findMany({
      where: {
        userId: user.id,
        ...(includeInactive ? {} : { isActive: true }),
      },
      include: {
        bucket: {
          select: {
            id: true,
            name: true,
            type: true,
            isActive: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const response = await prisma.$transaction(tx =>
      Promise.all(
        goals.map(goal => serializeGoal(tx, user.id, goal)),
      ),
    );

    return res.json(response);
  } catch (error) {
    console.error('Failed to get goals:', error);

    return res.status(500).json({
      message: 'Failed to retrieve goals.',
    });
  }
});

/**
 * Create a goal.
 * Body: { name, targetAmount, targetDate?, bucketId }
 */
router.post('/', requireAuth, async (req, res) => {
  try {
    const user = await findLocalUser(req.firebaseUser!.uid);

    if (!user) {
      return res.status(404).json({
        message: 'User profile not found. Fetch /users/me first.',
      });
    }

    const { name, targetAmount, targetDate, bucketId } = req.body ?? {};

    if (
      typeof name !== 'string' ||
      !name.trim() ||
      name.trim().length > MAX_NAME_LENGTH
    ) {
      return res.status(400).json({
        message: `name must contain 1 to ${MAX_NAME_LENGTH} characters.`,
      });
    }

    const amount = parseTargetAmount(targetAmount);

    if (!amount) {
      return res.status(400).json({
        message:
          'targetAmount must be a positive number with at most two decimal places.',
      });
    }

    if (typeof bucketId !== 'string' || !bucketId) {
      return res.status(400).json({
        message: 'A valid bucketId is required.',
      });
    }

    const date = parseTargetDate(targetDate);

    if (date === undefined) {
      return res.status(400).json({
        message: 'targetDate must be a valid YYYY-MM-DD date or null.',
      });
    }

    const goal = await prisma.$transaction(
      async tx => {
        const bucket = await assertEligibleBucket(
          tx,
          user.id,
          bucketId,
        );

        return tx.goal.create({
          data: {
            userId: user.id,
            bucketId: bucket.id,
            name: name.trim(),
            targetAmount: amount,
            targetDate: date ?? null,
          },
          include: {
            bucket: {
              select: {
                id: true,
                name: true,
                type: true,
                isActive: true,
              },
            },
          },
        });
      },
      { isolationLevel: 'Serializable' },
    );

    const response = await prisma.$transaction(tx =>
      serializeGoal(tx, user.id, goal),
    );

    return res.status(201).json(response);
  } catch (error) {
    const message = getErrorMessage(error);

    if (message === 'BUCKET_NOT_FOUND') {
      return res.status(404).json({
        message: 'Bucket not found for this user.',
      });
    }

    if (message === 'BUCKET_INACTIVE') {
      return res.status(400).json({
        message: 'Goals can only be assigned to active buckets.',
      });
    }

    if (message === 'UNALLOCATED_BUCKET') {
      return res.status(400).json({
        message: 'The Unallocated bucket cannot be assigned to a goal.',
      });
    }

    if (message === 'BUCKET_ALREADY_ASSIGNED') {
      return res.status(409).json({
        code: 'BUCKET_ALREADY_ASSIGNED',
        message: 'This bucket is already assigned to an active goal.',
      });
    }

    if (isTransactionConflict(error)) {
      return res.status(409).json({
        message: 'A concurrent change occurred. Please try again.',
      });
    }

    console.error('Failed to create goal:', error);

    return res.status(500).json({
      message: 'Failed to create goal.',
    });
  }
});

/**
 * Update goal configuration.
 * Body may contain name, targetAmount, targetDate, and/or bucketId.
 */
router.patch('/:goalId', requireAuth, async (req, res) => {
  try {
    const user = await findLocalUser(req.firebaseUser!.uid);

    if (!user) {
      return res.status(404).json({
        message: 'User profile not found. Fetch /users/me first.',
      });
    }

    const { goalId } = req.params;

    if (typeof goalId !== 'string' || !goalId) {
      return res.status(400).json({ message: 'A valid goalId is required.' });
    }

    const body = req.body ?? {};
    const data: Prisma.GoalUpdateInput = {};

    if (Object.hasOwn(body, 'name')) {
      if (
        typeof body.name !== 'string' ||
        !body.name.trim() ||
        body.name.trim().length > MAX_NAME_LENGTH
      ) {
        return res.status(400).json({
          message: `name must contain 1 to ${MAX_NAME_LENGTH} characters.`,
        });
      }

      data.name = body.name.trim();
    }

    if (Object.hasOwn(body, 'targetAmount')) {
      const amount = parseTargetAmount(body.targetAmount);

      if (!amount) {
        return res.status(400).json({
          message:
            'targetAmount must be a positive number with at most two decimal places.',
        });
      }

      data.targetAmount = amount;
    }

    if (Object.hasOwn(body, 'targetDate')) {
      const date = parseTargetDate(body.targetDate);

      if (date === undefined) {
        return res.status(400).json({
          message: 'targetDate must be a valid YYYY-MM-DD date or null.',
        });
      }

      data.targetDate = date;
    }

    if (Object.hasOwn(body, 'bucketId')) {
      if (typeof body.bucketId !== 'string' || !body.bucketId) {
        return res.status(400).json({
          message: 'bucketId must be a non-empty string.',
        });
      }
    }

    if (
      Object.keys(body).some(
        key => !['name', 'targetAmount', 'targetDate', 'bucketId'].includes(key),
      )
    ) {
      return res.status(400).json({
        message: 'Unsupported goal configuration field.',
      });
    }

    if (Object.keys(data).length === 0 && !Object.hasOwn(body, 'bucketId')) {
      return res.status(400).json({
        message: 'Provide at least one field to update.',
      });
    }

    const goal = await prisma.$transaction(
      async tx => {
        const existing = await tx.goal.findFirst({
          where: { id: goalId, userId: user.id },
        });

        if (!existing) {
          throw new Error('GOAL_NOT_FOUND');
        }

        if (Object.hasOwn(body, 'bucketId')) {
          const nextBucketId = body.bucketId as string;

          if (existing.isActive) {
            await assertEligibleBucket(
              tx,
              user.id,
              nextBucketId,
              existing.id,
            );
          } else {
            const bucket = await tx.bucket.findFirst({
              where: {
                id: nextBucketId,
                userId: user.id,
              },
            });

            if (!bucket) throw new Error('BUCKET_NOT_FOUND');
            if (!bucket.isActive) throw new Error('BUCKET_INACTIVE');
            if (bucket.type === BucketType.UNALLOCATED) {
              throw new Error('UNALLOCATED_BUCKET');
            }
          }

          data.bucket = { connect: { id: nextBucketId } };
        }

        return tx.goal.update({
          where: { id: existing.id },
          data,
          include: {
            bucket: {
              select: {
                id: true,
                name: true,
                type: true,
                isActive: true,
              },
            },
          },
        });
      },
      { isolationLevel: 'Serializable' },
    );

    const response = await prisma.$transaction(tx =>
      serializeGoal(tx, user.id, goal),
    );

    return res.json(response);
  } catch (error) {
    const message = getErrorMessage(error);

    if (message === 'GOAL_NOT_FOUND') {
      return res.status(404).json({ message: 'Goal not found.' });
    }

    if (message === 'BUCKET_NOT_FOUND') {
      return res.status(404).json({
        message: 'Bucket not found for this user.',
      });
    }

    if (message === 'BUCKET_INACTIVE') {
      return res.status(400).json({
        message: 'Goals can only be assigned to active buckets.',
      });
    }

    if (message === 'UNALLOCATED_BUCKET') {
      return res.status(400).json({
        message: 'The Unallocated bucket cannot be assigned to a goal.',
      });
    }

    if (message === 'BUCKET_ALREADY_ASSIGNED') {
      return res.status(409).json({
        code: 'BUCKET_ALREADY_ASSIGNED',
        message: 'This bucket is already assigned to an active goal.',
      });
    }

    if (isTransactionConflict(error)) {
      return res.status(409).json({
        message: 'A concurrent change occurred. Please try again.',
      });
    }

    console.error('Failed to update goal:', error);

    return res.status(500).json({
      message: 'Failed to update goal.',
    });
  }
});

/**
 * Activate or deactivate a goal.
 * Body: { isActive: boolean }
 */
router.patch('/:goalId/status', requireAuth, async (req, res) => {
  try {
    const user = await findLocalUser(req.firebaseUser!.uid);

    if (!user) {
      return res.status(404).json({
        message: 'User profile not found. Fetch /users/me first.',
      });
    }

    const { goalId } = req.params;
    const { isActive } = req.body ?? {};

    if (typeof goalId !== 'string' || !goalId) {
      return res.status(400).json({ message: 'A valid goalId is required.' });
    }

    if (typeof isActive !== 'boolean') {
      return res.status(400).json({
        message: 'isActive must be true or false.',
      });
    }

    const goal = await prisma.$transaction(
      async tx => {
        const existing = await tx.goal.findFirst({
          where: { id: goalId, userId: user.id },
        });

        if (!existing) throw new Error('GOAL_NOT_FOUND');

        if (isActive && !existing.isActive) {
          await assertEligibleBucket(
            tx,
            user.id,
            existing.bucketId,
            existing.id,
          );
        }

        return tx.goal.update({
          where: { id: existing.id },
          data: { isActive },
          include: {
            bucket: {
              select: {
                id: true,
                name: true,
                type: true,
                isActive: true,
              },
            },
          },
        });
      },
      { isolationLevel: 'Serializable' },
    );

    const response = await prisma.$transaction(tx =>
      serializeGoal(tx, user.id, goal),
    );

    return res.json(response);
  } catch (error) {
    const message = getErrorMessage(error);

    if (message === 'GOAL_NOT_FOUND') {
      return res.status(404).json({ message: 'Goal not found.' });
    }

    if (message === 'BUCKET_NOT_FOUND') {
      return res.status(404).json({
        message: "The goal's bucket was not found for this user.",
      });
    }

    if (message === 'BUCKET_INACTIVE') {
      return res.status(400).json({
        message: 'Goals can only be assigned to active buckets.',
      });
    }

    if (message === 'UNALLOCATED_BUCKET') {
      return res.status(400).json({
        message: 'The Unallocated bucket cannot be assigned to a goal.',
      });
    }

    if (message === 'BUCKET_ALREADY_ASSIGNED') {
      return res.status(409).json({
        code: 'BUCKET_ALREADY_ASSIGNED',
        message: 'This bucket is already assigned to an active goal.',
      });
    }

    if (isTransactionConflict(error)) {
      return res.status(409).json({
        message: 'A concurrent change occurred. Please try again.',
      });
    }

    console.error('Failed to update goal status:', error);

    return res.status(500).json({
      message: 'Failed to update goal status.',
    });
  }
});

/**
 * Delete an inactive goal.
 * Active goals must be deactivated before they can be deleted.
 */
router.delete('/:goalId', requireAuth, async (req, res) => {
  try {
    const user = await findLocalUser(req.firebaseUser!.uid);

    if (!user) {
      return res.status(404).json({
        message: 'User profile not found. Fetch /users/me first.',
      });
    }

    const { goalId } = req.params;

    if (typeof goalId !== 'string' || !goalId) {
      return res.status(400).json({
        message: 'A valid goalId is required.',
      });
    }

    const goal = await prisma.goal.findFirst({
      where: {
        id: goalId,
        userId: user.id,
      },
      select: {
        id: true,
        isActive: true,
      },
    });

    if (!goal) {
      return res.status(404).json({
        message: 'Goal not found.',
      });
    }

    if (goal.isActive) {
      return res.status(400).json({
        message: 'Deactivate the goal before deleting it.',
      });
    }

    await prisma.goal.delete({
      where: { id: goal.id },
    });

    return res.status(200).json({
      message: 'Goal deleted successfully.',
    });
  } catch (error) {
    console.error('Failed to delete goal:', error);

    return res.status(500).json({
      message: 'Failed to delete goal.',
    });
  }
});

export default router;