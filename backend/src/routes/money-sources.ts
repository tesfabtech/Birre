
import { Router } from 'express';
import { MoneySourceType } from '../generated/prisma/client.js';
import prisma from '../lib/prisma.js';
import { requireAuth } from '../middleware/require-auth.js';

const router = Router();

function getMoneySourceId(
  id: string | string[] | undefined,
): string | null {
  return typeof id === 'string' && id.trim().length > 0
    ? id
    : null;
}

async function getUserId(firebaseUid: string): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { firebaseUid },
    select: { id: true },
  });

  return user?.id ?? null;
}

// Create a money source.
router.post('/', requireAuth, async (req, res) => {
  try {
    const { name, type, defaultAmount, frequency, nextExpectedDate } =
      req.body;

    if (
      typeof name !== 'string' ||
      !name.trim() ||
      !Object.values(MoneySourceType).includes(type)
    ) {
      return res.status(400).json({
        message: 'A valid name and money source type are required.',
      });
    }

    const userId = await getUserId(req.firebaseUser!.uid);

    if (!userId) {
      return res.status(404).json({
        message: 'User profile not found. Fetch /users/me first.',
      });
    }

    let parsedDate: Date | null = null;

    if (nextExpectedDate) {
      parsedDate = new Date(nextExpectedDate);

      if (Number.isNaN(parsedDate.getTime())) {
        return res.status(400).json({
          message: 'Invalid next expected date.',
        });
      }
    }

    const moneySource = await prisma.moneySource.create({
      data: {
        userId,
        name: name.trim(),
        type,
        defaultAmount: defaultAmount ?? null,
        frequency: type === 'REGULAR' ? frequency ?? null : null,
        nextExpectedDate: parsedDate,
      },
    });

    return res.status(201).json(moneySource);
  } catch (error) {
    console.error('Failed to create money source:', error);

    return res.status(500).json({
      message: 'Failed to create money source.',
    });
  }
});

// List the authenticated user's money sources.
router.get('/', requireAuth, async (req, res) => {
  try {
    const userId = await getUserId(req.firebaseUser!.uid);

    if (!userId) {
      return res.status(404).json({
        message: 'User profile not found. Fetch /users/me first.',
      });
    }

    const moneySources = await prisma.moneySource.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return res.json(moneySources);
  } catch (error) {
    console.error('Failed to get money sources:', error);

    return res.status(500).json({
      message: 'Failed to get money sources.',
    });
  }
});

// Get a single money source by ID.
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const sourceId = getMoneySourceId(req.params.id);

    if (!sourceId) {
      return res.status(400).json({
        message: 'A valid money source ID is required.',
      });
    }

    const userId = await getUserId(req.firebaseUser!.uid);

    if (!userId) {
      return res.status(404).json({
        message: 'User profile not found.',
      });
    }

    const moneySource = await prisma.moneySource.findFirst({
      where: {
        id: sourceId,
        userId,
      },
    });

    if (!moneySource) {
      return res.status(404).json({
        message: 'Money source not found.',
      });
    }

    return res.json(moneySource);
  } catch (error) {
    console.error('Failed to get money source:', error);

    return res.status(500).json({
      message: 'Failed to get money source.',
    });
  }
});

// Update a money source.
router.patch('/:id', requireAuth, async (req, res) => {
  try {
    const sourceId = getMoneySourceId(req.params.id);

    if (!sourceId) {
      return res.status(400).json({
        message: 'A valid money source ID is required.',
      });
    }

    const userId = await getUserId(req.firebaseUser!.uid);

    if (!userId) {
      return res.status(404).json({
        message: 'User profile not found.',
      });
    }

    const existing = await prisma.moneySource.findFirst({
      where: {
        id: sourceId,
        userId,
      },
    });

    if (!existing) {
      return res.status(404).json({
        message: 'Money source not found.',
      });
    }

    const {
      name,
      type,
      defaultAmount,
      frequency,
      nextExpectedDate,
      isActive,
    } = req.body;

    if (
      name !== undefined &&
      (typeof name !== 'string' || !name.trim())
    ) {
      return res.status(400).json({
        message: 'Name must be a non-empty string.',
      });
    }

    if (
      type !== undefined &&
      !Object.values(MoneySourceType).includes(type)
    ) {
      return res.status(400).json({
        message: 'Invalid money source type.',
      });
    }

    if (
      isActive !== undefined &&
      typeof isActive !== 'boolean'
    ) {
      return res.status(400).json({
        message: 'isActive must be a boolean.',
      });
    }

    if (
      defaultAmount !== undefined &&
      defaultAmount !== null &&
      (!Number.isFinite(Number(defaultAmount)) ||
        Number(defaultAmount) <= 0)
    ) {
      return res.status(400).json({
        message: 'Default amount must be a positive number or null.',
      });
    }

    let parsedDate: Date | null | undefined;

    if (nextExpectedDate !== undefined) {
      if (nextExpectedDate === null || nextExpectedDate === '') {
        parsedDate = null;
      } else {
        parsedDate = new Date(nextExpectedDate);

        if (Number.isNaN(parsedDate.getTime())) {
          return res.status(400).json({
            message: 'Invalid next expected date.',
          });
        }
      }
    }

    const updatedType = type ?? existing.type;

    const updated = await prisma.moneySource.update({
      where: { id: existing.id },
      data: {
        ...(name !== undefined ? { name: name.trim() } : {}),
        ...(type !== undefined ? { type } : {}),
        ...(defaultAmount !== undefined ? { defaultAmount } : {}),
        ...(frequency !== undefined || updatedType === 'OCCASIONAL'
          ? {
              frequency:
                updatedType === 'REGULAR' ? frequency ?? null : null,
            }
          : {}),
        ...(parsedDate !== undefined
          ? { nextExpectedDate: parsedDate }
          : {}),
        ...(isActive !== undefined ? { isActive } : {}),
      },
    });

    return res.json(updated);
  } catch (error) {
    console.error('Failed to update money source:', error);

    return res.status(500).json({
      message: 'Failed to update money source.',
    });
  }
});

// Delete a money source.
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const sourceId = getMoneySourceId(req.params.id);

    if (!sourceId) {
      return res.status(400).json({
        message: 'A valid money source ID is required.',
      });
    }

    const userId = await getUserId(req.firebaseUser!.uid);

    if (!userId) {
      return res.status(404).json({
        message: 'User profile not found.',
      });
    }

    const existing = await prisma.moneySource.findFirst({
      where: {
        id: sourceId,
        userId,
      },
    });

    if (!existing) {
      return res.status(404).json({
        message: 'Money source not found.',
      });
    }

    await prisma.moneySource.delete({
      where: { id: existing.id },
    });

    return res.json({
      message: 'Money source deleted successfully.',
      id: existing.id,
    });
  } catch (error) {
    console.error('Failed to delete money source:', error);

    return res.status(500).json({
      message: 'Failed to delete money source.',
    });
  }
});

export default router;
