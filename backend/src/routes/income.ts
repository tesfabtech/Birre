
import { Router } from 'express';
import { IncomeType } from '../generated/prisma/client.js';
import { requireAuth } from '../middleware/require-auth.js';
import {
  createIncome,
  deleteIncome,
  editIncome,
  findLocalUser,
  listIncome,
  normalizeDate,
} from '../services/income-service.js';
import {
  IncomeServiceError,
  manuallyAllocateIncome,
} from '../services/income-allocation-service.js';

const router = Router();

function sendServiceError(res: any, error: unknown) {
  if (!(error instanceof IncomeServiceError)) {
    console.error('Income request failed:', error);
    return res.status(500).json({ message: 'Income request failed.' });
  }

  const errors: Record<string, { status: number; message: string }> = {
    MONEY_SOURCE_NOT_FOUND: {
      status: 404,
      message: 'Money source not found for this user.',
    },
    PERIOD_MONEY_SOURCE_MISMATCH: {
      status: 409,
      message:
        'A financial period already exists for these dates and is linked to another money source.',
    },
    INCOME_DATE_IN_FUTURE: {
      status: 400,
      message: 'Income received date cannot be in the future.',
    },
    INCOME_DATE_OUTSIDE_ALLOWED_PERIOD: {
      status: 400,
      message:
        'Income date must be after the end of the previous financial period.',
    },
    DEFAULT_ALLOCATION_PLAN_MISSING: {
      status: 400,
      message:
        'Your default allocation plan is missing or has no rules. Set up your allocation rules before recording regular income.',
    },
    ALLOCATION_PLAN_NOT_FOUND: {
      status: 404,
      message: 'Allocation plan not found for this user.',
    },
    ALLOCATION_PLAN_MUST_TOTAL_100: {
      status: 400,
      message: 'Your allocation plan must total exactly 100%.',
    },
    ALLOCATION_PLAN_HAS_INVALID_BUCKET: {
  status: 400,
  message:
    'Your allocation plan contains an inactive bucket or a bucket that is not supported for regular income allocation. Update your allocation rules and try again.',
},
    UNALLOCATED_BUCKET_MISSING: {
      status: 400,
      message:
        'Your Unallocated bucket is missing or inactive. Restore it before recording occasional income.',
    },
    INCOME_NOT_FOUND: {
      status: 404,
      message: 'Income not found for this user.',
    },
    INCOME_ALREADY_ALLOCATED: {
      status: 400,
      message: 'This income has already been allocated.',
    },
    OCCASIONAL_INCOME_CANNOT_USE_PLAN: {
      status: 400,
      message:
        'Occasional income belongs in Unallocated and cannot use a regular allocation plan.',
    },
    INVALID_INCOME_AMOUNT: {
      status: 400,
      message: 'Income amount must be a valid number greater than zero.',
    },
    INVALID_INCOME_DATE: {
      status: 400,
      message: 'receivedAt must be a valid YYYY-MM-DD date.',
    },
    INCOME_PERIOD_DATE_CHANGE_NOT_SUPPORTED: {
      status: 400,
      message:
        'This income date cannot be changed because its financial period cannot be recalculated.',
    },
    INCOME_DATE_CONFLICTS_WITH_ANOTHER_PERIOD: {
      status: 409,
      message:
        'The new received date overlaps another financial period for this money source.',
    },
    INCOME_DATE_CONFLICTS_WITH_ANOTHER_INCOME: {
      status: 409,
      message:
        'Another income from this money source already has that received date.',
    },
    INCOME_CHANGE_WOULD_OVERDRAW_BUCKET: {
      status: 409,
      message:
        'This change would make a bucket balance negative because some allocated money has already been spent or transferred. Adjust the related transactions first.',
    },
    INCOME_WITHOUT_ALLOCATIONS_CANNOT_BE_EDITED: {
      status: 409,
      message:
        'This income has no allocations to update. It cannot be edited safely.',
    },
  };

  const knownError = errors[error.code];

  if (knownError) {
    return res.status(knownError.status).json({
      message: knownError.message,
    });
  }

  console.error('Unhandled income service error:', error);
  return res.status(500).json({ message: 'Income request failed.' });
}

// Create income and automatically allocate it.
router.post('/', requireAuth, async (req, res) => {
  try {
    const { moneySourceId, amount, type, receivedAt, note } = req.body;

    if (
      typeof moneySourceId !== 'string' ||
      !moneySourceId.trim() ||
      (typeof amount !== 'string' && typeof amount !== 'number') ||
      (typeof amount === 'string' && !amount.trim()) ||
      !Number.isFinite(Number(amount)) ||
      Number(amount) <= 0 ||
      typeof type !== 'string' ||
      !Object.values(IncomeType).includes(type as IncomeType) ||
      typeof receivedAt !== 'string'
    ) {
      return res.status(400).json({
        message:
          'A valid moneySourceId, positive amount, income type, and receivedAt date are required.',
      });
    }

    if (note !== undefined && note !== null && typeof note !== 'string') {
      return res.status(400).json({
        message: 'note must be a string or null.',
      });
    }

    const receivedDate = normalizeDate(receivedAt);

    if (Number.isNaN(receivedDate.getTime())) {
      return res.status(400).json({
        message: 'receivedAt must be a valid YYYY-MM-DD date.',
      });
    }

    const user = await findLocalUser(req.firebaseUser!.uid);

    if (!user) {
      return res.status(404).json({
        message: 'User profile not found. Fetch /users/me first.',
      });
    }

    const result = await createIncome({
      userId: user.id,
      moneySourceId: moneySourceId.trim(),
      amount,
      type: type as IncomeType,
      receivedDate,
      note: note ?? null,
    });

    return res.status(201).json(result);
  } catch (error) {
    return sendServiceError(res, error);
  }
});

// List the authenticated user's income.
router.get('/', requireAuth, async (req, res) => {
  try {
    const user = await findLocalUser(req.firebaseUser!.uid);

    if (!user) {
      return res.status(404).json({
        message: 'User profile not found. Fetch /users/me first.',
      });
    }

    return res.json(await listIncome(user.id));
  } catch (error) {
    console.error('Failed to get income:', error);
    return res.status(500).json({
      message: 'Failed to get income.',
    });
  }
});

// Edit an income's amount, received date, or both.
router.patch('/:incomeId', requireAuth, async (req, res) => {
  try {
    const { incomeId } = req.params;
    const { amount, receivedAt } = req.body ?? {};

    if (typeof incomeId !== 'string' || !incomeId.trim()) {
      return res.status(400).json({
        message: 'A valid incomeId is required.',
      });
    }

    if (amount === undefined && receivedAt === undefined) {
      return res.status(400).json({
        message: 'Provide an amount, receivedAt date, or both to update.',
      });
    }

    if (
      amount !== undefined &&
      (
        (typeof amount !== 'string' && typeof amount !== 'number') ||
        (typeof amount === 'string' && !amount.trim()) ||
        !Number.isFinite(Number(amount)) ||
        Number(amount) <= 0
      )
    ) {
      return res.status(400).json({
        message: 'amount must be a valid number greater than zero.',
      });
    }

    let receivedDate: Date | undefined;

    if (receivedAt !== undefined) {
      if (typeof receivedAt !== 'string') {
        return res.status(400).json({
          message: 'receivedAt must be a YYYY-MM-DD date string.',
        });
      }

      receivedDate = normalizeDate(receivedAt);

      if (Number.isNaN(receivedDate.getTime())) {
        return res.status(400).json({
          message: 'receivedAt must be a valid YYYY-MM-DD date.',
        });
      }
    }

    const user = await findLocalUser(req.firebaseUser!.uid);

    if (!user) {
      return res.status(404).json({
        message: 'User profile not found. Fetch /users/me first.',
      });
    }

    const result = await editIncome({
      userId: user.id,
      incomeId: incomeId.trim(),
      ...(amount !== undefined ? { amount } : {}),
      ...(receivedDate !== undefined ? { receivedDate } : {}),
    });

    return res.json(result);
  } catch (error) {
    return sendServiceError(res, error);
  }
});

// Delete an income after the client has obtained user confirmation.
router.delete('/:incomeId', requireAuth, async (req, res) => {
  try {
    const { incomeId } = req.params;

    if (typeof incomeId !== 'string' || !incomeId.trim()) {
      return res.status(400).json({
        message: 'A valid incomeId is required.',
      });
    }

    const user = await findLocalUser(req.firebaseUser!.uid);

    if (!user) {
      return res.status(404).json({
        message: 'User profile not found. Fetch /users/me first.',
      });
    }

    const result = await deleteIncome(user.id, incomeId.trim());

    return res.json({
      message: 'Income deleted successfully.',
      ...result,
    });
  } catch (error) {
    return sendServiceError(res, error);
  }
});

// Manually allocate income that has not already been allocated.
router.post('/:incomeId/allocate', requireAuth, async (req, res) => {
  try {
    const { incomeId } = req.params;
    const { allocationPlanId } = req.body;

    if (
      typeof incomeId !== 'string' ||
      !incomeId ||
      typeof allocationPlanId !== 'string' ||
      !allocationPlanId
    ) {
      return res.status(400).json({
        message: 'A valid incomeId and allocationPlanId are required.',
      });
    }

    const user = await findLocalUser(req.firebaseUser!.uid);

    if (!user) {
      return res.status(404).json({
        message: 'User profile not found. Fetch /users/me first.',
      });
    }

    const result = await manuallyAllocateIncome(
      user.id,
      incomeId,
      allocationPlanId,
    );

    return res.status(201).json({
      message: 'Income allocated successfully.',
      ...result,
    });
  } catch (error) {
    return sendServiceError(res, error);
  }
});

export default router;
