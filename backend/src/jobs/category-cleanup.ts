
import cron from 'node-cron';
import prisma from '../lib/prisma.js';

const RETENTION_DAYS = 30;
const DAILY_SCHEDULE = '0 3 * * *';

let cleanupRunning = false;

export async function cleanupExpiredCategories(): Promise<void> {
  if (cleanupRunning) {
    console.log('[Category cleanup] Previous cleanup is still running; skipping.');
    return;
  }

  cleanupRunning = true;

  try {
    const cutoff = new Date(
      Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000,
    );

    // Only permanently delete non-default categories that:
    // 1. Have been soft-deleted.
    // 2. Have been in the trash for at least 30 days.
    // 3. Have no linked expenses.
    //
    // The expense relation filter protects historical records.
    const result = await prisma.category.deleteMany({
      where: {
        isActive: false,
        isDefault: false,
        deletedAt: {
          not: null,
          lte: cutoff,
        },
        expenses: {
          none: {},
        },
      },
    });

    console.log(
      `[Category cleanup] Removed ${result.count} expired category/categories.`,
    );

    // Report expired categories retained because they still have expenses.
    const retained = await prisma.category.count({
      where: {
        isActive: false,
        isDefault: false,
        deletedAt: {
          not: null,
          lte: cutoff,
        },
        expenses: {
          some: {},
        },
      },
    });

    if (retained > 0) {
      console.warn(
        `[Category cleanup] Retained ${retained} expired category/categories because they still have expenses.`,
      );
    }
  } catch (error) {
    console.error('[Category cleanup] Cleanup failed:', error);
  } finally {
    cleanupRunning = false;
  }
}

export function startCategoryCleanupJob(): void {
  if (!cron.validate(DAILY_SCHEDULE)) {
    throw new Error('Invalid category cleanup cron schedule.');
  }

  cron.schedule(
    DAILY_SCHEDULE,
    () => {
      void cleanupExpiredCategories();
    },
    {
      timezone: 'Africa/Addis_Ababa',
      name: 'birre-category-cleanup',
    },
  );

  console.log(
    '[Category cleanup] Scheduled daily at 03:00 Africa/Addis_Ababa time.',
  );

  // Also check expired categories on startup, rather than waiting for 03:00.
  void cleanupExpiredCategories();
}
