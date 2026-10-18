
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

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day)
  ) {
    return new Date(Number.NaN);
  }

  const date = new Date(Date.UTC(year, month - 1, day));

  // Reject impossible dates such as 2026-02-30.
  if (
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
    where: {
      firebaseUid,
    },
    select: {
      id: true,
    },
  });
}

router.post('/', requireAuth, async (req, res) => {
  try {
    const { moneySourceId, startDate, endDate, status } = req.body;

    if (
      typeof moneySourceId !== 'string' ||
      !moneySourceId.trim() ||
      typeof startDate !== 'string' ||
      typeof endDate !== 'string'
    ) {
      return res.status(400).json({
        message: 'moneySourceId, startDate, and endDate are required',
      });
    }

    const start = normalizeDate(startDate);
    const end = normalizeDate(endDate);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return res.status(400).json({
        message: 'startDate and endDate must be valid YYYY-MM-DD dates',
      });
    }

    if (start >= end) {
      return res.status(400).json({
        message: 'endDate must be after startDate',
      });
    }

    if (
      status !== undefined &&
      !['UPCOMING', 'ACTIVE', 'COMPLETED'].includes(status)
    ) {
      return res.status(400).json({
        message: 'Invalid financial period status',
      });
    }

    const firebaseUid = req.firebaseUser!.uid;
    const user = await findLocalUser(firebaseUid);

    if (!user) {
      return res.status(404).json({
        message: 'User profile not found. Fetch /users/me first.',
      });
    }

    const moneySource = await prisma.moneySource.findFirst({
      where: {
        id: moneySourceId,
        userId: user.id,
      },
      select: {
        id: true,
      },
    });

    if (!moneySource) {
      return res.status(404).json({
        message: 'Money source not found for this user',
      });
    }

    const period = await prisma.financialPeriod.create({
      data: {
        userId: user.id,
        moneySourceId,
        startDate: start,
        endDate: end,
        status: status ?? 'UPCOMING',
      },
      include: {
        moneySource: true,
      },
    });

    return res.status(201).json(period);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      return res.status(400).json({
        message: 'Financial period already exists',
      });
    }

    console.error(error);

    return res.status(500).json({
      message: 'Failed to create financial period',
    });
  }
});

router.get('/', requireAuth, async (req, res) => {
  try {
    const firebaseUid = req.firebaseUser!.uid;
    const user = await findLocalUser(firebaseUid);

    if (!user) {
      return res.status(404).json({
        message: 'User profile not found. Fetch /users/me first.',
      });
    }

    const periods = await prisma.financialPeriod.findMany({
      where: {
        userId: user.id,
      },
      include: {
        moneySource: true,
      },
      orderBy: {
        startDate: 'desc',
      },
    });

    return res.json(periods);
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: 'Failed to get financial periods',
    });
  }
});

export default router;
