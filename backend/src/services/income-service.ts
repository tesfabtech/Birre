
import { IncomeType, Prisma } from '../generated/prisma/client.js';
import prisma from '../lib/prisma.js';
import {
  createAutomaticAllocations,
  IncomeServiceError,
} from './income-allocation-service.js';

type TransactionClient = Prisma.TransactionClient;

type IncomeMutationInput = {
  userId: string;
  incomeId: string;
  amount?: string | number;
  receivedDate?: Date;
};

export async function findLocalUser(firebaseUid: string) {
  return prisma.user.findUnique({
    where: { firebaseUid },
    select: { id: true },
  });
}

export function normalizeDate(value: string): Date {
  const parts = value.split('-');
  const year = Number(parts[0]);
  const month = Number(parts[1]);
  const day = Number(parts[2]);

  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    parts.length !== 3 ||
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

function getTodayUtcDate(): Date {
  const now = new Date();

  return new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
    ),
  );
}

function toUtcDate(date: Date): Date {
  return new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
    ),
  );
}

function calculatePeriodEndDate(
  startDate: Date,
  frequency: string,
): Date | null {
  switch (frequency) {
    case 'WEEKLY':
      return new Date(
        Date.UTC(
          startDate.getUTCFullYear(),
          startDate.getUTCMonth(),
          startDate.getUTCDate() + 6,
        ),
      );

    case 'BIWEEKLY':
      return new Date(
        Date.UTC(
          startDate.getUTCFullYear(),
          startDate.getUTCMonth(),
          startDate.getUTCDate() + 13,
        ),
      );

    case 'TWICE_MONTHLY':
      return new Date(
        Date.UTC(
          startDate.getUTCFullYear(),
          startDate.getUTCMonth(),
          startDate.getUTCDate() + 14,
        ),
      );

    case 'MONTHLY': {
      const year = startDate.getUTCFullYear();
      const month = startDate.getUTCMonth();
      const day = startDate.getUTCDate();

      const nextMonthFirstDay = new Date(
        Date.UTC(year, month + 1, 1),
      );

      const nextYear = nextMonthFirstDay.getUTCFullYear();
      const nextMonth = nextMonthFirstDay.getUTCMonth();

      const lastDayOfNextMonth = new Date(
        Date.UTC(nextYear, nextMonth + 1, 0),
      ).getUTCDate();

      const nextPayDate = new Date(
        Date.UTC(
          nextYear,
          nextMonth,
          Math.min(day, lastDayOfNextMonth),
        ),
      );

      nextPayDate.setUTCDate(nextPayDate.getUTCDate() - 1);

      return nextPayDate;
    }

    case 'CUSTOM':
    default:
      return null;
  }
}

function decimalSum(
  value: Prisma.Decimal | null | undefined,
): Prisma.Decimal {
  return value ? new Prisma.Decimal(value) : new Prisma.Decimal(0);
}

/**
 * Calculates a bucket's current balance from its complete transaction history.
 * Balances are derived from allocations, expenses, and transfers.
 */
async function getBucketBalance(
  tx: TransactionClient,
  userId: string,
  bucketId: string,
): Promise<Prisma.Decimal> {
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
        where: { userId, bucketId },
        _sum: { amount: true },
      }),

      tx.transfer.aggregate({
        where: { userId, toBucketId: bucketId },
        _sum: { amount: true },
      }),

      tx.transfer.aggregate({
        where: { userId, fromBucketId: bucketId },
        _sum: { amount: true },
      }),
    ]);

  return decimalSum(allocations._sum.amount)
    .minus(decimalSum(expenses._sum.amount))
    .plus(decimalSum(transfersIn._sum.amount))
    .minus(decimalSum(transfersOut._sum.amount));
}

/**
 * Ensures a proposed allocation change cannot make any affected bucket
 * balance negative.
 */
async function validateAllocationChanges(
  tx: TransactionClient,
  userId: string,
  changes: Array<{
    bucketId: string;
    oldAmount: Prisma.Decimal;
    newAmount: Prisma.Decimal;
  }>,
) {
  const changesByBucket = new Map<
    string,
    { oldAmount: Prisma.Decimal; newAmount: Prisma.Decimal }
  >();

  for (const change of changes) {
    const existing = changesByBucket.get(change.bucketId);

    if (existing) {
      existing.oldAmount = existing.oldAmount.plus(change.oldAmount);
      existing.newAmount = existing.newAmount.plus(change.newAmount);
    } else {
      changesByBucket.set(change.bucketId, {
        oldAmount: change.oldAmount,
        newAmount: change.newAmount,
      });
    }
  }

  for (const [bucketId, change] of changesByBucket) {
    const currentBalance = await getBucketBalance(
      tx,
      userId,
      bucketId,
    );

    const resultingBalance = currentBalance
      .minus(change.oldAmount)
      .plus(change.newAmount);

    if (resultingBalance.lessThan(0)) {
      throw new IncomeServiceError(
        'INCOME_CHANGE_WOULD_OVERDRAW_BUCKET',
      );
    }
  }
}

export async function createIncome(input: {
  userId: string;
  moneySourceId: string;
  amount: string | number;
  type: IncomeType;
  receivedDate: Date;
  note: string | null;
}) {
  return prisma.$transaction(async tx => {
    const moneySource = await tx.moneySource.findFirst({
      where: {
        id: input.moneySourceId,
        userId: input.userId,
      },
    });

    if (!moneySource) {
      throw new IncomeServiceError('MONEY_SOURCE_NOT_FOUND');
    }

    const today = getTodayUtcDate();
    const receivedDate = toUtcDate(input.receivedDate);

    if (receivedDate > today) {
      throw new IncomeServiceError('INCOME_DATE_IN_FUTURE');
    }

    const latestPeriod = await tx.financialPeriod.findFirst({
      where: {
        userId: input.userId,
        moneySourceId: moneySource.id,
      },
      orderBy: [
        { endDate: 'desc' },
        { startDate: 'desc' },
      ],
    });

    if (latestPeriod && receivedDate <= latestPeriod.endDate) {
      throw new IncomeServiceError(
        'INCOME_DATE_OUTSIDE_ALLOWED_PERIOD',
      );
    }

    let periodId: string | null = null;

    if (moneySource.frequency) {
      const endDate = calculatePeriodEndDate(
        receivedDate,
        moneySource.frequency,
      );

      if (endDate) {
        const period = await tx.financialPeriod.create({
          data: {
            userId: input.userId,
            moneySourceId: moneySource.id,
            startDate: receivedDate,
            endDate,
            status: 'ACTIVE',
          },
        });

        periodId = period.id;
      }
    }

    const incomeAmount = new Prisma.Decimal(String(input.amount));

    const income = await tx.incomeTransaction.create({
      data: {
        userId: input.userId,
        moneySourceId: moneySource.id,
        periodId,
        allocationPlanId: null,
        amount: incomeAmount,
        type: input.type,
        receivedAt: receivedDate,
        note: input.note,
      },
    });

    const { allocationPlanId } = await createAutomaticAllocations(tx, {
      userId: input.userId,
      incomeId: income.id,
      amount: incomeAmount,
      type: input.type,
    });

    if (allocationPlanId) {
      await tx.incomeTransaction.update({
        where: { id: income.id },
        data: { allocationPlanId },
      });
    }

    return tx.incomeTransaction.findUniqueOrThrow({
      where: { id: income.id },
      include: {
        moneySource: true,
        period: true,
        allocations: {
          include: { bucket: true },
        },
      },
    });
  });
}

/**
 * Updates an income amount and/or received date.
 *
 * Existing allocations are adjusted proportionally. Any change that would
 * overdraw an affected bucket is rejected.
 */
export async function editIncome(input: IncomeMutationInput) {
  return prisma.$transaction(async tx => {
    const income = await tx.incomeTransaction.findFirst({
      where: {
        id: input.incomeId,
        userId: input.userId,
      },
      include: {
        moneySource: true,
        period: true,
        allocations: true,
      },
    });

    if (!income) {
      throw new IncomeServiceError('INCOME_NOT_FOUND');
    }

    const nextAmount =
      input.amount === undefined
        ? new Prisma.Decimal(income.amount)
        : new Prisma.Decimal(String(input.amount));

    if (!nextAmount.isFinite() || nextAmount.lessThanOrEqualTo(0)) {
      throw new IncomeServiceError('INVALID_INCOME_AMOUNT');
    }

    const nextReceivedDate =
      input.receivedDate === undefined
        ? toUtcDate(income.receivedAt)
        : toUtcDate(input.receivedDate);

    if (Number.isNaN(nextReceivedDate.getTime())) {
      throw new IncomeServiceError('INVALID_INCOME_DATE');
    }

    if (nextReceivedDate > getTodayUtcDate()) {
      throw new IncomeServiceError('INCOME_DATE_IN_FUTURE');
    }

    const dateChanged =
      nextReceivedDate.getTime() !==
      toUtcDate(income.receivedAt).getTime();

    let nextPeriodDates:
      | { startDate: Date; endDate: Date }
      | undefined;

    if (dateChanged && income.period) {
      const nextEndDate = calculatePeriodEndDate(
        nextReceivedDate,
        income.moneySource.frequency ?? 'CUSTOM',
      );

      if (!nextEndDate) {
        throw new IncomeServiceError(
          'INCOME_PERIOD_DATE_CHANGE_NOT_SUPPORTED',
        );
      }

      const overlappingPeriod = await tx.financialPeriod.findFirst({
        where: {
          userId: input.userId,
          moneySourceId: income.moneySourceId,
          id: { not: income.period.id },
          startDate: { lte: nextEndDate },
          endDate: { gte: nextReceivedDate },
        },
      });

      if (overlappingPeriod) {
        throw new IncomeServiceError(
          'INCOME_DATE_CONFLICTS_WITH_ANOTHER_PERIOD',
        );
      }

      nextPeriodDates = {
        startDate: nextReceivedDate,
        endDate: nextEndDate,
      };
    } else if (dateChanged) {
      const conflictingIncome = await tx.incomeTransaction.findFirst({
        where: {
          userId: input.userId,
          moneySourceId: income.moneySourceId,
          id: { not: income.id },
          receivedAt: nextReceivedDate,
        },
      });

      if (conflictingIncome) {
        throw new IncomeServiceError(
          'INCOME_DATE_CONFLICTS_WITH_ANOTHER_INCOME',
        );
      }
    }

    const oldAmount = new Prisma.Decimal(income.amount);
    const allocationChanges: Array<{
      allocationId: string;
      bucketId: string;
      oldAmount: Prisma.Decimal;
      newAmount: Prisma.Decimal;
    }> = [];

    let allocatedSoFar = new Prisma.Decimal(0);

    for (let i = 0; i < income.allocations.length; i++) {
      const allocation = income.allocations[i]!;

      let newAllocationAmount: Prisma.Decimal;

      if (i === income.allocations.length - 1) {
        newAllocationAmount = nextAmount
          .minus(allocatedSoFar)
          .toDecimalPlaces(2);
      } else if (allocation.percentage !== null) {
        newAllocationAmount = nextAmount
          .mul(allocation.percentage)
          .div(100)
          .toDecimalPlaces(2);
      } else if (oldAmount.greaterThan(0)) {
        newAllocationAmount = nextAmount
          .mul(allocation.amount)
          .div(oldAmount)
          .toDecimalPlaces(2);
      } else {
        newAllocationAmount = new Prisma.Decimal(0);
      }

      allocationChanges.push({
        allocationId: allocation.id,
        bucketId: allocation.bucketId,
        oldAmount: new Prisma.Decimal(allocation.amount),
        newAmount: newAllocationAmount,
      });

      allocatedSoFar = allocatedSoFar.plus(newAllocationAmount);
    }

    if (
      !nextAmount.equals(oldAmount) &&
      income.allocations.length === 0
    ) {
      throw new IncomeServiceError(
        'INCOME_WITHOUT_ALLOCATIONS_CANNOT_BE_EDITED',
      );
    }

    await validateAllocationChanges(
      tx,
      input.userId,
      allocationChanges.map(change => ({
        bucketId: change.bucketId,
        oldAmount: change.oldAmount,
        newAmount: change.newAmount,
      })),
    );

    for (const change of allocationChanges) {
      await tx.allocation.update({
        where: { id: change.allocationId },
        data: { amount: change.newAmount },
      });
    }

    if (nextPeriodDates && income.period) {
      await tx.financialPeriod.update({
        where: { id: income.period.id },
        data: nextPeriodDates,
      });
    }

    await tx.incomeTransaction.update({
      where: { id: income.id },
      data: {
        amount: nextAmount,
        receivedAt: nextReceivedDate,
      },
    });

    return tx.incomeTransaction.findUniqueOrThrow({
      where: { id: income.id },
      include: {
        moneySource: true,
        period: true,
        allocations: {
          include: { bucket: true },
        },
      },
    });
  });
}

/**
 * Deletes an income only when removing its allocations will not make
 * any affected bucket balance negative.
 *
 * A period is preserved when it still has expenses or other incomes.
 */
export async function deleteIncome(
  userId: string,
  incomeId: string,
) {
  return prisma.$transaction(async tx => {
    const income = await tx.incomeTransaction.findFirst({
      where: { id: incomeId, userId },
      include: {
        period: {
          include: {
            expenses: { select: { id: true } },
            incomeTransactions: { select: { id: true } },
          },
        },
        allocations: true,
      },
    });

    if (!income) {
      throw new IncomeServiceError('INCOME_NOT_FOUND');
    }

    await validateAllocationChanges(
      tx,
      userId,
      income.allocations.map(allocation => ({
        bucketId: allocation.bucketId,
        oldAmount: new Prisma.Decimal(allocation.amount),
        newAmount: new Prisma.Decimal(0),
      })),
    );

    const period = income.period;

    const canDeletePeriod =
      period !== null &&
      period.expenses.length === 0 &&
      period.incomeTransactions.every(
        transaction => transaction.id === income.id,
      );

    await tx.allocation.deleteMany({
      where: { incomeTransactionId: income.id },
    });

    // Disconnect the income first so deleting an otherwise-empty period
    // cannot leave a foreign-key reference behind.
    if (period) {
      await tx.incomeTransaction.update({
        where: { id: income.id },
        data: { periodId: null },
      });
    }

    await tx.incomeTransaction.delete({
      where: { id: income.id },
    });

    if (canDeletePeriod && period) {
      await tx.financialPeriod.delete({
        where: { id: period.id },
      });
    }

    return {
      id: income.id,
      deleted: true,
    };
  });
}

export async function listIncome(userId: string) {
  return prisma.incomeTransaction.findMany({
    where: { userId },
    orderBy: { receivedAt: 'desc' },
    include: {
      moneySource: true,
      period: true,
      allocations: {
        include: { bucket: true },
      },
    },
  });
}
