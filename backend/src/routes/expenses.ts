
import { Router } from 'express';
import { ExpenseType, Prisma } from '../generated/prisma/client.js';
import prisma from '../lib/prisma.js';
import { requireAuth } from '../middleware/require-auth.js';

const router = Router();

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

async function findLocalUser(firebaseUid: string) {
  return prisma.user.findUnique({
    where: { firebaseUid },
    select: { id: true },
  });
}

function dateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

router.post('/', requireAuth, async (req, res) => {
  try {
    const {
      bucketId,
      categoryId,
      periodId,
      amount,
      type,
      spentAt,
      note,
    } = req.body;

    if (
      typeof bucketId !== 'string' ||
      !bucketId ||
      typeof categoryId !== 'string' ||
      !categoryId ||
      (typeof amount !== 'string' && typeof amount !== 'number') ||
      (typeof amount === 'string' && !amount.trim()) ||
      !Number.isFinite(Number(amount)) ||
      Number(amount) <= 0 ||
      typeof type !== 'string' ||
      !Object.values(ExpenseType).includes(type as ExpenseType) ||
      typeof spentAt !== 'string'
    ) {
      return res.status(400).json({
        message:
          'A valid bucketId, categoryId, positive amount, expense type, and spentAt date are required.',
      });
    }

    if (
      periodId !== undefined &&
      periodId !== null &&
      (typeof periodId !== 'string' || !periodId)
    ) {
      return res.status(400).json({
        message: 'periodId must be a valid string or null.',
      });
    }

    if (note !== undefined && note !== null && typeof note !== 'string') {
      return res.status(400).json({
        message: 'note must be a string or null.',
      });
    }

    const spentDate = normalizeDate(spentAt);

    if (Number.isNaN(spentDate.getTime())) {
      return res.status(400).json({
        message: 'spentAt must be a valid YYYY-MM-DD date.',
      });
    }

    const requestedAmount = new Prisma.Decimal(String(amount));

    const user = await findLocalUser(req.firebaseUser!.uid);

    if (!user) {
      return res.status(404).json({
        message: 'User profile not found. Fetch /users/me first.',
      });
    }

    const expense = await prisma.$transaction(async tx => {
      const bucket = await tx.bucket.findFirst({
        where: {
          id: bucketId,
          userId: user.id,
        },
      });

      if (!bucket) {
        throw new Error('BUCKET_NOT_FOUND');
      }

      const category = await tx.category.findFirst({
        where: {
          id: categoryId,
          userId: user.id,
        },
      });

      if (!category) {
        throw new Error('CATEGORY_NOT_FOUND');
      }

      let resolvedPeriodId: string | null = null;

      if (periodId) {
        const period = await tx.financialPeriod.findFirst({
          where: {
            id: periodId,
            userId: user.id,
          },
        });

        if (!period) {
          throw new Error('PERIOD_NOT_FOUND');
        }

        const expenseDate = dateOnly(spentDate);

        if (
          expenseDate < dateOnly(period.startDate) ||
          expenseDate > dateOnly(period.endDate)
        ) {
          throw new Error('EXPENSE_DATE_OUTSIDE_PERIOD');
        }

        resolvedPeriodId = period.id;
      } else {
        const expenseDate = dateOnly(spentDate);

        const matchingPeriods = await tx.financialPeriod.findMany({
          where: {
            userId: user.id,
            status: 'ACTIVE',
            startDate: { lte: spentDate },
            endDate: { gte: spentDate },
            incomeTransactions: {
              some: {
                allocations: {
                  some: {
                    bucketId: bucket.id,
                  },
                },
              },
            },
          },
          select: {
            id: true,
          },
        });

        if (matchingPeriods.length > 1) {
          throw new Error('MULTIPLE_MATCHING_PERIODS');
        }

        if (matchingPeriods.length === 1) {
          resolvedPeriodId = matchingPeriods[0]!.id;
        } else {
          // No period can be inferred safely for this bucket and date.
          resolvedPeriodId = null;
        }
      }

      const allocations = await tx.allocation.aggregate({
        where: {
          bucketId: bucket.id,
          incomeTransaction: {
            userId: user.id,
          },
        },
        _sum: {
          amount: true,
        },
      });

      const expenses = await tx.expense.aggregate({
        where: {
          bucketId: bucket.id,
          userId: user.id,
        },
        _sum: {
          amount: true,
        },
      });

      const transfersIn = await tx.transfer.aggregate({
        where: {
          toBucketId: bucket.id,
          userId: user.id,
        },
        _sum: {
          amount: true,
        },
      });

      const transfersOut = await tx.transfer.aggregate({
        where: {
          fromBucketId: bucket.id,
          userId: user.id,
        },
        _sum: {
          amount: true,
        },
      });

      const totalAllocated =
        allocations._sum.amount ?? new Prisma.Decimal(0);
      const totalSpent = expenses._sum.amount ?? new Prisma.Decimal(0);
      const totalTransferredIn =
        transfersIn._sum.amount ?? new Prisma.Decimal(0);
      const totalTransferredOut =
        transfersOut._sum.amount ?? new Prisma.Decimal(0);

      const availableBalance = totalAllocated
        .minus(totalSpent)
        .plus(totalTransferredIn)
        .minus(totalTransferredOut);

      if (requestedAmount.greaterThan(availableBalance)) {
        throw new Error(
          `INSUFFICIENT_BALANCE:${availableBalance.toString()}`,
        );
      }

      return tx.expense.create({
        data: {
          userId: user.id,
          bucketId: bucket.id,
          categoryId: category.id,
          periodId: resolvedPeriodId,
          amount: requestedAmount,
          type: type as ExpenseType,
          spentAt: spentDate,
          note: note ?? null,
        },
        include: {
          bucket: true,
          category: true,
        },
      });
    });

    return res.status(201).json(expense);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'BUCKET_NOT_FOUND') {
        return res.status(404).json({
          message: 'Bucket not found for this user.',
        });
      }

      if (error.message === 'CATEGORY_NOT_FOUND') {
        return res.status(404).json({
          message: 'Category not found for this user.',
        });
      }

      if (error.message === 'PERIOD_NOT_FOUND') {
        return res.status(404).json({
          message: 'Financial period not found for this user.',
        });
      }

      if (error.message === 'EXPENSE_DATE_OUTSIDE_PERIOD') {
        return res.status(400).json({
          message:
            'The expense date must fall within the selected financial period.',
        });
      }

      if (error.message === 'MULTIPLE_MATCHING_PERIODS') {
        return res.status(400).json({
          message:
            'More than one active period matches this bucket and date. Please select the financial period explicitly.',
        });
      }

      if (error.message.startsWith('INSUFFICIENT_BALANCE:')) {
        const availableBalance = error.message.split(':')[1];

        return res.status(400).json({
          message: 'Insufficient balance.',
          availableBalance,
          requestedAmount: req.body.amount,
        });
      }
    }

    console.error('Failed to create expense:', error);

    return res.status(500).json({
      message: 'Failed to create expense.',
    });
  }
});

router.get('/', requireAuth, async (req, res) => {
  try {
    const user = await findLocalUser(req.firebaseUser!.uid);

    if (!user) {
      return res.status(404).json({
        message: 'User profile not found. Fetch /users/me first.',
      });
    }

    const expenses = await prisma.expense.findMany({
      where: {
        userId: user.id,
      },
      include: {
        bucket: true,
        category: true,
      },
      orderBy: {
        spentAt: 'desc',
      },
    });

    return res.json(expenses);
  } catch (error) {
    console.error('Failed to get expenses:', error);

    return res.status(500).json({
      message: 'Failed to get expenses.',
    });
  }
});

export default router;
