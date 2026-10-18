
import { Router } from 'express';
import { Prisma } from '../generated/prisma/client.js';
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

router.post('/', requireAuth, async (req, res) => {
  try {
    const {
      fromBucketId,
      toBucketId,
      amount,
      transferredAt,
      note,
    } = req.body;

    if (
      typeof fromBucketId !== 'string' ||
      !fromBucketId ||
      typeof toBucketId !== 'string' ||
      !toBucketId ||
      (typeof amount !== 'string' && typeof amount !== 'number') ||
      (typeof amount === 'string' && !amount.trim()) ||
      !Number.isFinite(Number(amount)) ||
      Number(amount) <= 0 ||
      typeof transferredAt !== 'string'
    ) {
      return res.status(400).json({
        message:
          'Valid fromBucketId, toBucketId, positive amount, and transferredAt are required.',
      });
    }

    if (fromBucketId === toBucketId) {
      return res.status(400).json({
        message: 'Source and destination buckets must be different.',
      });
    }

    if (
      note !== undefined &&
      note !== null &&
      typeof note !== 'string'
    ) {
      return res.status(400).json({
        message: 'note must be a string or null.',
      });
    }

    const transferredDate = normalizeDate(transferredAt);

    if (Number.isNaN(transferredDate.getTime())) {
      return res.status(400).json({
        message: 'transferredAt must be a valid YYYY-MM-DD date.',
      });
    }

    const requestedAmount = new Prisma.Decimal(String(amount));

    const user = await findLocalUser(req.firebaseUser!.uid);

    if (!user) {
      return res.status(404).json({
        message: 'User profile not found. Fetch /users/me first.',
      });
    }

    const transfer = await prisma.$transaction(async (tx) => {
      const fromBucket = await tx.bucket.findFirst({
        where: {
          id: fromBucketId,
          userId: user.id,
        },
      });

      if (!fromBucket) {
        throw new Error('FROM_BUCKET_NOT_FOUND');
      }

      const toBucket = await tx.bucket.findFirst({
        where: {
          id: toBucketId,
          userId: user.id,
        },
      });

      if (!toBucket) {
        throw new Error('TO_BUCKET_NOT_FOUND');
      }

      const allocations = await tx.allocation.aggregate({
        where: {
          bucketId: fromBucket.id,
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
          bucketId: fromBucket.id,
          userId: user.id,
        },
        _sum: {
          amount: true,
        },
      });

      const transfersIn = await tx.transfer.aggregate({
        where: {
          toBucketId: fromBucket.id,
          userId: user.id,
        },
        _sum: {
          amount: true,
        },
      });

      const transfersOut = await tx.transfer.aggregate({
        where: {
          fromBucketId: fromBucket.id,
          userId: user.id,
        },
        _sum: {
          amount: true,
        },
      });

      const totalAllocated =
        allocations._sum.amount ?? new Prisma.Decimal(0);

      const totalSpent =
        expenses._sum.amount ?? new Prisma.Decimal(0);

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

      return tx.transfer.create({
        data: {
          userId: user.id,
          fromBucketId: fromBucket.id,
          toBucketId: toBucket.id,
          amount: requestedAmount,
          transferredAt: transferredDate,
          note: note ?? null,
        },
        include: {
          fromBucket: true,
          toBucket: true,
        },
      });
    });

    return res.status(201).json(transfer);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'FROM_BUCKET_NOT_FOUND') {
        return res.status(404).json({
          message: 'Source bucket not found for this user.',
        });
      }

      if (error.message === 'TO_BUCKET_NOT_FOUND') {
        return res.status(404).json({
          message: 'Destination bucket not found for this user.',
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

    console.error('Failed to create transfer:', error);

    return res.status(500).json({
      message: 'Failed to create transfer.',
    });
  }
});


router.get('/balances', requireAuth, async (req, res) => {
  try {
    const user = await findLocalUser(req.firebaseUser!.uid);

    if (!user) {
      return res.status(404).json({
        message: 'User profile not found. Fetch /users/me first.',
      });
    }

    const buckets = await prisma.bucket.findMany({
      where: {
        userId: user.id,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    const balances = await Promise.all(
      buckets.map(async (bucket) => {
        const [allocations, expenses, transfersIn, transfersOut] =
          await Promise.all([
            prisma.allocation.aggregate({
              where: {
                bucketId: bucket.id,
                incomeTransaction: {
                  userId: user.id,
                },
              },
              _sum: {
                amount: true,
              },
            }),

            prisma.expense.aggregate({
              where: {
                bucketId: bucket.id,
                userId: user.id,
              },
              _sum: {
                amount: true,
              },
            }),

            prisma.transfer.aggregate({
              where: {
                toBucketId: bucket.id,
                userId: user.id,
              },
              _sum: {
                amount: true,
              },
            }),

            prisma.transfer.aggregate({
              where: {
                fromBucketId: bucket.id,
                userId: user.id,
              },
              _sum: {
                amount: true,
              },
            }),
          ]);

        const totalAllocated =
          allocations._sum.amount ?? new Prisma.Decimal(0);

        const totalSpent =
          expenses._sum.amount ?? new Prisma.Decimal(0);

        const totalTransferredIn =
          transfersIn._sum.amount ?? new Prisma.Decimal(0);

        const totalTransferredOut =
          transfersOut._sum.amount ?? new Prisma.Decimal(0);

        const balance = totalAllocated
          .minus(totalSpent)
          .plus(totalTransferredIn)
          .minus(totalTransferredOut);

        return {
          bucketId: bucket.id,
          bucketName: bucket.name,
          bucketType: bucket.type,
          isActive: bucket.isActive,
          balance: balance.toFixed(2),
        };
      }),
    );

    const totalBalance = balances.reduce(
      (total, bucket) => total.plus(bucket.balance),
      new Prisma.Decimal(0),
    );

    return res.json({
      totalBalance: totalBalance.toFixed(2),
      buckets: balances,
    });
  } catch (error) {
    console.error('Failed to calculate bucket balances:', error);

    return res.status(500).json({
      message: 'Failed to calculate bucket balances.',
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

    const transfers = await prisma.transfer.findMany({
      where: {
        userId: user.id,
      },
      include: {
        fromBucket: true,
        toBucket: true,
      },
      orderBy: {
        transferredAt: 'desc',
      },
    });

    return res.json(transfers);
  } catch (error) {
    console.error('Failed to get transfers:', error);

    return res.status(500).json({
      message: 'Failed to get transfers.',
    });
  }
});

export default router;
